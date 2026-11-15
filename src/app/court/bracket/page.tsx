import type { Metadata } from "next";
import { BracketView } from "./bracket-view";

export const metadata: Metadata = { title: "Bracket · Clip Court · Faze Now" };

export default function BracketPage() {
  return <BracketView />;
}
