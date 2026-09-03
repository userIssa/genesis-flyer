# Genesis Birthday Flyer Generator

Replaces the manual CorelDRAW workflow for the monthly birthday celebrants flyer:
import the HRM export → auto-match uploaded photos to names → preview → export a
print-ready PDF, all in the browser.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- MongoDB / Mongoose (session data: celebrant list, matched photo paths)
- Puppeteer (server-side PDF export — pixel-accurate, matches the on-screen preview)
- PapaParse (CSV parsing)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the env file and point it at your Mongo instance:
   ```bash
   cp .env.example .env.local
   # edit MONGODB_URI if not using local MongoDB on the default port
   ```
3. Run it:
   ```bash
   npm run dev
   ```
4. Open http://localhost:3000

## Workflow

1. **Import** — on the dashboard, export the celebrants list from the HRM
   platform as CSV or JSON and upload it, along with the flyer title, hashtag,
   and greeting message. The importer tolerates common header variants (Name /
   Full Name / Employee Name, DOB / Birthday / Date of Birth, etc.) and only
   needs the day-of-month from the birth date — the flyer badges are day
   ordinals ("1st", "13th"), not a ranking.
2. **Match photos** — drop the whole folder of celebrant photos onto the match
   page. Filenames are fuzzy-matched to names (`henry_rose.jpg` → "Henry
   Rose", token order doesn't matter). Anything below the confidence
   threshold is left for manual assignment via the dropdown instead of being
   silently mismatched.
3. **Preview** — see the paginated flyer (10 celebrants per page, matching the
   5x2 grid of the original template) rendered live in the brand colors.
4. **Export** — the Export PDF button renders the same layout server-side via
   Puppeteer and downloads a print-ready multi-page PDF.

## Notes on adapting the template

`components/FlyerPages.tsx` and `components/CelebrantCard.tsx` are a
from-scratch recreation of the layout in the sample flyer (maroon name bar,
black day badge, gold script "Happy Birthday", cake/balloon accents) using
plain Tailwind + inline SVG — not the original CorelDRAW assets. Swap in the
actual Genesis Group logo file and fonts (the template uses a bold sans for
the wordmark and a script face for "Birthday") to match exactly; placeholders
are marked in `CoverPage`/`GridPage`.

## Known limitations / next steps

- Puppeteer needs a Chromium download on `npm install`; if deploying to a
  serverless host (Vercel, etc.) swap to `@sparticuz/chromium` +
  `puppeteer-core` instead of full `puppeteer`.
- Photo storage is local disk under `public/uploads/<sessionId>/`. Fine for a
  single-server deployment; move to S3/Cloudinary if this needs to run
  across multiple instances.
- The manual-match dropdown list is per-page-load state (uploaded-but-unmatched
  filenames aren't persisted separately in Mongo) — if you reload mid-match,
  re-upload the leftover photos and they'll be picked up as a fresh batch.
- No auth yet — add a login gate before this goes anywhere near a public URL,
  since it holds staff photos and personal data.
