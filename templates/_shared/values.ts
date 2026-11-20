/** From a parsed schema (and the notes people wrote) to the values the three templates take. No imports from the library. */
import { diffSchemas, type Change, type Column, type Schema } from "./schema.ts";

export type Notes = Record<string, string>; // "table" or "table.column" → note

export type ColumnValue = { name: string; alias?: string; type: string; nullable: boolean; default?: string; key?: "pk" | "fk" | "pk fk"; unique: boolean; ref?: string; note?: string };
export type TableValue = { name: string; alias?: string; note?: string; partitions?: number; indexes: number; columns: ColumnValue[] };
export type Values = {
  project: string;
  version?: string;
  source: string;
  dialect: "prisma" | "postgres";
  date: string;
  owner?: string;
  tables: TableValue[];
  enums: Array<{ name: string; values: string }>;
  compare?: string;
  changes: Change[];
};

const keyOf = (c: Column): ColumnValue["key"] => (c.pk && c.ref ? "pk fk" : c.pk ? "pk" : c.ref ? "fk" : undefined);
const clip = (s: string | undefined, n: number) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : s) || undefined;

export function toValues(
  s: Schema,
  meta: { project: string; version?: string; source: string; date: string; owner?: string },
  notes: Notes = {},
  before?: { schema: Schema; version: string },
): Values {
  return {
    project: meta.project.slice(0, 60),
    version: meta.version?.slice(0, 30) || undefined,
    source: meta.source.slice(0, 120),
    dialect: s.dialect,
    date: meta.date,
    owner: meta.owner?.trim().slice(0, 80) || undefined,
    tables: [...s.tables]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((t) => ({
        name: t.name,
        alias: t.alias,
        note: clip(notes[t.name] ?? t.note, 400),
        partitions: t.partitions?.length || undefined,
        indexes: t.indexes.length + t.uniques.length,
        columns: t.columns.map((c) => ({
          name: c.name,
          alias: c.alias,
          type: clip(c.type, 40)!,
          nullable: c.nullable,
          default: clip(c.default, 60),
          key: keyOf(c),
          unique: c.unique,
          ref: c.ref ? `${c.ref.table}.${c.ref.column}` : undefined,
          note: clip(notes[`${t.name}.${c.name}`] ?? c.note, 240),
        })),
      })),
    enums: s.enums.map((e) => ({ name: e.name, values: e.values.join(", ").slice(0, 300) })),
    compare: before?.version.slice(0, 30),
    changes: before ? diffSchemas(before.schema, s).slice(0, 200) : [],
  };
}
