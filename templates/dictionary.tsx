/**
 * The data dictionary: an A4 landscape PDF. A cover with the contents, the diagram of how the tables connect (key
 * columns only), then every table with every column: type, empty or not, default, key, and what it means.
 */
import { Fragment } from "react";
import { Column, Document, Heading, PageBreak, PageFooter, PageNumber, Row, Span, Table, TableCell, TableRow, Text } from "@hyper-elements/react";
import { template } from "@hyper-elements/react/template";
import { packPages } from "./_shared/schema.ts";
import type { ColumnValue, TableValue, Values } from "./_shared/values.ts";
import { Diagram, FAINT, FONT_FILES, GREEN, INK, INK2, LINE, MONO, MUTED, RULE, SANS, SERIF, example, fields, longDate, plural, stats, title } from "./_shared/doc.tsx";

const W = 1043; // A4 landscape at 96 px/in (1123) less 40 px margins
const BUDGET = 668; // estimated height a page of tables can take, under the footer
const label = { fontFamily: MONO, fontSize: 8, fontWeight: 400, letterSpacing: 0.6, textTransform: "uppercase", color: MUTED } as const;
const lines = (s: string | undefined, perLine: number) => (s ? Math.ceil(s.length / perLine) : 1);
const rowHeight = (c: ColumnValue) => 10 + 11.5 * Math.max(lines(c.name + (c.alias ? ` ${c.alias}` : ""), 34), lines(c.note, 60), lines(c.default, 24), lines(c.ref, 36), lines(c.type, 26));
const headHeight = (t: TableValue, cont: boolean) => 84 + (cont ? 0 : Math.max(0, lines(t.note, 170) - 1) * 15);

function TableBlock({ t, from, to, cont }: { t: TableValue; from: number; to: number; cont: boolean }) {
  const meta = [plural(t.columns.length, "column"), t.indexes ? plural(t.indexes, "index", "indexes") : "", t.partitions ? plural(t.partitions, "partition") : ""].filter(Boolean).join(" · ");
  return (
    <Column style={{ gap: 6 }}>
      <Row style={{ alignItems: "end", border: { top: `1.5px solid ${INK}` }, padding: [8, 0, 0] }}>
        <Column>
          <Heading level={2} style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 19, lineHeight: 1.2 }}>
            {t.name}
            {cont ? <Span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, fontSize: 13, color: MUTED }}> (continued)</Span> : null}
            {t.alias && !cont ? <Span style={{ fontFamily: MONO, fontWeight: 400, fontSize: 9, color: MUTED }}>{`   model ${t.alias}`}</Span> : null}
          </Heading>
        </Column>
        <Column style={{ width: 300 }}>
          <Text style={{ ...label, textAlign: "right" }}>{meta}</Text>
        </Column>
      </Row>
      {cont ? null : t.note ? (
        <Text style={{ fontFamily: SERIF, fontSize: 12, lineHeight: 1.4, color: INK2 }}>{t.note}</Text>
      ) : (
        <Text style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 11.5, color: FAINT }}>No description yet.</Text>
      )}
      <Table style={{ width: W, cellPadding: [4, 6], rowBorder: { width: 0.5, style: "solid", color: LINE } }}>
        <TableRow header>
          <TableCell style={{ ...label, width: 200 }}>Column</TableCell>
          <TableCell style={{ ...label, width: 150 }}>Type</TableCell>
          <TableCell style={{ ...label, width: 52 }}>Empty</TableCell>
          <TableCell style={{ ...label, width: 140 }}>Default</TableCell>
          <TableCell style={{ ...label, width: 200 }}>Key</TableCell>
          <TableCell style={label}>What it means</TableCell>
        </TableRow>
        {t.columns.slice(from, to).map((c) => (
          <TableRow key={c.name}>
            <TableCell style={{ fontFamily: MONO, fontSize: 8.5, verticalAlign: "top", color: INK }}>
              {c.name}
              {c.alias ? <Span style={{ color: FAINT }}>{` ${c.alias}`}</Span> : null}
            </TableCell>
            <TableCell style={{ fontFamily: MONO, fontSize: 8.5, verticalAlign: "top", color: INK2 }}>{c.type}</TableCell>
            <TableCell style={{ fontFamily: SANS, fontSize: 8.5, verticalAlign: "top", color: c.nullable ? INK2 : MUTED }}>{c.nullable ? "yes" : "no"}</TableCell>
            <TableCell style={{ fontFamily: MONO, fontSize: 8, verticalAlign: "top", color: INK2 }}>{c.default ?? ""}</TableCell>
            <TableCell style={{ fontFamily: MONO, fontSize: 8, verticalAlign: "top", color: GREEN }}>
              {[c.key === "pk fk" ? "PK" : c.key === "pk" ? "PK" : "", c.unique ? "UNIQUE" : ""].filter(Boolean).join(" ")}
              {c.ref ? <Span style={{ color: GREEN }}>{`${c.key === "pk fk" ? " · " : ""}→ ${c.ref}`}</Span> : null}
            </TableCell>
            <TableCell style={{ fontFamily: SANS, fontSize: 8.5, verticalAlign: "top", color: c.note ? INK : FAINT }}>{c.note ?? "—"}</TableCell>
          </TableRow>
        ))}
      </Table>
    </Column>
  );
}

