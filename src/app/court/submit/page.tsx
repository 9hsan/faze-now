import type { Metadata } from "next";
import { SubmitForm } from "./submit-form";

export const metadata: Metadata = { title: "Submit a clip · Clip Court · Faze Now" };

export default function SubmitPage() {
  return <SubmitForm />;
}
