/**
 * Columnist's core, with no imports so the browser, the server and the templates all share it:
 * read a Prisma schema or a Postgres DDL dump into tables and columns, compare two versions, lay out the diagram,
 * and pack tables onto PDF pages.
 */

export type Ref = { table: string; column: string };
export type Column = {
  name: string;
  alias?: string; // the Prisma field name when @map renames it
  type: string;
  nullable: boolean;
  default?: string;
  pk: boolean;
  unique: boolean;
  ref?: Ref;
  note?: string;
};
export type Table = {
  name: string;
  alias?: string; // the Prisma model name when @@map renames it
  note?: string;
  columns: Column[];
  indexes: string[][];
  uniques: string[][];
  partitions?: string[];
};
export type Enum = { name: string; values: string[] };
export type Schema = { dialect: "prisma" | "postgres"; tables: Table[]; enums: Enum[] };

/* ---------------------------------------------------------------- Prisma */

const PRISMA_SCALARS = new Set(["String", "Int", "BigInt", "Float", "Decimal", "Boolean", "DateTime", "Json", "Bytes", "Unsupported"]);

/** Balanced-paren argument after `@name(` starting at `i` (the index of "("). */
function parens(s: string, i: number): [string, number] {
  let depth = 0;
  let quote = "";
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (quote) {
      if (c === "\\") j++;
      else if (c === quote) quote = "";
    } else if (c === '"' || c === "'") quote = c;
    else if (c === "(") depth++;
    else if (c === ")" && --depth === 0) return [s.slice(i + 1, j), j + 1];
  }
  return [s.slice(i + 1), s.length];
}

/** `@map("x")`-style attributes on one line: name → raw argument ("" when none). */
function attrs(s: string): Map<string, string> {
  const out = new Map<string, string>();
  const re = /@{1,2}([\w.]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    let arg = "";
    if (s[re.lastIndex] === "(") {
      const [a, end] = parens(s, re.lastIndex);
      arg = a.trim();
      re.lastIndex = end;
    }
    out.set(m[1], arg);
  }
  return out;
}