export default template({
  id: "columnist.Dictionary",
  version: "1.0.0",
  label: "Data dictionary (PDF)",
  guidance: "Every table and column of one schema version, with the diagram. Notes come from the schema's own comments or what your team wrote.",
  root: "Document",
  formats: { a4: { size: "A4", orientation: "landscape" } },
  fields,
  example,
  render(input) {
    const v = input as unknown as Values;
    const st = stats(v);
    const pages = packPages(v.tables, BUDGET, headHeight, rowHeight);
    const firstPage = new Map<string, number>();
    pages.forEach((p, i) => p.forEach((s) => (s.cont ? null : firstPage.set(s.table.name, i + 3))));
    const per = Math.ceil(v.tables.length / 4);
    const contents = [0, 1, 2, 3].map((i) => v.tables.slice(i * per, i * per + per));

    return (
      <Document size="A4" orientation="landscape" margin={40} title={`${title(v)}: data dictionary`} lang="en" fonts={FONT_FILES} style={{ fontFamily: SANS, fontSize: 10, color: INK, gap: 14 }}>
        {/* Cover */}
        <Row style={{ border: { top: `3px solid ${INK}`, bottom: `0.75px solid ${INK}` }, padding: [6, 0] }}>
          <Column>
            <Text style={label}>The data dictionary</Text>
          </Column>
          <Column>
            <Text style={{ ...label, textAlign: "right" }}>
              {longDate(v.date)}
              {v.owner ? ` · ${v.owner}` : ""}
            </Text>
          </Column>
        </Row>
        <Heading level={1} style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 54, lineHeight: 1.05, letterSpacing: -1.2, padding: [18, 0, 0] }}>
          {title(v)}
        </Heading>
        <Text style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 17, color: INK2 }}>
          {`Every table and column, read from ${v.source}${v.dialect === "prisma" ? " (Prisma)" : " (PostgreSQL)"}.`}
        </Text>
        <Row style={{ gap: 0, padding: [10, 0], border: { top: `0.75px solid ${RULE}`, bottom: `0.75px solid ${RULE}` } }}>
          {[
            [st.tables, "tables"],
            [st.columns, "columns"],
            [st.relations, "relations"],
            [v.enums.length, "enums"],
          ].map(([n, what]) => (
            <Column key={what as string} style={{ gap: 0 }}>
              <Text style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 1.1 }}>{String(n)}</Text>
              <Text style={label}>{what as string}</Text>
            </Column>
          ))}
        </Row>
        <Text style={label}>Contents · page</Text>
        <Row style={{ gap: 28, alignItems: "start" }}>
          {contents.map((list, i) => (
            <Column key={i} style={{ gap: 0 }}>
              {list.map((t) => (
                <Row key={t.name} style={{ border: { bottom: `0.5px solid ${LINE}` }, padding: [2.5, 0] }}>
                  <Column>
                    <Text style={{ fontFamily: MONO, fontSize: 8.5 }}>{t.name}</Text>
                  </Column>
                  <Column style={{ width: 24 }}>
                    <Text style={{ fontFamily: MONO, fontSize: 8.5, color: MUTED, textAlign: "right" }}>{String(firstPage.get(t.name) ?? "")}</Text>
                  </Column>
                </Row>
              ))}
            </Column>
          ))}
        </Row>

        {/* Diagram */}
        <PageBreak />
        <Row style={{ alignItems: "end", border: { top: `1.5px solid ${INK}` }, padding: [8, 0, 0] }}>
          <Column>
            <Heading level={2} style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 22 }}>
              How the tables connect
            </Heading>
          </Column>
          <Column style={{ width: 520 }}>
            <Text style={{ ...label, textAlign: "right" }}>PK primary key · FK foreign key · PF both · green dot: the column a key points to</Text>
          </Column>
        </Row>
        <Diagram tables={v.tables} width={W} height={590} keysOnly />
        <Text style={{ fontSize: 8.5, color: MUTED }}>Key columns only. Every column is on the pages that follow.</Text>

        {/* Tables */}
        {pages.map((page, i) => (
          <Fragment key={i}>
            <PageBreak />
            {page.map((s) => (
              <TableBlock key={`${s.table.name}-${s.from}`} t={s.table} from={s.from} to={s.to} cont={s.cont} />
            ))}
          </Fragment>
        ))}

        {v.enums.length ? (
          <>
            <PageBreak />
            <Heading level={2} style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 19, border: { top: `1.5px solid ${INK}` }, padding: [8, 0, 0] }}>
              Enums
            </Heading>
            <Table style={{ width: W, cellPadding: [4, 6], rowBorder: { width: 0.5, style: "solid", color: LINE } }}>
              <TableRow header>
                <TableCell style={{ ...label, width: 200 }}>Enum</TableCell>
                <TableCell style={label}>Values</TableCell>
              </TableRow>
              {v.enums.map((e) => (
                <TableRow key={e.name}>
                  <TableCell style={{ fontFamily: MONO, fontSize: 8.5 }}>{e.name}</TableCell>
                  <TableCell style={{ fontFamily: MONO, fontSize: 8.5, color: INK2 }}>{e.values}</TableCell>
                </TableRow>
              ))}
            </Table>
          </>
        ) : null}

        <PageFooter style={{ padding: [8, 0, 0], border: { top: `0.75px solid ${LINE}` } }}>
          <Row>
            <Column>
              <Text style={{ fontSize: 7.5, color: MUTED }}>
                {title(v)} · data dictionary · {longDate(v.date)}
              </Text>
            </Column>
            <Column>
              <Text style={{ fontSize: 7.5, color: MUTED, textAlign: "right" }}>
                Page <PageNumber /> of <PageNumber total />
              </Text>
            </Column>
          </Row>
        </PageFooter>
      </Document>
    );
  },
});
