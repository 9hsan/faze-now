# Prompt: Devpost cover image for Faze Now

Create the cover image (project thumbnail) for a hackathon project on Devpost.

## The project
**Faze Now** is a fan hub built for FaZe Clan's "Be the CTO of FaZe Clan" challenge at HackUTA 2026. Fans pitch video ideas and vote on them, judge each other's gaming clips in a bracket, and earn points. FaZe's creators get an AI-written weekly brief of what their fans want. Tagline: **"FaZe picked the kings. Now the fans do."**

## Output
- One PNG, **3:2 aspect ratio, 1500 × 1000 px**. Devpost crops thumbnails toward the center, so keep all text and the logo inside the middle 80%.
- It must read at thumbnail size (about 300 px wide): one big headline, one strong visual, and nothing else.

## Brand rules (from FaZe's official brand guidelines; follow exactly)
- **Colors:** Red Alert `#E4002B`, Black `#111111`, White `#FFFFFF`. Nothing else, apart from screenshot content.
- **Logo:** use **Logo 1**, the white F with the red and black double outline. It's the only version allowed on dark or colored backgrounds. Don't recolor, stretch, rotate, add effects to, or crop it. Leave clear space around it of at least 25% of its width on every side. Minimum size 60 px wide (below that the guidelines require the one-color version).
- **Type:** headlines in **Anton** (condensed, all caps); any small text in **Source Sans Pro**. Both are free on Google Fonts and are in the kit.
- **Pattern:** FaZe tiger camo. The **red/black** version is the original; the **grey** version is the brand's choice for backgrounds.

## Assets
- Brand kit zip: `C:\Users\ahsan\Downloads\drive-download-20261115T160349Z-1-001.zip`
  - Logo 1: `_LOGOS/Logos/PNG/White Double Stroke/FAZE LOGO_White Double Stroke_Transparent.png` (3858 × 2585, transparent)
  - Red camo: `_PATTERNS/FaZe Tiger Camo/FaZe_Tiger_Camo_RedBlack.jpg`
  - Fonts: `_FONTS/General Use Fonts/` (Anton, Source Sans Pro)
- Already web-ready in the repo `C:\Users\ahsan\CS\Projects\faze-now\public\brand\`: `faze-mark.png` (Logo 1, 640 px), `camo-red.webp`, `camo-dark.webp`
- Product screenshots: `C:\Users\ahsan\CS\Projects\faze-now\docs\screenshots\`
  - `09-creator-dashboard-kay.png`: AI brief and fan-split charts (desktop, 2880 × 1800). **Best "value to FaZe" shot.**
  - `01-home-hero.png`: homepage hero with the tagline (desktop)
  - `14-mobile-clip-court.png`: clip voting on a phone (1170 × 2532)
  - `13-mobile-the-call.png`: fan requests feed on a phone

## Composition
- **Background:** brand black `#111111`. A diagonal band of the **red/black tiger camo** cuts across the lower right (about a third of the canvas), fading to black toward the text side.
- **Left side (text):**
  - Logo 1 at roughly 140 px wide, with clear space.
  - Under it, **"FAZE NOW"** in Anton, white, very large (the dominant element).
  - Then **"FAZE PICKED THE KINGS."** in white and **"NOW THE FANS DO."** in Red Alert, Anton, smaller.
  - Optional small line in Source Sans Pro, white at 60% opacity: "HackUTA 2026 · FaZe Clan Challenge".
- **Right side (product):** a laptop or plain browser frame showing `09-creator-dashboard-kay.png`, overlapped in front by a phone frame showing `14-mobile-clip-court.png`. Tilt them slightly (about 8° or less) and give them a soft shadow. Frames are simple dark rounded rectangles, not a brand-name device mockup.
- Mood: esports and broadcast graphics. High contrast, sharp, confident. No gradients other than the camo fade.

## Don'ts
- Don't add stars, glows, lens flares, neon, emoji or extra colors.
- Don't use the light-background logo version (red F, Logo 2); it's only for white backgrounds.
- Don't write "Official FaZe app" or anything implying FaZe made or endorsed this. It's a hackathon entry *for* FaZe's challenge.
- Don't show real people's faces large. The clip screenshots include a small streamer facecam; keep the phone screenshot small enough that it isn't a focal point, or crop to the gameplay.
- No other teams' or brands' logos.

## Check before delivering
- Readable at 300 px wide: "FAZE NOW" and the F logo are still clear.
- Logo 1 unaltered, with clear space respected.
- Only #E4002B, #111111 and #FFFFFF outside the screenshots.
- Save as `docs/devpost-cover.png` in the repo, 1500 × 1000.