const unquote = (s: string) => s.trim().replace(/^"(.*)"$/, "$1");
/** `[a, b(sort: Desc)]` or `fields: [a, b]` → ["a", "b"]. */
const fieldList = (s: string) =>
  (s.match(/\[([^\]]*)\]/)?.[1] ?? "")
    .split(",")
    .map((x) => x.trim().replace(/\(.*$/, ""))
    .filter(Boolean);

export function parsePrisma(text: string): Schema {
  type Field = { name: string; type: string; optional: boolean; list: boolean; attrs: Map<string, string>; doc: string[] };
  type Block = { kind: "model" | "view" | "enum"; name: string; fields: Field[]; block: Map<string, string>[]; doc: string[]; values: string[] };
  const blocks: Block[] = [];
  let cur: Block | null = null;
  let doc: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("///")) {
      doc.push(line.slice(3).trim());
      continue;
    }
    const code = line.replace(/\s\/\/(?!\/).*$/, "").replace(/^\/\/.*$/, "").trim();
    if (!code) continue;
    const open = code.match(/^(model|view|enum|type|generator|datasource)\s+(\w+)\s*\{$/);
    if (open) {
      cur = open[1] === "model" || open[1] === "view" || open[1] === "enum" ? { kind: open[1] as Block["kind"], name: open[2], fields: [], block: [], doc, values: [] } : null;
      if (cur) blocks.push(cur);
      doc = [];
      continue;
    }
    if (code === "}") {
      cur = null;
      doc = [];
      continue;
    }
    if (!cur) continue;
    if (cur.kind === "enum") {
      const v = code.match(/^(\w+)/);
      if (v) cur.values.push(v[1]);
    } else if (code.startsWith("@@")) {
      cur.block.push(attrs(code));
    } else {
      const f = code.match(/^(\w+)\s+([\w.]+)(\[\])?(\?)?(?:\s+(.*))?$/);
      if (f) cur.fields.push({ name: f[1], type: f[2], list: !!f[3], optional: !!f[4], attrs: attrs(f[5] ?? ""), doc });
    }
    doc = [];
  }

  const enumNames = new Set(blocks.filter((b) => b.kind === "enum").map((b) => b.name));
  const models = blocks.filter((b) => b.kind !== "enum");
  const tableName = new Map(models.map((b) => [b.name, unquote(b.block.find((a) => a.has("map"))?.get("map") ?? b.name)]));
  const colName = (model: string, field: string) => {
    const f = models.find((b) => b.name === model)?.fields.find((x) => x.name === field);
    return f?.attrs.has("map") ? unquote(f.attrs.get("map")!) : field;
  };

  const tables: Table[] = models.map((b) => {
    const isColumn = (f: Field) => PRISMA_SCALARS.has(f.type) || enumNames.has(f.type);
    const blockList = (name: string) => b.block.filter((a) => a.has(name)).map((a) => fieldList(a.get(name)!).map((x) => colName(b.name, x)));
    const ids = blockList("id")[0] ?? [];
    const columns: Column[] = b.fields.filter(isColumn).map((f) => {
      const native = [...f.attrs.keys()].find((k) => k.startsWith("db."));
      const type = (native ? native.slice(3).toLowerCase() + (f.attrs.get(native) ? `(${f.attrs.get(native)})` : "") : f.type) + (f.list ? "[]" : "");
      const name = colName(b.name, f.name);
      const def = f.attrs.get("default");
      return {
        name,
        alias: name !== f.name ? f.name : undefined,
        type,
        nullable: f.optional,
        default: def !== undefined ? def : f.attrs.has("updatedAt") ? "updated by Prisma" : undefined,
        pk: f.attrs.has("id") || ids.includes(name),
        unique: f.attrs.has("unique"),
        note: f.doc.join(" ") || undefined,
      };
    });
    // Relations: the field holding @relation(fields: [...], references: [...]) marks this model's columns.
    for (const f of b.fields) {
      const rel = f.attrs.get("relation");
      if (!rel || !/fields\s*:/.test(rel)) continue;
      const from = fieldList(rel.slice(rel.indexOf("fields")));
      const to = fieldList(rel.slice(rel.indexOf("references")));
      from.forEach((field, i) => {
        const c = columns.find((x) => x.name === colName(b.name, field));
        if (c && to[i]) c.ref = { table: tableName.get(f.type) ?? f.type, column: colName(f.type, to[i]) };
      });
    }
    const name = tableName.get(b.name)!;
    return {
      name,
      alias: name !== b.name ? b.name : undefined,
      note: b.doc.join(" ") || undefined,
      columns,
      indexes: blockList("index"),
      uniques: blockList("unique"),
    };
  });
  return { dialect: "prisma", tables, enums: blocks.filter((b) => b.kind === "enum").map((b) => ({ name: b.name, values: b.values })) };
}

/* -------------------------------------------------------------- Postgres */

/** Split SQL into statements on top-level semicolons, skipping comments, quotes and $tag$ bodies. */
export function statements(sql: string): string[] {
  const out: string[] = [];
  let buf = "";
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (c === "-" && sql[i + 1] === "-") {
      const nl = sql.indexOf("\n", i);
      i = nl < 0 ? sql.length : nl;
      buf += "\n";
      continue;
    }
    if (c === "/" && sql[i + 1] === "*") {
      const end = sql.indexOf("*/", i + 2);
      i = end < 0 ? sql.length : end + 1;
      continue;
    }
    if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < sql.length && !(sql[j] === c && sql[j + 1] !== c)) j += sql[j] === c ? 2 : 1;
      buf += sql.slice(i, j + 1);
      i = j;
      continue;
    }
    if (c === "$") {
      const tag = sql.slice(i).match(/^\$[A-Za-z_]*\$/)?.[0];
      if (tag) {
        const end = sql.indexOf(tag, i + tag.length);
        const stop = end < 0 ? sql.length : end + tag.length;
        buf += sql.slice(i, stop);
        i = stop - 1;
        continue;
      }
    }
    if (c === ";") {
      if (buf.trim()) out.push(buf.trim());
      buf = "";
      continue;
    }
    buf += c;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

