/**
 * What every Columnist template shares: the fields (one schema's tables and columns, and what changed since the
 * last version), the look, and the diagram that both the PDF and the PNG draw.
 */
import { Circle, Column, Layer, Path, Rect, Row, Svg, Text, defineTheme, prop } from "@hyper-elements/react";
import { formatDate } from "@hyper-elements/react/template";
import { layoutDiagram, scalePath, ERD } from "./schema.ts";
import type { TableValue, Values } from "./values.ts";
import sample from "./example.ts";

const column = prop.object(
  {
    name: prop.text({ label: "Column", required: true, maxLength: 63 }),
    alias: prop.text({ label: "Name in the code", maxLength: 63 }),
    type: prop.text({ label: "Type", required: true, maxLength: 40 }),
    nullable: prop.boolean({ label: "Can be empty", default: true }),
    default: prop.text({ label: "Default", maxLength: 60 }),
    key: prop.choice(["pk", "fk", "pk fk"], { label: "Key" }),
    unique: prop.boolean({ label: "Unique", default: false }),
    ref: prop.text({ label: "References (table.column)", maxLength: 130, pattern: "^[^.]+\\..+$" }),
    note: prop.text({ label: "What it means", maxLength: 240 }),
  },
  { label: "Column" },
);

export const fields = {
  project: prop.text({ label: "Project", required: true, maxLength: 60 }),
  version: prop.text({ label: "Version", maxLength: 30 }),
  source: prop.text({ label: "Schema file", required: true, maxLength: 120 }),
  dialect: prop.choice(["prisma", "postgres"], { label: "Read from", required: true }),
  date: prop.date({ label: "Date", required: true }),
  owner: prop.text({ label: "Kept by", maxLength: 80, guidance: "The team people ask about this database." }),
  tables: prop.list(
    prop.object(
      {
        name: prop.text({ label: "Table", required: true, maxLength: 63 }),
        alias: prop.text({ label: "Model in the code", maxLength: 63 }),
        note: prop.text({ label: "What it holds", maxLength: 400 }),
        partitions: prop.number({ label: "Partitions", min: 0, integer: true }),
        indexes: prop.number({ label: "Indexes", required: true, min: 0, integer: true }),
        columns: prop.list(column, { label: "Columns", required: true, min: 1, max: 150 }),
      },
      { label: "Table" },
    ),
    { label: "Tables", required: true, min: 1, max: 150 },
  ),
  enums: prop.list(prop.object({ name: prop.text({ label: "Enum", required: true, maxLength: 63 }), values: prop.text({ label: "Values", required: true, maxLength: 300 }) }, { label: "Enum" }), { label: "Enums", max: 60 }),
  compare: prop.text({ label: "Compared with version", maxLength: 30 }),
  changes: prop.list(
    prop.object(
      {
        level: prop.choice(["breaking", "check", "added"], { label: "Level", required: true }),
        table: prop.text({ label: "Table", required: true, maxLength: 63 }),
        column: prop.text({ label: "Column", maxLength: 63 }),
        what: prop.text({ label: "What changed", required: true, maxLength: 160 }),
      },
      { label: "Change" },
    ),
    { label: "Changes", max: 200 },
  ),
};

/** The sample: Umami's real schema at v3.5.0, compared with v3.4.1. Notes on a few tables are ours. */
export const example = sample as unknown as Values;

/* ---------- look ---------- */

export const INK = "#14171C";
export const INK2 = "#3A3F47";
export const MUTED = "#646A74";
export const FAINT = "#9AA0A9";
export const LINE = "#E3E5E9";
export const RULE = "#C9CDD3";
export const WASH = "#F5F6F7";
export const PAPER = "#FFFFFF";
export const GREEN = "#0B6B50";
export const GREEN_SOFT = "#E3F1EC";
export const RED = "#B42318";
export const AMBER = "#8A5300";

