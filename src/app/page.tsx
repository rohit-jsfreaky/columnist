import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, ArrowUpRight, FileCheck02, Image01, Mail01 } from "@untitledui/icons";
import { Mark } from "@/components/Mark";

const WRAP = "mx-auto max-w-[1200px] px-6";

export default function Home() {
  return (
    <div className="bg-paper text-ink">
      <Masthead />
      <Hero />
      <Problem />
      <How />
      <Outputs />
      <Changes />
      <Reads />
      <Faq />
      <Close />
    </div>
  );
}

function Masthead() {
  return (
    <header className="sticky top-0 z-30 bg-paper/92 backdrop-blur border-b border-ink">
      <div className={`${WRAP} h-16 flex items-center gap-4 md:gap-8`}>
        <Link href="/" className="flex items-center gap-2 font-serif text-[23px] font-medium tracking-tight">
          <Mark /> Columnist
        </Link>
        <nav className="hidden md:flex gap-6 text-[14px] text-muted">
          <a href="#problem" className="hover:text-ink">Why</a>
          <a href="#how" className="hover:text-ink">How it works</a>
          <a href="#outputs" className="hover:text-ink">What you send</a>
          <a href="#changes" className="hover:text-ink">Changes</a>
          <a href="#faq" className="hover:text-ink">FAQ</a>
        </nav>
        <div className="flex-1" />
        <Link href="/studio" className="btn btn-ink">
          <span className="hidden sm:inline">Write up a schema</span>
          <span className="sm:hidden">Start</span> <ArrowRight size={16} />
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="border-b border-ink">
      <div className={`${WRAP} pt-10 md:pt-14`}>
        <div className="flex flex-wrap justify-between gap-2 border-y border-ink py-2 kicker">
          <span>For backend developers and the people who query their database</span>
          <span>Prisma · PostgreSQL · free and open source</span>
        </div>
        <div className="mt-10 md:mt-14 grid md:grid-cols-[1.35fr_1fr] gap-10 items-end">
          <h1 className="font-serif text-[56px] md:text-[96px] leading-[0.96] tracking-[-0.03em]">
            Every column, <em className="text-green">explained.</em>
          </h1>
          <div>
            <p className="text-[18px] leading-relaxed text-ink-2">
              Drop your <code className="font-mono text-[15px]">schema.prisma</code> or a <code className="font-mono text-[15px]">pg_dump</code>. Columnist writes the data dictionary your analysts keep asking for, draws the diagram, and tells them what the next migration changes.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/studio" className="btn btn-ink !px-5 !py-3 !text-[15px]">
                Write up a schema <ArrowRight size={17} />
              </Link>
              <a href="/landing/umami-dictionary.pdf" className="btn btn-line !px-5 !py-3 !text-[15px]">
                Sample dictionary (PDF)
              </a>
            </div>
          </div>
        </div>
        <figure className="mt-12 border border-ink border-b-0 bg-paper p-1.5 pb-0">
          <Image src="/landing/diagram-view.png" alt="Columnist reading Umami's real Prisma schema: 29 tables drawn as a diagram, with the table list and the document details on the left" width={1440} height={900} priority className="w-full h-auto" />
        </figure>
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section id="problem" className="border-b border-line">
      <div className={`${WRAP} py-20 md:py-28`}>
        <Kicker n="01" text="Why" />
        <blockquote className="mt-6 font-serif text-[36px] md:text-[60px] leading-[1.05] tracking-[-0.02em] max-w-[1000px]">
          &ldquo;Who is responsible for maintaining a data dictionary?&hellip; nobody. <span className="text-green">Nobody ever maintains the data dictionary.</span>&rdquo;
        </blockquote>
        <p className="mt-5 text-[14px] text-muted">
          A data engineer on{" "}
          <a className="underline underline-offset-2 hover:text-ink" href="https://old.reddit.com/r/dataengineering/comments/sq8mio/">
            r/dataengineering
          </a>
          , February 2022.
        </p>
        <div className="mt-14 grid md:grid-cols-3 border-t border-ink">
          <Col title="The schema is already the truth">
            Every table, type, key and default is in your <code className="font-mono text-[13px]">schema.prisma</code> or your database. A dictionary written by hand drifts from it the day after the next migration.
          </Col>
          <Col title="YAML is not a document">
            Analysts, support and auditors don&apos;t read code. As another reply in the same thread put it: &ldquo;If I asked someone where their data dictionary is and they sent me a folder of YAML I&apos;d be throwing hands.&rdquo;
          </Col>
          <Col title="Migrations break dashboards quietly">
            A removed column doesn&apos;t fail in your app&apos;s tests. It fails in someone&apos;s Monday report. The people downstream need to hear about it before it ships.
          </Col>
        </div>
      </div>
    </section>
  );
}