/** Split on commas outside parentheses and quotes. */
function topLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote = "";
  let buf = "";
  for (const c of s) {
    if (quote) {
      if (c === quote) quote = "";
    } else if (c === "'" || c === '"') quote = c;
    else if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === "," && depth === 0) {
      out.push(buf.trim());
      buf = "";
      continue;
    }
    buf += c;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

/** `public."my table"` → `my table`; other schemas keep their prefix. */
const ident = (s: string) =>
  s
    .trim()
    .replace(/^public\./i, "")
    .replace(/"/g, "");
const identList = (s: string) => s.split(",").map(ident).filter(Boolean);

export function parsePostgres(sql: string): Schema {
  const tables = new Map<string, Table>();
  const enums: Enum[] = [];
  const parentOf = new Map<string, string>();
  const get = (n: string) => tables.get(ident(n));
  const KEYWORDS = /\s+(?:COLLATE|DEFAULT|NOT\s+NULL|NULL|PRIMARY\s+KEY|UNIQUE|REFERENCES|CHECK|CONSTRAINT|GENERATED)\b/i;

  for (const st of statements(sql)) {
    const s = st.replace(/\s+/g, " ");
    let m: RegExpMatchArray | null;
    if ((m = s.match(/^CREATE (?:UNLOGGED )?TABLE (?:IF NOT EXISTS )?([\w."]+) \((.*)\)(.*)$/i))) {
      const t: Table = { name: ident(m[1]), columns: [], indexes: [], uniques: [] };
      for (const part of topLevel(m[2])) {
        let c: RegExpMatchArray | null;
        if ((c = part.match(/^(?:CONSTRAINT [\w"]+ )?PRIMARY KEY \(([^)]*)\)/i))) identList(c[1]).forEach((n) => t.columns.find((x) => x.name === n) && (t.columns.find((x) => x.name === n)!.pk = true));
        else if ((c = part.match(/^(?:CONSTRAINT [\w"]+ )?UNIQUE \(([^)]*)\)/i))) t.uniques.push(identList(c[1]));
        else if ((c = part.match(/^(?:CONSTRAINT [\w"]+ )?FOREIGN KEY \(([^)]*)\) REFERENCES ([\w."]+)\s*\(([^)]*)\)/i))) {
          const from = identList(c[1]);
          const to = identList(c[3]);
          from.forEach((n, i) => {
            const col = t.columns.find((x) => x.name === n);
            if (col) col.ref = { table: ident(c![2]), column: to[i] };
          });
        } else if (/^(CONSTRAINT|CHECK|EXCLUDE|LIKE)\b/i.test(part)) continue;
        else if ((c = part.match(/^("[^"]+"|[\w]+) (.*)$/))) {
          const rest = c[2];
          const cut = rest.search(KEYWORDS);
          const type = ident(cut < 0 ? rest : rest.slice(0, cut));
          const after = rest.split(/ DEFAULT /i)[1];
          const def = after?.slice(0, after.search(/ (?:NOT NULL|NULL|PRIMARY KEY|UNIQUE|REFERENCES|CHECK|CONSTRAINT|GENERATED)\b|$/i)).trim();
          const ref = rest.match(/REFERENCES ([\w."]+)\s*(?:\(([^)]*)\))?/i);
          t.columns.push({
            name: ident(c[1]),
            type,
            nullable: !/NOT NULL|PRIMARY KEY/i.test(rest),
            default: def ? prettyDefault(def) : /GENERATED .* AS IDENTITY/i.test(rest) ? "identity" : undefined,
            pk: /PRIMARY KEY/i.test(rest),
            unique: /\bUNIQUE\b/i.test(rest),
            ref: ref ? { table: ident(ref[1]), column: ref[2] ? ident(ref[2]) : "" } : undefined,
          });
        }
      }
      if (/PARTITION OF ([\w."]+)/i.test(m[3])) parentOf.set(t.name, ident(m[3].match(/PARTITION OF ([\w."]+)/i)![1]));
      tables.set(t.name, t);
    } else if ((m = s.match(/^CREATE TABLE ([\w."]+) PARTITION OF ([\w."]+)/i))) {
      parentOf.set(ident(m[1]), ident(m[2]));
    } else if ((m = s.match(/^ALTER TABLE (?:ONLY )?([\w."]+) ATTACH PARTITION ([\w."]+)/i))) {
      parentOf.set(ident(m[2]), ident(m[1]));
    } else if ((m = s.match(/^ALTER TABLE (?:ONLY )?([\w."]+) ADD CONSTRAINT [\w"]+ (PRIMARY KEY|UNIQUE) \(([^)]*)\)/i))) {
      const t = get(m[1]);
      if (!t) continue;
      const cols = identList(m[3]);
      if (/PRIMARY/i.test(m[2])) cols.forEach((n) => t.columns.forEach((c) => c.name === n && ((c.pk = true), (c.nullable = false))));
      else if (cols.length === 1) t.columns.forEach((c) => c.name === cols[0] && (c.unique = true));
      else t.uniques.push(cols);
    } else if ((m = s.match(/^ALTER TABLE (?:ONLY )?([\w."]+) ADD CONSTRAINT [\w"]+ FOREIGN KEY \(([^)]*)\) REFERENCES ([\w."]+)\s*\(([^)]*)\)/i))) {
      const t = get(m[1]);
      if (!t) continue;
      const to = identList(m[4]);
      identList(m[2]).forEach((n, i) => t.columns.forEach((c) => c.name === n && (c.ref = { table: ident(m![3]), column: to[i] })));
    } else if ((m = s.match(/^ALTER TABLE (?:ONLY )?([\w."]+) ALTER COLUMN ([\w"]+) ADD GENERATED/i))) {
      get(m[1])?.columns.forEach((c) => c.name === ident(m![2]) && (c.default = "identity"));
    } else if ((m = s.match(/^CREATE (UNIQUE )?INDEX [\w"]+ ON (?:ONLY )?([\w."]+)(?: USING \w+)? \(([^)]*)\)/i))) {
      const t = get(m[2]);
      if (!t) continue;
      const cols = identList(m[3]).map((x) => x.replace(/ .*$/, ""));
      if (m[1]) t.uniques.push(cols);
      else t.indexes.push(cols);
    } else if ((m = s.match(/^COMMENT ON TABLE ([\w."]+) IS '((?:[^']|'')*)'/i))) {
      const t = get(m[1]);
      if (t) t.note = m[2].replace(/''/g, "'");
    } else if ((m = s.match(/^COMMENT ON COLUMN ([\w."]+)\.([\w"]+) IS '((?:[^']|'')*)'/i))) {
      get(m[1])?.columns.forEach((c) => c.name === ident(m![2]) && (c.note = m![3].replace(/''/g, "'")));
    } else if ((m = s.match(/^CREATE TYPE ([\w."]+) AS ENUM \((.*)\)$/i))) {
      enums.push({ name: ident(m[1]), values: [...m[2].matchAll(/'((?:[^']|'')*)'/g)].map((x) => x[1]) });
    }
  }

  // Partitions are listed under their parent, not as tables of their own.
  for (const [child, parent] of parentOf) {
    const p = tables.get(parent);
    const c = tables.get(child);
    if (!p || !c) continue;
    (p.partitions ??= []).push(child);
    // pg_dump puts foreign keys on each partition; the parent's columns carry them too.
    for (const col of c.columns) {
      const pc = p.columns.find((x) => x.name === col.name);
      if (pc && col.ref && !pc.ref) pc.ref = col.ref;
    }
    tables.delete(child);
  }
  // A REFERENCES without a column means the referenced table's primary key.
  for (const t of tables.values())
    for (const c of t.columns)
      if (c.ref && !c.ref.column) c.ref.column = tables.get(c.ref.table)?.columns.find((x) => x.pk)?.name ?? "";
  return { dialect: "postgres", tables: [...tables.values()], enums };
}

function prettyDefault(d: string) {
  const seq = d.match(/^nextval\('(?:public\.)?([^']+)'(?:::regclass)?\)$/i);
  if (seq) return "auto-increment";
  return d.replace(/::(?:public\.)?[\w ]+(?:\[\])?$/i, "").replace(/^'(.*)'$/, "'$1'");
}

/** Prisma when it has `model` blocks, Postgres when it has CREATE TABLE. */
export function parseSchema(text: string): Schema {
  if (/^\s*model\s+\w+\s*\{/m.test(text)) return parsePrisma(text);
  if (/CREATE\s+TABLE/i.test(text)) return parsePostgres(text);
  throw new Error("This doesn't look like a Prisma schema or SQL with CREATE TABLE statements.");
}

/* ------------------------------------------------------------ Comparing */

export type Level = "breaking" | "check" | "added";
export type Change = { level: Level; table: string; column?: string; what: string };

/** What changed from `a` to `b`, for the people who read the database: breaking first. */
export function diffSchemas(a: Schema, b: Schema): Change[] {
  const out: Change[] = [];
  const before = new Map(a.tables.map((t) => [t.name, t]));
  const after = new Map(b.tables.map((t) => [t.name, t]));
  for (const t of a.tables) if (!after.has(t.name)) out.push({ level: "breaking", table: t.name, what: "Table removed" });
  for (const t of b.tables) if (!before.has(t.name)) out.push({ level: "added", table: t.name, what: `New table, ${t.columns.length} ${t.columns.length === 1 ? "column" : "columns"}` });
  for (const t of b.tables) {
    const old = before.get(t.name);
    if (!old) continue;
    const oldCols = new Map(old.columns.map((c) => [c.name, c]));
    const newCols = new Map(t.columns.map((c) => [c.name, c]));
    for (const c of old.columns) if (!newCols.has(c.name)) out.push({ level: "breaking", table: t.name, column: c.name, what: "Column removed" });
    for (const c of t.columns) {
      const o = oldCols.get(c.name);
      if (!o) {
        out.push({ level: "added", table: t.name, column: c.name, what: `New column, ${c.type}${c.nullable ? ", nullable" : ""}` });
        continue;
      }
      if (o.type !== c.type) out.push({ level: "breaking", table: t.name, column: c.name, what: `Type ${o.type} → ${c.type}` });
      if (o.nullable && !c.nullable) out.push({ level: "check", table: t.name, column: c.name, what: "Now required (NOT NULL)" });
      if (!o.nullable && c.nullable) out.push({ level: "check", table: t.name, column: c.name, what: "Now nullable: may be empty" });
      if (o.pk !== c.pk) out.push({ level: "check", table: t.name, column: c.name, what: c.pk ? "Now part of the primary key" : "No longer part of the primary key" });
      const r = (x?: Ref) => (x ? `${x.table}.${x.column}` : "");
      if (r(o.ref) !== r(c.ref)) out.push({ level: "check", table: t.name, column: c.name, what: c.ref ? `Now references ${r(c.ref)}` : `No longer references ${r(o.ref)}` });
      if ((o.default ?? "") !== (c.default ?? "")) out.push({ level: "check", table: t.name, column: c.name, what: `Default ${o.default ?? "none"} → ${c.default ?? "none"}` });
    }
    const key = (xs: string[][]) => new Set(xs.map((x) => x.join(", ")));
    const [ou, nu] = [key(old.uniques), key(t.uniques)];
    for (const u of nu) if (!ou.has(u)) out.push({ level: "check", table: t.name, what: `New unique key (${u})` });
    for (const u of ou) if (!nu.has(u)) out.push({ level: "check", table: t.name, what: `Unique key removed (${u})` });
  }
  const rank: Record<Level, number> = { breaking: 0, check: 1, added: 2 };
  return out.sort((x, y) => rank[x.level] - rank[y.level] || x.table.localeCompare(y.table));
}

/* ------------------------------------------------------------- Diagram */

export type BoxRow = { name: string; type: string; key: "pk" | "fk" | "pkfk" | "" };
export type Box = { name: string; x: number; y: number; w: number; h: number; rows: BoxRow[]; more: number };
export type Edge = { from: string; to: string; d: string; end: [number, number] };
export type Diagram = { boxes: Box[]; edges: Edge[]; width: number; height: number };

export const ERD = { W: 210, HEAD: 26, ROW: 16, FOOT: 6, GX: 72, GY: 26, ROWS: 8 };

type DiagramTable = { name: string; columns: Array<{ name: string; type: string; key?: string; ref?: string }> };

const keyOf = (c: { key?: string }): BoxRow["key"] => (c.key === "pk fk" ? "pkfk" : c.key === "pk" || c.key === "fk" ? c.key : "");

/**
 * Columns of boxes, related tables near each other: breadth-first from the most connected table, poured into
 * columns of about equal height. Edges run from a foreign-key row to the referenced table's key row.
 */
export function layoutDiagram(tables: DiagramTable[], opts: { maxTables?: number; keysOnly?: boolean; aspect?: number } = {}): Diagram {
  const { maxTables = 40, keysOnly = false, aspect = 1.5 } = opts;
  const refs = tables.flatMap((t) => t.columns.filter((c) => c.ref).map((c) => ({ from: t.name, col: c.name, to: c.ref!.split(".")[0], toCol: c.ref!.split(".").slice(1).join(".") })));
  const degree = new Map(tables.map((t) => [t.name, 0]));
  for (const r of refs) {
    if (r.to === r.from || !degree.has(r.to)) continue;
    degree.set(r.from, degree.get(r.from)! + 1);
    degree.set(r.to, degree.get(r.to)! + 1);
  }
  const kept = [...tables].sort((a, b) => degree.get(b.name)! - degree.get(a.name)! || a.name.localeCompare(b.name)).slice(0, maxTables);
  const keptNames = new Set(kept.map((t) => t.name));
  const near = new Map(kept.map((t) => [t.name, new Set<string>()]));
  for (const r of refs) if (keptNames.has(r.from) && keptNames.has(r.to) && r.from !== r.to) {
    near.get(r.from)!.add(r.to);
    near.get(r.to)!.add(r.from);
  }

  // Breadth-first order, most connected first; isolated tables last.
  const order: string[] = [];
  const seen = new Set<string>();
  for (const start of kept.map((t) => t.name)) {
    if (seen.has(start)) continue;
    const queue = [start];
    seen.add(start);
    while (queue.length) {
      const n = queue.shift()!;
      order.push(n);
      for (const m of [...near.get(n)!].sort((a, b) => degree.get(b)! - degree.get(a)!)) if (!seen.has(m)) {
          seen.add(m);
          queue.push(m);
        }
    }
  }

  const byName = new Map(kept.map((t) => [t.name, t]));
  const rowsOf = (t: DiagramTable) => {
    const keyed = t.columns.filter((c) => keyOf(c));
    const rest = t.columns.filter((c) => !keyOf(c));
    // Keys only: the key columns (or the first column when a table has none); the rest are counted.
    const shown = keysOnly ? (keyed.length ? keyed : t.columns.slice(0, 1)) : [...keyed, ...rest].slice(0, ERD.ROWS);
    return { rows: shown.map((c) => ({ name: c.name, type: c.type, key: keyOf(c) })), more: t.columns.length - shown.length };
  };
  const heightOf = (t: DiagramTable) => {
    const { rows, more } = rowsOf(t);
    return ERD.HEAD + (rows.length + (more ? 1 : 0)) * ERD.ROW + ERD.FOOT;
  };
  const total = order.reduce((s, n) => s + heightOf(byName.get(n)!) + ERD.GY, 0);
  const place = (cols: number) => {
    const target = total / cols;
    const out: Box[] = [];
    let col = 0;
    let y = 0;
    for (const n of order) {
      const t = byName.get(n)!;
      const h = heightOf(t);
      if (y > 0 && y + h / 2 > target && col < cols - 1) {
        col++;
        y = 0;
      }
      out.push({ name: n, x: col * (ERD.W + ERD.GX), y, w: ERD.W, h, ...rowsOf(t) });
      y += h + ERD.GY;
    }
    return { out, width: Math.max(...out.map((b) => b.x + b.w)) + ERD.GX / 2, height: Math.max(...out.map((b) => b.y + b.h)) };
  };
  // The column count that draws largest in a space of this shape (width = aspect × height).
  const best = [1, 2, 3, 4, 5, 6, 7, 8].map(place).reduce((a, b) => (Math.min(aspect / b.width, 1 / b.height) > Math.min(aspect / a.width, 1 / a.height) ? b : a));
  const { out: boxes, width, height } = best;

  const box = new Map(boxes.map((b) => [b.name, b]));
  const rowY = (b: Box, col: string) => {
    const i = b.rows.findIndex((r) => r.name === col);
    return b.y + (i < 0 ? ERD.HEAD / 2 : ERD.HEAD + i * ERD.ROW + ERD.ROW / 2);
  };
  const lanes = new Map<string, number>();
  const lane = (k: string) => {
    const n = lanes.get(k) ?? 0;
    lanes.set(k, n + 1);
    return n;
  };
  const edges: Edge[] = [];
  for (const r of refs) {
    const a = box.get(r.from);
    const b = box.get(r.to);
    if (!a || !b) continue;
    const ys = rowY(a, r.col);
    const yt = rowY(b, r.toCol);
    let d: string;
    let end: [number, number];
    if (a === b || a.x === b.x) {
      // Same column: loop out on the right.
      const x = a.x + a.w;
      const lx = x + 10 + (lane(`r${a.x}`) % 5) * 8;
      d = `M${x} ${ys} H${lx} V${yt} H${x}`;
      end = [x, yt];
    } else if (b.x > a.x) {
      const sx = a.x + a.w;
      const lx = sx + 12 + (lane(`g${a.x}`) % 6) * 9;
      d = `M${sx} ${ys} H${lx} V${yt} H${b.x}`;
      end = [b.x, yt];
    } else {
      const sx = a.x;
      const lx = sx - 12 - (lane(`g${b.x}`) % 6) * 9;
      d = `M${sx} ${ys} H${lx} V${yt} H${b.x + b.w}`;
      end = [b.x + b.w, yt];
    }
    edges.push({ from: r.from, to: r.to, d, end });
  }
  return { boxes, edges, width, height };
}

/** Scale an SVG path's coordinates (absolute M/H/V/L commands only, as layoutDiagram makes them). */
export const scalePath = (d: string, k: number) => d.replace(/-?\d+(?:\.\d+)?/g, (n) => String(Math.round(+n * k * 10) / 10));

/* --------------------------------------------------------------- Paging */

/** Pack tables onto pages by an estimated height; a table taller than a page continues on the next. */
export function packPages<T extends { columns: unknown[] }>(tables: T[], budget: number, headOf: (t: T, cont: boolean) => number, row: (c: T["columns"][number]) => number) {
  type Slice = { table: T; from: number; to: number; cont: boolean };
  const pages: Slice[][] = [];
  let page: Slice[] = [];
  let left = budget;
  for (const t of tables) {
    // A table that fits on a fresh page isn't split across two.
    const whole = headOf(t, false) + t.columns.reduce<number>((s, c) => s + row(c), 0);
    if (whole > left && whole <= budget && page.length) {
      pages.push(page);
      page = [];
      left = budget;
    }
    let i = 0;
    let first = true;
    while (i < t.columns.length || (first && t.columns.length === 0)) {
      const head = headOf(t, !first);
      if (left < head + (t.columns.length ? row(t.columns[i]) : 0) && page.length) {
        pages.push(page);
        page = [];
        left = budget;
      }
      left -= head;
      const from = i;
      while (i < t.columns.length && (left >= row(t.columns[i]) || i === from)) left -= row(t.columns[i++]);
      page.push({ table: t, from, to: i, cont: !first });
      first = false;
      if (i < t.columns.length) {
        pages.push(page);
        page = [];
        left = budget;
      }
      if (t.columns.length === 0) break;
    }
  }
  if (page.length) pages.push(page);
  return pages;
}
