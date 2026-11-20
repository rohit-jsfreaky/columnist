import type { Metadata } from "next";
import { Studio } from "@/components/Studio";

export const metadata: Metadata = { title: "Write up a schema · Columnist" };

export default function StudioPage() {
  return <Studio />;
}