export const SERIF = "'Newsreader', Georgia, 'Times New Roman', serif";
export const SANS = "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif";
export const MONO = "'IBM Plex Mono', Menlo, Consolas, monospace";

export const FONT_FILES = [
  { family: "Newsreader", src: "../fonts/Newsreader-400.woff", weight: 400 },
  { family: "Newsreader", src: "../fonts/Newsreader-400-italic.woff", weight: 400, style: "italic" as const },
  { family: "Newsreader", src: "../fonts/Newsreader-500.woff", weight: 500 },
  { family: "Newsreader", src: "../fonts/Newsreader-600.woff", weight: 600 },
  { family: "IBM Plex Sans", src: "../fonts/IBMPlexSans-400.woff", weight: 400 },
  { family: "IBM Plex Sans", src: "../fonts/IBMPlexSans-500.woff", weight: 500 },
  { family: "IBM Plex Sans", src: "../fonts/IBMPlexSans-600.woff", weight: 600 },
  { family: "IBM Plex Mono", src: "../fonts/IBMPlexMono-Regular.ttf", weight: 400 },
  { family: "IBM Plex Mono", src: "../fonts/IBMPlexMono-Medium.ttf", weight: 500 },
];
const CDN = "https://cdn.jsdelivr.net/npm/@fontsource";
export const FONT_URLS = [
  { family: "Newsreader", src: `${CDN}/newsreader@5.3.0/files/newsreader-latin-500-normal.woff2`, weight: 500 },
  { family: "IBM Plex Sans", src: `${CDN}/ibm-plex-sans@5.3.0/files/ibm-plex-sans-latin-400-normal.woff2`, weight: 400 },
  { family: "IBM Plex Sans", src: `${CDN}/ibm-plex-sans@5.3.0/files/ibm-plex-sans-latin-600-normal.woff2`, weight: 600 },
  { family: "IBM Plex Mono", src: `${CDN}/ibm-plex-mono@5.3.0/files/ibm-plex-mono-latin-400-normal.woff2`, weight: 400 },
];

