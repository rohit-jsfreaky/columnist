// Renders a schema's values with the same Hyper Elements templates the CLI uses (templates/*.tsx).
// POST { output: "dictionary" | "changes" | "diagram", values } -> a PDF, a PNG, or { html, text }.
// Values a template refuses come back as 422 with the template's own diagnostics.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createElement } from "react";
import { ElementsError, render } from "@hyper-elements/react";
import { renderImage } from "@hyper-elements/react/image";
import { renderPdf } from "@hyper-elements/react/pdf";
import Changes from "@templates/changes";
import Diagram from "@templates/diagram";
import Dictionary from "@templates/dictionary";

type Diagnostic = { severity: string; code: string; message: string; path?: string };

const FONT_FILES: Array<[string, string, number, ("italic" | undefined)?]> = [
  ["Newsreader", "Newsreader-400.woff", 400],
  ["Newsreader", "Newsreader-400-italic.woff", 400, "italic"],
  ["Newsreader", "Newsreader-500.woff", 500],
  ["Newsreader", "Newsreader-600.woff", 600],
  ["IBM Plex Sans", "IBMPlexSans-400.woff", 400],
  ["IBM Plex Sans", "IBMPlexSans-500.woff", 500],
  ["IBM Plex Sans", "IBMPlexSans-600.woff", 600],
  ["IBM Plex Mono", "IBMPlexMono-Regular.ttf", 400],
  ["IBM Plex Mono", "IBMPlexMono-Medium.ttf", 500],
];
let fonts: Promise<Array<{ family: string; src: Buffer; weight: number; style?: "italic" }>> | undefined;
const loadFonts = () =>
  (fonts ??= Promise.all(
    FONT_FILES.map(async ([family, file, weight, style]) => ({ family, weight, ...(style ? { style } : {}), src: await readFile(join(process.cwd(), "fonts", file)) })),
  ));

const brief = (list: readonly unknown[] = []): Diagnostic[] =>
  (list as Diagnostic[]).filter((d) => d.severity === "error" || d.severity === "warning").map(({ severity, code, message, path }) => ({ severity, code, message, path }));

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { output?: string; values?: Record<string, unknown> } | null;
  if (!body?.values || !["dictionary", "changes", "diagram"].includes(body.output ?? "")) {
    return Response.json({ error: 'Send { output: "dictionary" | "changes" | "diagram", values }' }, { status: 400 });
  }
  const { output, values } = body;
  try {
    if (output === "dictionary") {
      const { pdf } = await renderPdf(createElement(Dictionary as never, { ...values, format: "a4" }), { fonts: await loadFonts() });
      return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf" } });
    }
    if (output === "diagram") {
      const { image } = await renderImage(createElement(Diagram as never, { ...values, format: "wide" }), { fonts: await loadFonts() });
      return new Response(new Uint8Array(image), { headers: { "Content-Type": "image/png" } });
    }
    const { html, text, diagnostics } = await render(createElement(Changes as never, values));
    return Response.json({ html, text, diagnostics: brief(diagnostics) });
  } catch (e) {
    if (e instanceof ElementsError) return Response.json({ diagnostics: brief(e.diagnostics) }, { status: 422 });
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
