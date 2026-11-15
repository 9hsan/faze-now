import type { Metadata } from "next";
import { Judge } from "./judge";

export const metadata: Metadata = { title: "Clip Court · Faze Now" };

export default function CourtPage() {
  return <Judge />;
}