export const theme = defineTheme({
  colors: { background: WASH, foreground: INK, primary: INK, primaryForeground: PAPER, muted: MUTED, border: LINE, paper: PAPER, green: GREEN, red: RED },
  fonts: { body: SANS, heading: SERIF },
  fontSizes: { body: 15 },
  lineHeights: { body: 1.6 },
  elements: {
    Heading: { fontFamily: SERIF, fontWeight: 500, letterSpacing: -0.3, lineHeight: 1.15, by: { level: { 1: { fontSize: 30, mobile: { fontSize: 25 } }, 2: { fontSize: 18 } } } },
  },
  styles: {
    label: { fontFamily: MONO, fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase", color: MUTED },
    sheet: { backgroundColor: PAPER, padding: 32, gap: 18, border: `1px solid ${LINE}` },
  },
});

/* ---------- helpers ---------- */

export const longDate = (iso: string) => formatDate(iso, "en-GB", { day: "numeric", month: "long", year: "numeric" });
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export const stats = (v: Pick<Values, "tables">) => {
  const columns = v.tables.reduce((s, t) => s + t.columns.length, 0);
  const relations = v.tables.reduce((s, t) => s + t.columns.filter((c) => c.ref).length, 0);
  return { tables: v.tables.length, columns, relations };
};
export const title = (v: Pick<Values, "project" | "version">) => `${v.project}${v.version ? ` ${v.version}` : ""}`;
/** Cut to fit a box `px` wide in a font `size` px with average glyph width `em`. */
export const fitText = (s: string, px: number, size: number, em = 0.6) => {
  const n = Math.max(3, Math.floor(px / (size * em)));
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
};

/* ---------- the diagram ---------- */

export function diagramOf(tables: TableValue[], keysOnly: boolean, aspect = 1.5) {
  return layoutDiagram(
    tables.map((t) => ({ name: t.name, columns: t.columns.map((c) => ({ name: c.name, type: c.type, key: c.key, ref: c.ref })) })),
    { keysOnly, aspect },
  );
}

/**
 * The entity-relationship diagram, scaled to fit `width` × `height`: boxes and connectors in an Svg, each table's
 * labels laid over its box (a Layer child padded to the box's corner).
 */
export function Diagram({ tables, width, height, keysOnly }: { tables: TableValue[]; width: number; height: number; keysOnly: boolean }) {
  const d = diagramOf(tables, keysOnly, width / height);
  const k = Math.min(width / d.width, height / d.height, 1.25);
  const s = (n: number) => Math.round(n * k * 10) / 10;
  const W = s(d.width);
  const H = s(d.height);
  const head = ERD.HEAD * k;
  const row = ERD.ROW * k;
  const f = 9.5 * k;
  const inner = (b: { w: number }) => s(b.w) - 14 * k - 17 * k;
  return (
    <Layer style={{ width: W, height: H }}>
      <Svg width={W} height={H} title={`Diagram of ${plural(d.boxes.length, "table")} and ${plural(d.edges.length, "relation")}`}>
        {d.edges.map((e, i) => (
          <Path key={`e${i}`} d={scalePath(e.d, k)} style={{ stroke: RULE, strokeWidth: Math.max(0.6, 1.1 * k), fill: "transparent" }} />
        ))}
        {d.boxes.map((b) => (
          <Rect key={`b${b.name}`} x={s(b.x)} y={s(b.y)} width={s(b.w)} height={s(b.h)} rx={3 * k} style={{ fill: PAPER, stroke: INK, strokeWidth: Math.max(0.6, 1 * k) }} />
        ))}
        {d.boxes.map((b) => (
          <Rect key={`h${b.name}`} x={s(b.x)} y={s(b.y)} width={s(b.w)} height={s(ERD.HEAD)} rx={3 * k} style={{ fill: INK }} />
        ))}
        {d.edges.map((e, i) => (
          <Circle key={`c${i}`} cx={s(e.end[0])} cy={s(e.end[1])} r={Math.max(1.4, 2.4 * k)} style={{ fill: GREEN }} />
        ))}
      </Svg>
      {d.boxes.map((b) => (
        <Column key={b.name} style={{ padding: [s(b.y), 0, 0, s(b.x)] }}>
          <Column style={{ width: s(b.w) }}>
            <Text style={{ fontFamily: MONO, fontWeight: 500, fontSize: f * 1.05, lineHeight: head / (f * 1.05), color: PAPER, padding: [0, 7 * k] }}>{fitText(b.name, s(b.w) - 14 * k, f * 1.05)}</Text>
            {b.rows.map((r) => (
              <Row key={r.name} style={{ padding: [0, 7 * k] }}>
                <Column style={{ width: 17 * k }}>
                  <Text style={{ fontFamily: MONO, fontSize: f * 0.72, lineHeight: row / (f * 0.72), color: GREEN }}>{r.key === "pkfk" ? "PF" : r.key.toUpperCase()}</Text>
                </Column>
                <Column style={{ width: inner(b) * 0.64 }}>
                  <Text style={{ fontFamily: MONO, fontSize: f, lineHeight: row / f, color: INK }}>{fitText(r.name, inner(b) * 0.64 - 2, f)}</Text>
                </Column>
                <Column style={{ width: inner(b) * 0.36 }}>
                  <Text style={{ fontFamily: MONO, fontSize: f * 0.85, lineHeight: row / (f * 0.85), color: MUTED, textAlign: "right" }}>{fitText(r.type, inner(b) * 0.36 - 2, f * 0.85)}</Text>
                </Column>
              </Row>
            ))}
            {b.more ? <Text style={{ fontFamily: SANS, fontSize: f * 0.85, lineHeight: row / (f * 0.85), color: MUTED, padding: [0, 7 * k] }}>+ {plural(b.more, "more column")}</Text> : null}
          </Column>
        </Column>
      ))}
    </Layer>
  );
}
