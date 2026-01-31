# AI Devil’s Advocate

Frontend-only web app that uses the Gemini API to aggressively challenge user ideas, expose weak assumptions, and suggest stronger alternatives.

## Features

- Structured critique output with clear sections
- Tone modes (Brutal, Logical, Ethical, Investor-style, Academic)
- Local storage for drafts, preferences, and idea history
- “Stronger Counter” escalation and revision tracking
- Optional v1 vs v2 comparison

## Requirements

- Node.js + npm
- Gemini API key (set as NEXT_PUBLIC_GEMINI_API_KEY)

## Run locally

```bash
npm run dev
```

Then open the app at localhost:3000.

Create a .env.local file with:

NEXT_PUBLIC_GEMINI_API_KEY=your_key_here

## Notes

- This project is frontend-only; no backend storage is used.
- AI critique is a stress test, not a truth oracle.
