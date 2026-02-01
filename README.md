# AI Devil’s Advocate

A frontend-only Next.js app that uses the Gemini API to challenge ideas, surface weak assumptions, and propose stronger alternatives. It is a structured critique tool: users submit an idea, pick a lens, and receive a multi-part analysis.

## What this is

- **Single-page critique tool** built on Next.js App Router.
- **Client-side UI** with controlled inputs and local persistence.
- **Gemini API** for analysis generation.
- **No backend** and no database; everything is in the browser.

## Core flow

1. User writes an idea.
2. Optional context is added (goal, audience, constraints).
3. A critique mode is chosen (brutal/logical/ethical/investor/academic).
4. The app builds a prompt and calls Gemini.
5. Response is parsed into structured sections and rendered.
6. History and baseline comparisons are stored locally.

## Features

- **Structured critique output** with clear sections
- **Multiple critique lenses** (Brutal, Logical, Ethical, Investor, Academic)
- **Local persistence** (drafts, preferences, history, baseline)
- **Iteration controls** (stronger round, baseline comparison)
- **Raw output fallback** if structured parsing fails

## Tech stack

- **Next.js** (App Router)
- **React** (client components)
- **TypeScript**
- **TailwindCSS**
- **Framer Motion** (subtle transitions)

## Project structure

```
public/
	devil-music.mp3
src/
	app/
		globals.css
		layout.tsx
		page.tsx
```

## Environment variables

Create a `.env.local` file in the project root:

```
NEXT_PUBLIC_GEMINI_API_KEY=your_key_here
```

> This key is exposed to the client. Do not commit it.

## Run locally

Install dependencies:

```
npm install
```

Start the dev server:

```
npm run dev
```

Open http://localhost:3000

## Build

```
npm run build
```

## Deploy (Vercel)

1. Import the repo into Vercel.
2. Add environment variable:

```
NEXT_PUBLIC_GEMINI_API_KEY=your_key_here
```

3. Deploy.

## Security & key handling

- Never commit API keys.
- If a key is exposed, rotate it immediately.
- For stricter security, move calls to a server route and use a non-public key.

## Limitations

- This is a **frontend-only** app; no server-side storage.
- API quota and latency depend on the Gemini key.
- Output is probabilistic and may be incomplete or incorrect.

## Troubleshooting

- **Build fails with missing API key**: set `NEXT_PUBLIC_GEMINI_API_KEY`.
- **Empty or unstructured output**: raw response is displayed; try again.
- **No response**: verify the API key is valid and has quota.

## Disclaimer

This tool provides adversarial critique as a thinking aid. It does not provide professional advice and should not be used as a substitute for expert judgment.
