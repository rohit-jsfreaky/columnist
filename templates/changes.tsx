/**
 * The schema change notice: an email to the people who read the database (analysts, data engineers, support) when a
 * new version ships. What could break their queries first, then what to check, then what's new.
 */
import { Column, Email, Heading, Row, Section, Text, token } from "@hyper-elements/react";
import { lint } from "@hyper-elements/lint";
import { template } from "@hyper-elements/react/template";
import type { Change } from "./_shared/schema.ts";
import type { Values } from "./_shared/values.ts";
import { AMBER, FONT_URLS, GREEN, MONO, RED, SERIF, example, fields, longDate, plural, stats, theme, title } from "./_shared/doc.tsx";

const LABEL = { fontFamily: MONO, fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase", color: "#646A74" } as const;
const GROUPS: Array<{ level: Change["level"]; name: string; color: string; why: string }> = [
  { level: "breaking", name: "Could break queries", color: RED, why: "Queries and dashboards that use these will fail or change." },
  { level: "check", name: "Worth a check", color: AMBER, why: "Queries still run, but results or assumptions may change." },
  { level: "added", name: "New", color: GREEN, why: "Nothing existing changes." },
];

export default template({
  id: "columnist.Changes",
  version: "1.0.0",
  label: "Schema change notice (email)",
  guidance: "Send it to the people who query the database when a migration ships. Attach the dictionary PDF.",
  root: "Email",
  fields,
  rules: { plugins: { lint: lint() }, require: { lint: ["lang", "contrast", "link-text"] }, root: { previewText: true } },
  example,
  render(input) {
    const v = input as unknown as Values;
    const count = (l: Change["level"]) => v.changes.filter((c) => c.level === l).length;
    const breaking = count("breaking");
    const subject = v.compare ? `${v.project} ${v.compare} → ${v.version ?? "now"}: database changes` : `${title(v)}: the data dictionary`;
    const summary = !v.compare
      ? "No earlier version was compared."
      : !v.changes.length
        ? "No changes to tables or columns."
        : breaking
          ? `${plural(breaking, "change")} could break queries that read these tables.`
          : "Nothing here breaks existing queries.";
    const st = stats(v);
    return (
      <Email
        theme={theme}
        lang="en"
        width={600}
        fonts={FONT_URLS}
        title={subject}
        previewText={v.compare ? `${plural(v.changes.length, "change")}: ${breaking} could break queries, ${count("check")} to check, ${count("added")} new.` : `${st.tables} tables, ${st.columns} columns.`}
        style={{ gap: 0 }}
      >
        <Section style={{ padding: [28, 24, 14] }}>
          <Text style={LABEL}>
            Schema change · {v.project}
            {v.owner ? ` · ${v.owner}` : ""}
          </Text>
        </Section>
        <Column style={{ apply: ["sheet"] }}>
          <Heading level={1}>{v.compare ? `${v.project} ${v.compare} → ${v.version ?? "this version"}: what changed in the database` : `${title(v)}: the data dictionary`}</Heading>
          <Text style={{ fontFamily: SERIF, fontSize: 19, lineHeight: 1.4 }}>{summary}</Text>
          {GROUPS.filter((g) => count(g.level)).map((g) => (
            <Column key={g.level} style={{ gap: 0 }}>
              <Row style={{ padding: [0, 0, 6] }}>
                <Column>
                  <Text style={{ ...LABEL, color: g.color }}>{g.name}</Text>
                </Column>
                <Column style={{ width: 60 }}>
                  <Text style={{ ...LABEL, color: g.color, textAlign: "right" }}>{String(count(g.level))}</Text>
                </Column>
              </Row>
              <Text style={{ fontSize: 14, color: token("colors.muted"), padding: [0, 0, 6] }}>{g.why}</Text>
              {v.changes
                .filter((c) => c.level === g.level)
                .slice(0, 40)
                .map((c, i) => (
                  <Row key={i} style={{ padding: [8, 0], border: { top: { width: 1, style: "solid", color: token("colors.border") } } }}>
                    <Column style={{ width: 230 }}>
                      <Text style={{ fontFamily: MONO, fontSize: 14 }}>{c.column ? `${c.table}.${c.column}` : c.table}</Text>
                    </Column>
                    <Column>
                      <Text style={{ fontSize: 14 }}>{c.what}</Text>
                    </Column>
                  </Row>
                ))}
              {count(g.level) > 40 ? <Text style={{ fontSize: 14, color: token("colors.muted") }}>…and {count(g.level) - 40} more in the attached dictionary.</Text> : null}
            </Column>
          ))}
          <Text style={{ fontSize: 15, color: token("colors.muted") }}>
            {`${title(v)} now has ${st.tables} tables and ${st.columns} columns. The attached data dictionary lists every one, with the diagram.`}
          </Text>
        </Column>
        <Section style={{ padding: [20, 24, 32] }}>
          <Text style={{ fontSize: 14, color: token("colors.muted") }}>
            Read from {v.source} on {longDate(v.date)}. Renamed columns show as one removed and one added.
          </Text>
        </Section>
      </Email>
    );
  },
});