function Col({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="pt-5 pb-2 md:pr-8 md:[&:not(:first-child)]:pl-8 md:[&:not(:last-child)]:border-r border-line">
      <h3 className="font-serif text-[22px] leading-tight">{title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{children}</p>
    </div>
  );
}

function How() {
  const steps = [
    ["Read", "Upload the file, paste it, or link it on GitHub. Prisma models, mapped names, native types, relations and doc comments; or a pg_dump with its keys, indexes, partitions and comments."],
    ["Describe", "Say what each table holds and what the tricky columns mean, right next to them. Notes stay in your browser, and comments in the schema come in on their own."],
    ["Send", "Download the dictionary PDF, the diagram as an image, and the change email for the people who query the database."],
  ];
  return (
    <section id="how" className="border-b border-line bg-wash">
      <div className={`${WRAP} py-20 md:py-28`}>
        <Kicker n="02" text="How it works" />
        <h2 className="mt-4 font-serif text-[40px] md:text-[60px] leading-[1.02] tracking-[-0.02em] max-w-[820px]">Your schema in, a document people read out.</h2>
        <ol className="mt-12 grid md:grid-cols-3 gap-px bg-ink border border-ink">
          {steps.map(([t, d], i) => (
            <li key={t} className="bg-paper p-6 md:p-7">
              <span className="font-mono text-[12px] text-green">No. {i + 1}</span>
              <h3 className="mt-3 font-serif text-[30px] leading-none">{t}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{d}</p>
            </li>
          ))}
        </ol>
        <figure className="mt-6 border border-ink bg-paper p-1.5">
          <Image src="/landing/table-view.png" alt="One table, website, with its note and every column: type, whether it can be empty, default, key and a note" width={1440} height={900} className="w-full h-auto" />
        </figure>
      </div>
    </section>
  );
}

function Outputs() {
  return (
    <section id="outputs" className="border-b border-line">
      <div className={`${WRAP} py-20 md:py-28`}>
        <Kicker n="03" text="What you send" />
        <h2 className="mt-4 font-serif text-[40px] md:text-[60px] leading-[1.02] tracking-[-0.02em] max-w-[860px]">Three documents from one schema.</h2>
        <p className="mt-4 text-[17px] text-ink-2 max-w-[720px] leading-relaxed">Rendered by shared Hyper Elements templates, in the app or from the command line, with the same numbers in each.</p>
        <div className="mt-12 grid md:grid-cols-12 gap-px bg-ink border border-ink">
          <Tile className="md:col-span-12" icon={<FileCheck02 size={17} />} name="The data dictionary" note="A4 landscape PDF · contents, the diagram, then every table and column">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                ["dict-1", "Cover: 29 tables, 259 columns, 30 relations, and the contents with page numbers"],
                ["dict-2", "How the tables connect: the key columns of every table, with each foreign key drawn to what it points to"],
                ["dict-3", "A table page: every column with its type, default, key and what it means"],
              ].map(([f, alt]) => (
                <Image key={f} src={`/landing/${f}.png`} alt={alt} width={1754} height={1241} className="w-full h-auto border border-line shadow-[0_14px_30px_-20px_rgb(20_23_28/0.4)]" />
              ))}
            </div>
          </Tile>
          <Tile className="md:col-span-7" icon={<Image01 size={17} />} name="The diagram" note="1600 × 1000 PNG · for a README, a wiki page or a pull request">
            <Image src="/landing/diagram.png" alt="Umami's 29 tables as a diagram, up to eight columns each, keys first" width={1600} height={1000} className="w-full h-auto border border-line" />
          </Tile>
          <Tile className="md:col-span-5" icon={<Mail01 size={17} />} name="The change email" note="To the people who query the database">
            <div className="h-[290px] overflow-hidden border border-line bg-wash">
              <Image src="/landing/email.png" alt="Email: Umami v3.0.3 to v3.1.0, one change could break queries, eleven new" width={745} height={1020} className="w-full h-auto" />
            </div>
          </Tile>
        </div>
      </div>
    </section>
  );
}

