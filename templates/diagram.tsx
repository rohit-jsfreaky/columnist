/**
 * The diagram as an image: 1600 × 1000 PNG for a README, a wiki page or a pull request. Up to eight columns per
 * table, keys first; the most connected 40 tables.
 */
import { Canvas, Column, Row, Text } from "@hyper-elements/react";
import { template } from "@hyper-elements/react/template";
import type { Values } from "./_shared/values.ts";
import { Diagram, FONT_FILES, INK, LINE, MONO, MUTED, PAPER, SANS, SERIF, example, fields, longDate, stats, title } from "./_shared/doc.tsx";

const W = 1600;
const H = 1000;
const PAD = 48;
const TOP = 112;

export default template({
  id: "columnist.Diagram",
  version: "1.0.0",
  label: "Schema diagram (PNG)",
  guidance: "For a README or a pull request. Large schemas show their 40 most connected tables.",
  root: "Canvas",
  formats: { wide: { width: W, height: H, scale: 1 } },
  fields,
  rules: { require: { core: ["image/overflow", "image/glyph", "image/fit"] } },
  example,
  render(input) {
    const v = input as unknown as Values;
    const st = stats(v);
    return (
      <Canvas width={W} height={H} fonts={FONT_FILES} style={{ backgroundColor: PAPER, fontFamily: SANS, color: INK, padding: 0, gap: 0 }}>
        <Row style={{ width: W, padding: [36, PAD, 0], alignItems: "end", gap: 24 }}>
          <Column style={{ width: 900, gap: 4 }}>
            <Text style={{ width: 900, fontFamily: MONO, fontSize: 15, letterSpacing: 1, textTransform: "uppercase", color: MUTED }}>The schema · {longDate(v.date)}</Text>
            <Text fit={{ sizes: [44, 38, 32], maxLines: 1 }} style={{ width: 900, fontFamily: SERIF, fontWeight: 500, lineHeight: 1.1, letterSpacing: -0.8 }}>
              {title(v)}
            </Text>
          </Column>
          <Column style={{ width: W - PAD * 2 - 924 }}>
            <Text style={{ width: W - PAD * 2 - 924, textAlign: "right", fontFamily: MONO, fontSize: 16, color: MUTED }}>
              {`${st.tables} tables · ${st.columns} columns · ${st.relations} relations`}
            </Text>
          </Column>
        </Row>
        <Row style={{ width: W, padding: [16, PAD, 0] }}>
          <Column style={{ width: W - PAD * 2, height: 1, backgroundColor: LINE }} />
        </Row>
        <Row style={{ width: W, padding: [20, PAD, 0], justifyContent: "center" }}>
          <Diagram tables={v.tables} width={W - PAD * 2} height={H - TOP - 70} keysOnly={false} />
        </Row>
      </Canvas>
    );
  },
});
