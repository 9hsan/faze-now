# Faze Now

**For 16 years, FaZe picked the kings. Now the fans do.**

Faze Now is a fan hub built for the HackUTA 2026 FaZe Clan challenge ("Be the CTO of FaZe Clan"). Fans pitch ideas and rate each other's clips. Creators see what their audience actually wants.

## Features

- **The Call:** fans post requests ("@Swagg drop a nuke in every COD ever made") and yes/no polls, then upvote them. Every week the top polls get a guaranteed response in a FaZe upload. When a request is fulfilled, everyone who upvoted it is notified and the fan who pitched it is credited.
- **Clip Court:** fans submit clips and montages, then vote head to head on pairs. New clips are shown first, so every submission gets seen. Ratings use Elo. Top clips go into a bracket, and the season winner plays with a FaZe creator in a video.
- **Creator Insights:** a dashboard for each creator showing top and rising requests, AI-grouped themes (so small requests add up and aren't buried), what new fans want compared with returning fans, most-requested collabs, and a weekly summary. It starts from real requests pulled out of YouTube comments.
- **Points:** fans earn points for voting, posting, scouting winning clips early, and getting requests fulfilled.

## Stack

Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Supabase (Postgres, Auth with Discord, Storage, Realtime), YouTube Data API, Claude API, FFmpeg.

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in the keys
npm run dev
```