function Tile({ className = "", icon, name, note, children }: { className?: string; icon: ReactNode; name: string; note: string; children: ReactNode }) {
  return (
    <div className={`min-w-0 bg-paper p-5 md:p-6 flex flex-col gap-5 ${className}`}>
      <div className="flex items-center gap-3">
        <span className="grid place-items-center size-8 border border-ink rounded-sm">{icon}</span>
        <div>
          <p className="font-serif text-[20px] leading-none">{name}</p>
          <p className="mt-1 text-[12.5px] text-muted">{note}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

const UMAMI_31 = [
  ["breaking", "website.share_id", "Column removed"],
  ["added", "share", "New table, 8 columns"],
  ["added", "board", "New table, 9 columns"],
  ["added", "session_replay", "New table, 10 columns"],
  ["added", "website_event.lcp", "New column, decimal(10, 1), nullable"],
  ["added", "website_event.inp", "New column, decimal(10, 1), nullable"],
] as const;

function Changes() {
  return (
    <section id="changes" className="border-b border-line bg-wash">
      <div className={`${WRAP} py-20 md:py-28 grid md:grid-cols-[1fr_1.1fr] gap-12 items-start`}>
        <div>
          <Kicker n="04" text="Before it breaks a dashboard" />
          <h2 className="mt-4 font-serif text-[40px] md:text-[56px] leading-[1.02] tracking-[-0.02em]">Compare two versions. Tell the people downstream.</h2>
          <p className="mt-5 text-[17px] leading-relaxed text-ink-2">
            Load the schema from the last release next to this one. Columnist sorts every difference by what it does to someone&apos;s query: what could break it, what&apos;s worth a check, and what&apos;s simply new. Then it writes the email.
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            The real example on the right: Umami v3.1.0 (April 2026) moved sharing out of <code className="font-mono text-[13px]">website.share_id</code> into a new <code className="font-mono text-[13px]">share</code> table. Any report joining on that column stopped working.
          </p>
        </div>
        <div className="bg-paper border border-ink">
          <div className="px-5 py-3 border-b border-ink flex justify-between kicker">
            <span>Umami v3.0.3 → v3.1.0</span>
            <span>12 changes</span>
          </div>
          <ul>
            {UMAMI_31.map(([level, name, what]) => (
              <li key={name} className="grid grid-cols-[92px_minmax(0,1fr)] sm:grid-cols-[110px_minmax(0,220px)_1fr] gap-x-3 gap-y-0.5 px-5 py-3 border-b border-line last:border-0 items-baseline">
                <span className={`kicker !text-[10.5px] justify-self-start px-1.5 py-0.5 rounded-sm ${level === "breaking" ? "!text-red bg-red-soft" : "!text-green bg-green-soft"}`}>{level === "breaking" ? "Could break" : "New"}</span>
                <span className="font-mono text-[13px] truncate">{name}</span>
                <span className="col-start-2 sm:col-start-auto text-[13.5px] text-ink-2">{what}</span>
              </li>
            ))}
          </ul>
          <p className="px-5 py-3 border-t border-ink text-[12.5px] text-muted">…and 6 more new columns and tables. Read from Umami&apos;s prisma/schema.prisma at both tags.</p>
        </div>
      </div>
    </section>
  );
}

function Reads() {
  return (
    <section className="border-b border-line">
      <div className={`${WRAP} py-20 md:py-28`}>
        <Kicker n="05" text="What it reads" />
        <h2 className="mt-4 font-serif text-[40px] md:text-[56px] leading-[1.02] tracking-[-0.02em] max-w-[860px]">The file you already have.</h2>
        <div className="mt-12 grid md:grid-cols-2 gap-px bg-ink border border-ink">
          <Source title="Prisma" file="schema.prisma" code={`/// A site being tracked.\nmodel Website {\n  id     String  @id @map("website_id") @db.Uuid\n  name   String  @db.VarChar(100)\n  userId String? @map("user_id") @db.Uuid\n  user   User?   @relation(fields: [userId], references: [id])\n  @@map("website")\n}`}>
            Models and views, <code className="font-mono">@map</code> and <code className="font-mono">@@map</code> names, native types, defaults, <code className="font-mono">@id</code>, <code className="font-mono">@@id</code>, <code className="font-mono">@@unique</code>, <code className="font-mono">@@index</code>, relations, enums and <code className="font-mono">{"///"}</code> doc comments.
          </Source>
          <Source title="PostgreSQL" file="pg_dump --schema-only" code={`CREATE TABLE public.film (\n    film_id integer DEFAULT nextval('public.film_film_id_seq'::regclass) NOT NULL,\n    title text NOT NULL,\n    rating public.mpaa_rating DEFAULT 'G'::public.mpaa_rating\n);\nALTER TABLE ONLY public.film\n    ADD CONSTRAINT film_pkey PRIMARY KEY (film_id);\nCOMMENT ON TABLE public.film IS 'One title in the catalogue';`}>
            <code className="font-mono">CREATE TABLE</code>, keys and foreign keys added with <code className="font-mono">ALTER TABLE</code>, indexes, enums and <code className="font-mono">COMMENT ON</code>. Partitions are listed under their table; function bodies are skipped safely.
          </Source>
        </div>
        <p className="mt-4 text-[13.5px] text-muted">
          The snippets show the format. Columnist is tested on two real schemas, both included: Umami (Prisma, MIT) and Pagila (a PostgreSQL sample database, PostgreSQL License).
        </p>
      </div>
    </section>
  );
}

function Source({ title, file, code, children }: { title: string; file: string; code: string; children: ReactNode }) {
  return (
    <div className="bg-paper p-6 md:p-7 min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-serif text-[28px] leading-none">{title}</h3>
        <span className="kicker">{file}</span>
      </div>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2 [&_code]:text-[13px]">{children}</p>
      <pre className="mt-5 overflow-x-auto bg-wash border border-line p-4 font-mono text-[12px] leading-relaxed text-ink-2 scroll-thin">{code}</pre>
    </div>
  );
}

const FAQ = [
  ["Does it connect to my database?", "No. It reads a file: your schema.prisma, or the output of pg_dump --schema-only. Nothing needs a connection string or credentials, so it's safe to run on a production schema."],
  ["Where does my schema go?", "It's read in your browser. When you render the PDF, the email or the image, the tables and columns (not data, which Columnist never sees) go to the app's own render route and come straight back. Nothing is stored on a server."],
  ["Where are my notes kept?", "In your browser, per project, so they're there next time you open the same schema. Notes written in the schema itself (Prisma /// comments, SQL COMMENT ON) are read automatically, which is the best place for them to live."],
  ["Does it detect renamed columns?", "No, and it says so. A rename looks like one column removed and one added, and that's what it means for a query that uses the old name: it stops working."],
  ["What about MySQL or SQLite?", "Through Prisma, yes: a Prisma schema for any provider works. Raw SQL dumps are read with PostgreSQL's syntax; other dialects may miss some keys."],
  ["My schema has 150 tables. Will the diagram work?", "The dictionary lists every table. The diagram draws the 40 most connected tables so it stays readable; the PDF version shows their key columns only."],
  ["Can I run it in CI?", "The three outputs are plain Hyper Elements templates. npm run docs renders them from a JSON file with the Hyper Elements command line tool, so a pipeline can rebuild the dictionary on every release."],
] as const;

function Faq() {
  return (
    <section id="faq" className="border-b border-line">
      <div className={`${WRAP} py-20 md:py-28 grid md:grid-cols-[360px_1fr] gap-12`}>
        <div className="md:sticky md:top-28 self-start">
          <Kicker n="06" text="FAQ" />
          <h2 className="mt-4 font-serif text-[40px] md:text-[52px] leading-[1.02] tracking-[-0.02em]">Letters to the editor.</h2>
        </div>
        <div className="border-t border-ink">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group border-b border-line">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 font-serif text-[22px] leading-snug">
                {q}
                <span className="grid place-items-center size-7 shrink-0 border border-ink rounded-full font-mono text-[15px] transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="pb-6 pr-12 text-[15.5px] text-ink-2 leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Close() {
  return (
    <>
      <section className="border-b border-ink">
        <div className={`${WRAP} py-20 md:py-28 grid md:grid-cols-[1fr_auto] gap-8 items-end`}>
          <div>
            <h2 className="font-serif text-[44px] md:text-[76px] leading-[0.98] tracking-[-0.03em] max-w-[820px]">
              Write it once. <em className="text-green">Keep it true.</em>
            </h2>
            <p className="mt-5 text-[17px] text-ink-2 max-w-[560px]">Try it on Umami&apos;s real schema, or on your own.</p>
          </div>
          <Link href="/studio" className="btn btn-ink !px-6 !py-3.5 !text-[15px]">
            Write up a schema <ArrowRight size={17} />
          </Link>
        </div>
      </section>
      <footer className={`${WRAP} py-10 flex flex-col md:flex-row gap-3 justify-between text-[13px] text-muted`}>
        <span className="flex items-center gap-2 font-serif text-[19px] text-ink">
          <Mark size={20} /> Columnist
        </span>
        <p className="max-w-[720px] md:text-right">
          Built with{" "}
          <a className="underline underline-offset-2 hover:text-ink inline-flex items-center gap-0.5" href="https://github.com/hyper-elements/hyper-elements">
            Hyper Elements <ArrowUpRight size={12} />
          </a>
          . Sample schemas: Umami (MIT) and Pagila (PostgreSQL License). Northwind Labs and the notes in the sample are ours.
        </p>
      </footer>
    </>
  );
}

function Kicker({ n, text }: { n: string; text: string }) {
  return (
    <p className="kicker">
      <span className="text-green">{n}</span> — {text}
    </p>
  );
}
