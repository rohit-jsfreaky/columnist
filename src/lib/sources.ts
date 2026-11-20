// Where a schema comes from: a file, pasted text, a GitHub file link, or one of the bundled real samples.
import { parseSchema, type Schema } from "../../templates/_shared/schema.ts";

export type Loaded = { schema: Schema; project: string; version?: string; source: string };

export const SAMPLES = {
  umami: { file: "/samples/umami-v3.5.0.prisma", project: "Umami", version: "v3.5.0", source: "prisma/schema.prisma" },
  umamiOld: { file: "/samples/umami-v3.4.1.prisma", project: "Umami", version: "v3.4.1", source: "prisma/schema.prisma" },
  umami310: { file: "/samples/umami-v3.1.0.prisma", project: "Umami", version: "v3.1.0", source: "prisma/schema.prisma" },
  umami303: { file: "/samples/umami-v3.0.3.prisma", project: "Umami", version: "v3.0.3", source: "prisma/schema.prisma" },
  pagila: { file: "/samples/pagila-schema.sql", project: "Pagila", version: undefined, source: "pagila-schema.sql" },
};

export async function fromSample(key: keyof typeof SAMPLES): Promise<Loaded> {
  const s = SAMPLES[key];
  const text = await fetch(s.file).then((r) => r.text());
  return { schema: parseSchema(text), project: s.project, version: s.version, source: s.source };
}

export function fromText(text: string, name: string): Loaded {
  const base = name.replace(/\.(prisma|sql)$/i, "");
  return { schema: parseSchema(text), project: base === "schema" ? "Our database" : base, source: name };
}

/**
 * A file on GitHub: github.com/<owner>/<repo>/blob/<ref>/<path> (or its raw link). The project is the repo, the
 * version is the ref when it looks like a tag.
 */
export async function fromGitHub(link: string): Promise<Loaded> {
  const m = link.trim().match(/^https?:\/\/(?:github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/|raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/)([^/]+)\/(.+)$/);
  if (!m) throw new Error("Paste a link to a file on GitHub, like github.com/owner/repo/blob/main/prisma/schema.prisma");
  const [owner, repo, ref, path] = [m[1] ?? m[3], m[2] ?? m[4], m[5], m[6].replace(/[?#].*$/, "")];
  const res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`);
  if (!res.ok) throw new Error(`GitHub answered ${res.status} for ${path} at ${ref}. Is the repository public?`);
  return { schema: parseSchema(await res.text()), project: repo, version: /^v?\d/.test(ref) ? ref : undefined, source: path };
}
