import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const serif = localFont({
  src: [
    { path: "../../fonts/Newsreader-400.woff", weight: "400" },
    { path: "../../fonts/Newsreader-400-italic.woff", weight: "400", style: "italic" },
    { path: "../../fonts/Newsreader-500.woff", weight: "500" },
    { path: "../../fonts/Newsreader-600.woff", weight: "600" },
  ],
  variable: "--font-newsreader",
});
const sans = localFont({
  src: [
    { path: "../../fonts/IBMPlexSans-400.woff", weight: "400" },
    { path: "../../fonts/IBMPlexSans-500.woff", weight: "500" },
    { path: "../../fonts/IBMPlexSans-600.woff", weight: "600" },
  ],
  variable: "--font-plex",
});
const mono = localFont({
  src: [
    { path: "../../fonts/IBMPlexMono-Regular.ttf", weight: "400" },
    { path: "../../fonts/IBMPlexMono-Medium.ttf", weight: "500" },
  ],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "Columnist · The data dictionary that writes itself from your schema",
  description:
    "Drop a schema.prisma or a pg_dump. Columnist writes the data dictionary PDF with the diagram, the change notice for your data team, and the diagram as an image. Built with Hyper Elements.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
