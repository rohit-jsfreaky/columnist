import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { diffSchemas, layoutDiagram, packPages, parsePostgres, parsePrisma, parseSchema, statements } from "../templates/_shared/schema.ts";
import { toValues } from "../templates/_shared/values.ts";

const sample = (f: string) => readFileSync(new URL(`../public/samples/${f}`, import.meta.url), "utf8");

test("Umami's real Prisma schema: mapped names, native types, relations", () => {
  const s = parseSchema(sample("umami-v3.5.0.prisma"));
  assert.equal(s.dialect, "prisma");
  assert.equal(s.tables.length, 29);
  const website = s.tables.find((t) => t.name === "website")!;
  assert.equal(website.alias, "Website");
  const id = website.columns.find((c) => c.name === "website_id")!;
  assert.deepEqual([id.alias, id.type, id.pk, id.nullable], ["id", "uuid", true, false]);
  assert.deepEqual(website.columns.find((c) => c.name === "user_id")!.ref, { table: "user", column: "user_id" });
  // Composite @@id
  assert.deepEqual(s.tables.find((t) => t.name === "error_event")!.columns.filter((c) => c.pk).map((c) => c.name), ["website_id", "event_id"]);
  assert.equal(s.tables.flatMap((t) => t.columns.filter((c) => c.ref)).length, 30);
});

test("Prisma doc comments and enums", () => {
  const s = parsePrisma(`/// People who sign in\nmodel User {\n  /// Login name\n  name String @unique // inline comment\n  role Role @default(USER)\n  id Int @id @default(autoincrement())\n}\nenum Role {\n  USER\n  ADMIN\n}`);
  const u = s.tables[0];
  assert.equal(u.note, "People who sign in");
  assert.equal(u.columns[0].note, "Login name");
  assert.equal(u.columns[0].unique, true);
  assert.equal(u.columns[1].default, "USER");
  assert.deepEqual(s.enums, [{ name: "Role", values: ["USER", "ADMIN"] }]);
});

test("statements: semicolons inside $$ bodies and quotes don't split", () => {
  const st = statements("CREATE FUNCTION f() AS $$ BEGIN CREATE TEMPORARY TABLE x (a int); END $$;\nCOMMENT ON TABLE t IS 'a; b';\n-- note; here\nSELECT 1;");
  assert.equal(st.length, 3);
});

test("Pagila's real pg_dump: partitions folded, keys from ALTER TABLE, enum", () => {
  const s = parsePostgres(sample("pagila-schema.sql"));
  assert.equal(s.tables.length, 16);
  const payment = s.tables.find((t) => t.name === "payment")!;
  assert.ok((payment.partitions?.length ?? 0) > 10);
  assert.deepEqual(payment.columns.find((c) => c.name === "customer_id")!.ref, { table: "customer", column: "customer_id" });
  const film = s.tables.find((t) => t.name === "film")!;
  const id = film.columns.find((c) => c.name === "film_id")!;
  assert.deepEqual([id.pk, id.default, id.nullable], [true, "auto-increment", false]);
  assert.equal(film.columns.find((c) => c.name === "rental_rate")!.default, "4.99");
  assert.deepEqual(s.enums.find((e) => e.name === "mpaa_rating")?.values, ["G", "PG", "PG-13", "R", "NC-17"]);
});

test("diff: Umami v3.4.1 → v3.5.0 is three new tables, nothing breaking", () => {
  const d = diffSchemas(parseSchema(sample("umami-v3.4.1.prisma")), parseSchema(sample("umami-v3.5.0.prisma")));
  assert.deepEqual(d.map((c) => [c.level, c.table]), [["added", "error_event"], ["added", "error_issue"], ["added", "error_rate_limit"]]);
});

test("diff: removed and retyped columns are breaking, nullability is a check", () => {
  const a = parsePostgres("CREATE TABLE t (id integer NOT NULL, name text NOT NULL, old text, price integer);");
  const b = parsePostgres("CREATE TABLE t (id integer NOT NULL, name text, price numeric(10,2));");
  const d = diffSchemas(a, b);
  assert.deepEqual(d.map((c) => [c.level, c.column, c.what]), [
    ["breaking", "old", "Column removed"],
    ["breaking", "price", "Type integer → numeric(10,2)"],
    ["check", "name", "Now nullable: may be empty"],
  ]);
});

test("diagram: no two boxes overlap", () => {
  const v = toValues(parseSchema(sample("umami-v3.5.0.prisma")), { project: "Umami", source: "x", date: "2026-11-19" });
  const d = layoutDiagram(v.tables.map((t) => ({ name: t.name, columns: t.columns })), { keysOnly: true, aspect: 1.77 });
  for (const a of d.boxes)
    for (const b of d.boxes) if (a !== b) assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, `${a.name} overlaps ${b.name}`);
});

test("pages: a table that fits a fresh page is never split; a long one continues", () => {
  const t = (n: string, cols: number) => ({ name: n, columns: Array.from({ length: cols }, () => 0) });
  const pages = packPages([t("a", 20), t("b", 20), t("c", 70)], 50, () => 5, () => 1);
  assert.deepEqual(pages.map((p) => p.map((s) => `${s.table.name}${s.from}-${s.to}${s.cont ? "+" : ""}`)), [["a0-20", "b0-20"], ["c0-45"], ["c45-70+"]]);
});
