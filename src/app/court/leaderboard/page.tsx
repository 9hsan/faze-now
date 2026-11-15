import type { Metadata } from "next";
import { Leaderboard } from "./leaderboard";

export const metadata: Metadata = { title: "Leaderboard · Clip Court · Faze Now" };

export default function LeaderboardPage() {
  return <Leaderboard />;
}
