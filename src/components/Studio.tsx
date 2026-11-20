"use client";

import NextLink from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowLeft, Download01, FileCheck02, SwitchHorizontal01, Image01, Mail01, Minus, Plus, SearchSm, Upload01, XClose } from "@untitledui/icons";
import { layoutDiagram, type Change } from "../../templates/_shared/schema.ts";
import { toValues, type Notes, type TableValue, type Values } from "../../templates/_shared/values.ts";
import { fromGitHub, fromSample, fromText, type Loaded } from "@/lib/sources";
import { Mark } from "./Mark";

type Out = "dictionary" | "changes" | "diagram";
type View = { kind: "diagram" } | { kind: "table"; name: string } | { kind: "changes" };
type Meta = { project: string; version: string; source: string; owner: string; date: string };

const OUTS: Array<{ key: Out; label: string; icon: ReactNode; file: string }> = [
  { key: "dictionary", label: "Dictionary", icon: <FileCheck02 size={16} />, file: "data-dictionary.pdf" },
  { key: "changes", label: "Change email", icon: <Mail01 size={16} />, file: "schema-changes.html" },
  { key: "diagram", label: "Diagram", icon: <Image01 size={16} />, file: "schema-diagram.png" },
];
const notesKey = (project: string) => `columnist:notes:${project.toLowerCase()}`;
const today = () => {
  const d = new Date(); // the person's own date, not UTC's
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function Studio() {
  const [doc, setDoc] = useState<Loaded | null>(null);
  const [before, setBefore] = useState<Loaded | null>(null);
  const [meta, setMeta] = useState<Meta>({ project: "", version: "", source: "", owner: "", date: "" });
  const [notes, setNotes] = useState<Notes>({});
  const [view, setView] = useState<View>({ kind: "diagram" });
  const [sheet, setSheet] = useState<Out | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function open(get: () => Promise<Loaded>, label: string, old?: () => Promise<Loaded>) {
    setBusy(label);
    setError(null);
    try {
      const [d, b] = await Promise.all([get(), old?.()]);
      let saved: Notes = {};
      try {
        saved = JSON.parse(localStorage.getItem(notesKey(d.project)) ?? "{}");
      } catch {}
      let owner = "";
      try {
        owner = localStorage.getItem("columnist:owner") ?? "";
      } catch {}
      setDoc(d);
      setBefore(b ?? null);
      setMeta({ project: d.project, version: d.version ?? "", source: d.source, owner, date: today() });
      setNotes(saved);
      setView(b ? { kind: "changes" } : { kind: "diagram" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function compareWith(get: () => Promise<Loaded>) {
    setError(null);
    try {
      setBefore(await get());
      setView({ kind: "changes" });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    if (!meta.project) return;
    try {
      localStorage.setItem(notesKey(meta.project), JSON.stringify(notes));
      localStorage.setItem("columnist:owner", meta.owner);
    } catch {}
  }, [notes, meta.project, meta.owner]);

  const values = useMemo<Values | null>(
    () =>
      doc
        ? toValues(doc.schema, { project: meta.project || "Our database", version: meta.version, source: meta.source || "schema", date: meta.date || "2026-11-19", owner: meta.owner }, notes, before ? { schema: before.schema, version: before.version || "the earlier version" } : undefined)
        : null,
    [doc, before, meta, notes],
  );

  if (!doc || !values) return <Start busy={busy} error={error} open={open} />;

  const setNote = (key: string, text: string) => setNotes((n) => ({ ...n, [key]: text }));
  const described = values.tables.filter((t) => t.note).length;

  return (
    <div className="h-dvh flex flex-col bg-paper">
      <header className="h-14 shrink-0 border-b border-ink flex items-center gap-3 px-4 md:px-5">
        <NextLink href="/" className="flex items-center gap-2 font-serif text-[21px] font-medium tracking-tight" aria-label="Columnist home">
          <Mark /> <span className="max-[400px]:hidden">Columnist</span>
        </NextLink>
        <span className="hidden md:block h-5 w-px bg-line" />
        <span className="hidden md:inline kicker !normal-case truncate">
          {meta.source} · {doc.schema.dialect === "prisma" ? "Prisma" : "PostgreSQL"}
        </span>
        <div className="flex-1" />
        <div className="hidden lg:flex gap-2">
          {OUTS.map((o) => (
            <button key={o.key} className={`btn ${o.key === "dictionary" ? "btn-ink" : "btn-line"}`} onClick={() => setSheet(o.key)}>
              {o.icon} {o.label}
            </button>
          ))}
        </div>
        <div className="flex lg:hidden gap-1.5">
          {OUTS.map((o) => (
            <button key={o.key} className={`btn !px-2.5 ${o.key === "dictionary" ? "btn-ink" : "btn-line"}`} onClick={() => setSheet(o.key)} aria-label={o.label}>
              {o.icon}
            </button>
          ))}
        </div>
        <button className="btn btn-line max-sm:!px-2.5" onClick={() => setDoc(null)} aria-label="Open another schema">
          <ArrowLeft size={16} /> <span className="hidden sm:inline">Another schema</span>
        </button>
      </header>

      <div className="flex-1 min-h-0 grid md:grid-cols-[280px_1fr]">
        <Sidebar values={values} meta={meta} setMeta={setMeta} view={view} setView={setView} described={described} />

        <main className="min-w-0 min-h-0 flex flex-col">
          <div className="shrink-0 border-b border-line px-4 md:px-6 flex items-end gap-6 overflow-x-auto overflow-y-hidden">
            <Tab on={view.kind === "diagram"} onClick={() => setView({ kind: "diagram" })}>
              Diagram
            </Tab>
            <Tab on={view.kind === "table"} onClick={() => setView({ kind: "table", name: view.kind === "table" ? view.name : values.tables[0].name })}>
              Tables
            </Tab>
            <Tab on={view.kind === "changes"} onClick={() => setView({ kind: "changes" })}>
              Changes {before ? <span className="ml-1 font-mono text-[11.5px] text-muted">{values.changes.length}</span> : null}
            </Tab>
          </div>
          {error ? (
            <p className="mx-6 mt-4 flex gap-2 rounded bg-red-soft px-4 py-3 text-[13px] text-ink-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red" /> {error}
            </p>
          ) : null}
          <div className="flex-1 min-h-0 overflow-auto scroll-thin">
            {view.kind === "diagram" ? (
              <DiagramView tables={values.tables} onPick={(name) => setView({ kind: "table", name })} />
            ) : view.kind === "table" ? (
              <TableView key={view.name} values={values} name={view.name} notes={notes} setNote={setNote} onPick={(name) => setView({ kind: "table", name })} />
            ) : (
              <ChangesView values={values} before={before} compareWith={compareWith} onPick={(name) => setView({ kind: "table", name })} clear={() => setBefore(null)} />
            )}
          </div>
        </main>
      </div>

      {sheet ? <Sheet out={sheet} setOut={setSheet} values={values} onClose={() => setSheet(null)} /> : null}
    </div>
  );
}

/* ---------- start ---------- */

function Start({ busy, error, open }: { busy: string | null; error: string | null; open: (get: () => Promise<Loaded>, label: string, old?: () => Promise<Loaded>) => void }) {
  const [link, setLink] = useState("");
  const [paste, setPaste] = useState("");
  const file = useRef<HTMLInputElement>(null);
  return (
    <div className="min-h-dvh dots grid place-items-center p-4 md:p-8">
      <div className="w-full max-w-[720px] bg-paper border border-ink shadow-[0_30px_60px_-34px_rgb(20_23_28/0.35)]">
        <div className="px-6 md:px-8 pt-6 pb-5 border-b border-ink">
          <div className="flex items-center justify-between">
            <NextLink href="/" className="flex items-center gap-2 font-serif text-[21px] font-medium">
              <Mark /> Columnist
            </NextLink>
            <span className="kicker">Prisma · PostgreSQL</span>
          </div>
          <h1 className="mt-6 font-serif text-[34px] md:text-[40px] leading-[1.08] tracking-tight">Which database are we writing up?</h1>
          <p className="mt-2 text-[14.5px] text-muted leading-relaxed">
            A <code className="font-mono text-[13px]">schema.prisma</code>, or a <code className="font-mono text-[13px]">pg_dump --schema-only</code> file. It&apos;s read in your browser.
          </p>
        </div>
        <div className="p-6 md:p-8 space-y-6">
          <div>
            <p className="kicker mb-2">Real schemas to try</p>
            <div className="grid sm:grid-cols-2 gap-2">
              <SampleButton title="Umami v3.5.0" sub="Prisma · 29 tables · released 12 Nov 2026" onClick={() => open(() => fromSample("umami"), "Umami")} />
              <SampleButton title="Pagila" sub="pg_dump · PostgreSQL · 16 tables" onClick={() => open(() => fromSample("pagila"), "Pagila")} />
              <SampleButton title="Umami v3.4.1 → v3.5.0" sub="The last release: three new tables" onClick={() => open(() => fromSample("umami"), "Umami", () => fromSample("umamiOld"))} />
              <SampleButton title="Umami v3.0.3 → v3.1.0" sub="A column removed, sharing moved to a new table" onClick={() => open(() => fromSample("umami310"), "Umami", () => fromSample("umami303"))} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            <button onClick={() => file.current?.click()} className="flex items-center justify-center gap-2 border border-ink hover:bg-wash py-3 text-[14px] font-medium transition-colors">
              <Upload01 size={16} /> Upload a schema file
            </button>
            <input
              ref={file}
              type="file"
              accept=".prisma,.sql,text/plain"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const text = await f.text();
                  open(async () => fromText(text, f.name), f.name);
                }
              }}
            />
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (link.trim()) open(() => fromGitHub(link), "GitHub");
              }}
            >
              <input className="input font-mono !text-[12.5px]" placeholder="github.com/…/blob/main/schema.prisma" value={link} onChange={(e) => setLink(e.target.value)} aria-label="GitHub file link" />
              <button className="btn btn-ink" disabled={!!busy}>
                Read
              </button>
            </form>
          </div>
          <details className="group">
            <summary className="cursor-pointer list-none text-[13.5px] font-medium text-ink-2 hover:text-ink">+ Or paste it</summary>
            <textarea className="input mt-2 h-36 font-mono !text-[12px]" placeholder={'model User {\n  id    Int    @id\n  email String @unique\n}'} value={paste} onChange={(e) => setPaste(e.target.value)} />
            <button className="btn btn-ink mt-2" disabled={!paste.trim()} onClick={() => open(async () => fromText(paste, "schema"), "pasted schema")}>
              Read it
            </button>
          </details>
          {busy ? <p className="text-[13px] text-muted font-mono">Reading {busy}…</p> : null}
          {error ? (
            <p className="text-[13px] text-red flex gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SampleButton({ title, sub, onClick }: { title: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left border border-line hover:border-ink p-3.5 transition-colors">
      <span className="block font-serif text-[17px] leading-tight">{title}</span>
      <span className="block mt-1 text-[12px] text-muted">{sub}</span>
    </button>
  );
}

/* ---------- sidebar ---------- */

function Sidebar({ values, meta, setMeta, view, setView, described }: { values: Values; meta: Meta; setMeta: (m: Meta) => void; view: View; setView: (v: View) => void; described: number }) {
  const [q, setQ] = useState("");
  const shown = values.tables.filter((t) => t.name.includes(q.toLowerCase()) || t.alias?.toLowerCase().includes(q.toLowerCase()));
  return (
    <aside className="hidden md:flex flex-col min-h-0 border-r border-line bg-wash/70">
      <div className="p-4 border-b border-line space-y-2.5">
        <p className="kicker !text-ink">The document</p>
        <div className="grid grid-cols-[1fr_96px] gap-2">
          <Field label="Project" value={meta.project} onChange={(v) => setMeta({ ...meta, project: v })} />
          <Field label="Version" value={meta.version} onChange={(v) => setMeta({ ...meta, version: v })} placeholder="v1.0" />
        </div>
        <Field label="Kept by" value={meta.owner} onChange={(v) => setMeta({ ...meta, owner: v })} placeholder="Team or person" />
      </div>
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-baseline justify-between">
          <p className="kicker !text-ink">{values.tables.length} tables</p>
          <p className="text-[12px] text-muted">
            {described} described
          </p>
        </div>
        <div className="mt-2 h-1 bg-line">
          <div className="h-1 bg-green" style={{ width: `${(described / values.tables.length) * 100}%` }} />
        </div>
        <label className="mt-3 flex items-center gap-2 input !py-1.5">
          <SearchSm size={15} className="text-muted shrink-0" />
          <input className="w-full outline-none bg-transparent text-[13px]" placeholder="Find a table" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      <ul className="flex-1 min-h-0 overflow-y-auto scroll-thin px-2 pb-4">
        {shown.map((t) => {
          const on = view.kind === "table" && view.name === t.name;
          return (
            <li key={t.name}>
              <button onClick={() => setView({ kind: "table", name: t.name })} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left ${on ? "bg-ink text-white" : "hover:bg-paper"}`}>
                <span className={`size-1.5 rounded-full shrink-0 ${t.note ? "bg-green" : on ? "bg-white/40" : "bg-rule"}`} title={t.note ? "Described" : "No description yet"} />
                <span className="flex-1 min-w-0 truncate font-mono text-[12.5px]">{t.name}</span>
                <span className={`font-mono text-[11px] ${on ? "text-white/70" : "text-faint"}`}>{t.columns.length}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

/* ---------- diagram ---------- */

function DiagramView({ tables, onPick }: { tables: TableValue[]; onPick: (name: string) => void }) {
  const d = useMemo(() => layoutDiagram(tables.map((t) => ({ name: t.name, columns: t.columns })), { aspect: 1.6 }), [tables]);
  const [zoom, setZoom] = useState(0.85);
  const [hover, setHover] = useState<string | null>(null);
  const pad = 24;
  return (
    <div className="relative min-h-full dots">
      <div className="sticky top-3 z-10 flex justify-end px-4 pointer-events-none">
        <div className="pointer-events-auto flex items-center border border-rule bg-paper shadow-sm">
          <button className="p-2 hover:bg-wash" onClick={() => setZoom((z) => Math.max(0.35, +(z - 0.15).toFixed(2)))} aria-label="Zoom out">
            <Minus size={15} />
          </button>
          <span className="w-12 text-center font-mono text-[12px]">{Math.round(zoom * 100)}%</span>
          <button className="p-2 hover:bg-wash" onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.15).toFixed(2)))} aria-label="Zoom in">
            <Plus size={15} />
          </button>
        </div>
      </div>
      <svg width={(d.width + pad * 2) * zoom} height={(d.height + pad * 2) * zoom} viewBox={`${-pad} ${-pad} ${d.width + pad * 2} ${d.height + pad * 2}`} className="block -mt-8" role="img" aria-label={`Diagram of ${tables.length} tables`}>
        {d.edges.map((e, i) => {
          const lit = hover && (e.from === hover || e.to === hover);
          return <path key={i} d={e.d} fill="none" stroke={lit ? "var(--green)" : "var(--rule)"} strokeWidth={lit ? 2 : 1.1} />;
        })}
        {d.boxes.map((b) => (
          <g key={b.name} className="cursor-pointer" onClick={() => onPick(b.name)} onMouseEnter={() => setHover(b.name)} onMouseLeave={() => setHover(null)}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={3} fill="var(--paper)" stroke={hover === b.name ? "var(--green)" : "var(--ink)"} strokeWidth={hover === b.name ? 2 : 1} />
            <path d={`M${b.x} ${b.y + 26}V${b.y + 3}a3 3 0 0 1 3-3H${b.x + b.w - 3}a3 3 0 0 1 3 3V${b.y + 26}Z`} fill="var(--ink)" />
            <text x={b.x + 9} y={b.y + 17} fill="#fff" fontFamily="var(--font-plex-mono)" fontSize={11} fontWeight={500}>
              {b.name}
            </text>
            {b.rows.map((r, i) => (
              <g key={r.name} fontFamily="var(--font-plex-mono)">
                <text x={b.x + 9} y={b.y + 26 + i * 16 + 12} fontSize={7.5} fill="var(--green)">
                  {r.key === "pkfk" ? "PF" : r.key.toUpperCase()}
                </text>
                <text x={b.x + 27} y={b.y + 26 + i * 16 + 12} fontSize={10.5} fill="var(--ink)">
                  {r.name.length > 20 ? `${r.name.slice(0, 19)}…` : r.name}
                </text>
                <text x={b.x + b.w - 8} y={b.y + 26 + i * 16 + 12} fontSize={9} fill="var(--muted)" textAnchor="end">
                  {r.type.length > 13 ? `${r.type.slice(0, 12)}…` : r.type}
                </text>
              </g>
            ))}
            {b.more ? (
              <text x={b.x + 9} y={b.y + 26 + b.rows.length * 16 + 12} fontSize={9.5} fill="var(--muted)">
                + {b.more} more
              </text>
            ) : null}
          </g>
        ))}
        {d.edges.map((e, i) => (
          <circle key={`c${i}`} cx={e.end[0]} cy={e.end[1]} r={2.6} fill="var(--green)" />
        ))}
      </svg>
    </div>
  );
}

/* ---------- one table ---------- */

function TableView({ values, name, notes, setNote, onPick }: { values: Values; name: string; notes: Notes; setNote: (k: string, v: string) => void; onPick: (n: string) => void }) {
  const t = values.tables.find((x) => x.name === name) ?? values.tables[0];
  const usedBy = values.tables.flatMap((o) => o.columns.filter((c) => c.ref?.startsWith(`${t.name}.`)).map((c) => ({ table: o.name, column: c.name })));
  return (
    <article className="px-4 md:px-8 py-6 max-w-[1180px]">
      <select className="input md:hidden mb-4 font-mono" value={t.name} onChange={(e) => onPick(e.target.value)} aria-label="Table">
        {values.tables.map((x) => (
          <option key={x.name}>{x.name}</option>
        ))}
      </select>
      <div className="border-t-[3px] border-ink pt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="font-serif text-[34px] leading-tight tracking-tight">{t.name}</h2>
        {t.alias ? <span className="font-mono text-[12.5px] text-muted">model {t.alias}</span> : null}
        <div className="flex-1" />
        <span className="kicker">
          {t.columns.length} columns{t.indexes ? ` · ${t.indexes} indexes` : ""}
          {t.partitions ? ` · ${t.partitions} partitions` : ""}
        </span>
      </div>
      <textarea
        className="note mt-2 !text-[16px] font-serif leading-snug resize-none"
        rows={2}
        maxLength={400}
        placeholder="What does this table hold? Write it once; it goes in the dictionary."
        value={notes[t.name] ?? t.note ?? ""}
        onChange={(e) => setNote(t.name, e.target.value)}
        aria-label={`What ${t.name} holds`}
      />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-[13px]">
          <thead>
            <tr className="border-b border-ink text-left">
              {["Column", "Type", "Empty", "Default", "Key", "What it means"].map((h) => (
                <th key={h} className="kicker font-normal py-2 pr-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.columns.map((c) => {
              const k = `${t.name}.${c.name}`;
              return (
                <tr key={c.name} className="border-b border-line align-top">
                  <td className="py-2 pr-3 font-mono text-[12.5px]">
                    {c.name}
                    {c.alias ? <span className="block text-[11px] text-faint">{c.alias}</span> : null}
                  </td>
                  <td className="py-2 pr-3 font-mono text-[12px] text-ink-2">{c.type}</td>
                  <td className="py-2 pr-3 text-[12.5px] text-muted">{c.nullable ? "yes" : "no"}</td>
                  <td className="py-2 pr-3 font-mono text-[12px] text-ink-2 max-w-[180px] break-words">{c.default ?? ""}</td>
                  <td className="py-2 pr-3 font-mono text-[12px] text-green">
                    {c.key?.includes("pk") ? "PK " : ""}
                    {c.unique ? "UNIQUE " : ""}
                    {c.ref ? (
                      <button className="underline underline-offset-2 hover:text-ink" onClick={() => onPick(c.ref!.split(".")[0])}>
                        → {c.ref}
                      </button>
                    ) : null}
                  </td>
                  <td className="py-1 w-[34%]">
                    <input className="note" maxLength={240} placeholder="Add a note" value={notes[k] ?? c.note ?? ""} onChange={(e) => setNote(k, e.target.value)} aria-label={`What ${c.name} means`} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {usedBy.length ? (
        <div className="mt-6">
          <p className="kicker !text-ink">Pointed to by</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {usedBy.map((u) => (
              <button key={`${u.table}.${u.column}`} onClick={() => onPick(u.table)} className="font-mono text-[12px] border border-line hover:border-ink px-2 py-1">
                {u.table}.{u.column}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

/* ---------- changes ---------- */

const LEVELS: Array<{ level: Change["level"]; name: string; tone: string; why: string }> = [
  { level: "breaking", name: "Could break queries", tone: "text-red bg-red-soft", why: "Queries and dashboards that use these fail or change." },
  { level: "check", name: "Worth a check", tone: "text-amber bg-amber-soft", why: "Queries still run; results or assumptions may change." },
  { level: "added", name: "New", tone: "text-green bg-green-soft", why: "Nothing existing changes." },
];

function ChangesView({ values, before, compareWith, onPick, clear }: { values: Values; before: Loaded | null; compareWith: (g: () => Promise<Loaded>) => void; onPick: (n: string) => void; clear: () => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState("");
  if (!before)
    return (
      <div className="px-4 md:px-8 py-10 max-w-[640px]">
        <SwitchHorizontal01 size={22} className="text-muted" />
        <h2 className="mt-3 font-serif text-[30px] leading-tight">Compare with the version before</h2>
        <p className="mt-2 text-[14.5px] text-muted leading-relaxed">
          Load the schema as it was at the last release. Columnist lists what could break queries, what to check and what&apos;s new, and writes the email for the people who read the database.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button className="btn btn-ink" onClick={() => file.current?.click()}>
            <Upload01 size={16} /> Upload the older file
          </button>
          {values.project === "Umami" && values.version === "v3.5.0" ? (
            <button className="btn btn-line" onClick={() => compareWith(() => fromSample("umamiOld"))}>
              Umami v3.4.1
            </button>
          ) : null}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (link.trim()) compareWith(() => fromGitHub(link));
          }}
        >
          <input className="input font-mono !text-[12.5px]" placeholder="github.com/…/blob/v1.2.0/schema.prisma" value={link} onChange={(e) => setLink(e.target.value)} aria-label="Older version on GitHub" />
          <button className="btn btn-line">Read</button>
        </form>
        <input
          ref={file}
          type="file"
          accept=".prisma,.sql,text/plain"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) {
              const text = await f.text();
              compareWith(async () => ({ ...fromText(text, f.name), version: f.name }));
            }
          }}
        />
      </div>
    );
  const count = (l: Change["level"]) => values.changes.filter((c) => c.level === l).length;
  return (
    <div className="px-4 md:px-8 py-6 max-w-[980px]">
      <div className="border-t-[3px] border-ink pt-3 flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <h2 className="font-serif text-[30px] leading-tight">
          {values.compare} → {values.version || "this version"}
        </h2>
        <div className="flex-1" />
        <button className="text-[13px] text-muted hover:text-ink underline underline-offset-2" onClick={clear}>
          Compare with another
        </button>
      </div>
      <p className="mt-1 font-serif text-[19px] text-ink-2">
        {!values.changes.length ? "No changes to tables or columns." : count("breaking") ? `${count("breaking")} could break queries that read these tables.` : "Nothing here breaks existing queries."}
      </p>
      <div className="mt-5 grid grid-cols-3 border border-line">
        {LEVELS.map((l) => (
          <div key={l.level} className="p-4 border-r last:border-r-0 border-line">
            <p className="font-serif text-[32px] leading-none">{count(l.level)}</p>
            <p className="mt-1 text-[12.5px] text-muted">{l.name}</p>
          </div>
        ))}
      </div>
      {LEVELS.filter((l) => count(l.level)).map((l) => (
        <section key={l.level} className="mt-7">
          <div className="flex items-center gap-2">
            <span className={`kicker !text-[11px] px-1.5 py-0.5 rounded-sm ${l.tone}`}>{l.name}</span>
            <span className="text-[12.5px] text-muted">{l.why}</span>
          </div>
          <ul className="mt-2 border-t border-ink">
            {values.changes
              .filter((c) => c.level === l.level)
              .map((c, i) => (
                <li key={i} className="grid sm:grid-cols-[minmax(0,260px)_1fr] gap-x-4 gap-y-0.5 py-2.5 border-b border-line text-[13.5px]">
                  <button onClick={() => (values.tables.some((t) => t.name === c.table) ? onPick(c.table) : null)} className="text-left font-mono text-[12.5px] truncate hover:underline">
                    {c.column ? `${c.table}.${c.column}` : c.table}
                  </button>
                  <span>{c.what}</span>
                </li>
              ))}
          </ul>
        </section>
      ))}
      <p className="mt-5 text-[12.5px] text-muted">A renamed column shows as one removed and one added: the old name stops working in queries either way.</p>
    </div>
  );
}

/* ---------- outputs ---------- */

function Sheet({ out, setOut, values, onClose }: { out: Out; setOut: (o: Out) => void; values: Values; onClose: () => void }) {
  const [view, setView] = useState<{ url?: string; html?: string; issues?: string[] } | null>(null);
  const key = JSON.stringify(values);
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      const res = await fetch("/api/render", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ output: out, values }) });
      const type = res.headers.get("Content-Type") ?? "";
      const next = type.includes("json")
        ? await res.json().then((j) => (res.ok ? { html: j.html as string } : { issues: (j.diagnostics ?? [{ message: j.error }]).map((d: { message: string; path?: string }) => `${d.path ? `${d.path.replace(/^values\./, "")}: ` : ""}${d.message}`) }))
        : { url: URL.createObjectURL(await res.blob()) };
      if (!alive) return;
      setView((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url);
        return next;
      });
    }, 150);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [out, key]);

  async function download() {
    const res = await fetch("/api/render", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ output: out, values }) });
    if (!res.ok) return;
    const a = document.createElement("a");
    a.href = out === "changes" ? URL.createObjectURL(new Blob([(await res.json()).html], { type: "text/html" })) : URL.createObjectURL(await res.blob());
    a.download = `${`${values.project}-${values.version ?? ""}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "")}-${OUTS.find((o) => o.key === out)!.file}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/30" onClick={onClose}>
      <div className="w-full md:w-[min(1100px,94vw)] h-full bg-paper border-l border-ink flex flex-col shadow-[-30px_0_60px_-30px_rgb(20_23_28/0.4)]" onClick={(e) => e.stopPropagation()}>
        <div className="h-14 shrink-0 border-b border-line flex items-center gap-1 sm:gap-2 px-3 sm:px-5">
          {OUTS.map((o) => (
            <button key={o.key} onClick={() => o.key !== out && (setOut(o.key), setView(null))} className={`px-3 py-1.5 rounded text-[13.5px] font-medium ${out === o.key ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>
              {o.label}
            </button>
          ))}
          <div className="flex-1" />
          <button className="btn btn-ink" onClick={() => void download()} aria-label="Download">
            <Download01 size={16} /> <span className="hidden sm:inline">Download</span>
          </button>
          <button className="text-muted hover:text-ink ml-1" onClick={onClose} aria-label="Close">
            <XClose size={20} />
          </button>
        </div>
        <div className="flex-1 min-h-0 bg-wash flex">
          {view?.issues ? (
            <div className="m-6 rounded bg-red-soft p-4 space-y-1 self-start">
              <p className="font-semibold text-red text-[14px]">The template refused these values</p>
              {view.issues.map((m) => (
                <p key={m} className="text-[13px]">
                  {m}
                </p>
              ))}
            </div>
          ) : view?.url && out === "dictionary" ? (
            <iframe title="Data dictionary" src={view.url} className="flex-1" />
          ) : view?.url ? (
            <div className="flex-1 grid place-items-center p-6 overflow-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={view.url} alt="Schema diagram" className="max-w-full border border-line shadow-[0_20px_40px_-20px_rgb(20_23_28/0.35)]" />
            </div>
          ) : view?.html ? (
            <iframe title="Change email" srcDoc={view.html} className="flex-1" />
          ) : (
            <p className="m-auto text-[14px] text-muted">Rendering with Hyper Elements…</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- small pieces ---------- */

function Tab({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className={`py-3 -mb-px border-b-2 text-[14px] font-medium whitespace-nowrap ${on ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}>
      {children}
    </button>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11.5px] font-medium text-ink-2">{label}</span>
      <input className="input !py-1.5 !text-[13px]" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
