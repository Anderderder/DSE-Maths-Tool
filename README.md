# DSE MC Generator

HKDSE Paper 2 style multiple-choice generator. First topic: **Equation of Straight Line**.

## Run (Phase 1)

Double-click `start.bat` (uses portable Node + local Poe proxy), or:

```bash
node api/dev-server.mjs
```

Open http://localhost:3457 → **Settings** → paste a **Gemini** and/or **Poe** API key → **Generate**.

- **Gemini only** → uses Gemini  
- **Poe only** → uses Poe  
- **Both** → Auto prefers Gemini (or pick in Settings)

Offline UI check: Settings → **QA 1…QA 10** (no API).

## Architecture

| Piece | Role |
|-------|------|
| Gemini | Stem, options, smart exam-technique solution (browser key) |
| Poe | Same generation path via OpenAI-compatible API + local `/api/poe` proxy |
| `js/verify` | Reject inconsistent JSON; retry |
| `js/graph` | Deterministic DSE-style SVG Cartesian figures |
| `api/generate.proxy.stub.js` | Future Enterprise Gemini proxy |
| `api/dev-server.mjs` | Static host + Poe CORS proxy |

## Enterprise later

```js
window.DSE_MC_GEMINI_MODE = 'proxy';
window.GEMINI_PROXY_URL = 'http://localhost:8787/api/generate';
```

Then in `api/`:

```bash
npm install
set GEMINI_API_KEY=your-enterprise-key
npm run proxy
```
