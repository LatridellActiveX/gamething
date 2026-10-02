# Industrial Frontier

## This project was developed using AI assisted development through and through. 

An idle factory-building game made with React, TypeScript, and Vite. Build extraction and production facilities, balance power and storage, and trade resources on the market. Progress is saved in the browser automatically.

## Hosting

The game runs on **Cloudflare Workers**. The Worker in `src/worker.ts` serves the built static files from `dist/` using Cloudflare's static assets binding (`ASSETS`). Its config lives in `wrangler.jsonc`.

- `GET /health` returns `ok` as a simple uptime check.
- Any other path is handled by the built game. Unknown routes fall back to `index.html` (`not_found_handling: "single-page-application"`), so client-side navigation works.

## Getting started

```bash
npm install
npm run dev       # local dev server (Vite)
npm run build     # type-check and build to dist/
npm run preview   # preview the production build locally
```

## Deploying

```bash
npm run deploy    # builds, then runs `wrangler deploy`
```

You need a Cloudflare account and a signed-in Wrangler session first (`npx wrangler login`).

## Project layout

- `src/App.tsx`: the game UI (dashboard, build catalog, cargo, market, save)
- `src/game/engine.ts`: the one-second simulation tick (production, power, storage)
- `src/game/state/`: game state types, the initial save, and persistence
- `src/assets/art/`: pixel-art icons and the ID-to-icon lookup (`index.ts`)
- `scripts/generate-pixel-art.mjs`: regenerates the pixel-art SVGs
- `src/worker.ts`: the Cloudflare Worker entry point
- `docs/architecture.md`: architecture notes
