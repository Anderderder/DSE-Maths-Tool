# DSE MC Generator

HKDSE Paper 2 style multiple-choice generator. First topic: **Equation of Straight Line**.

## Run (Phase 1)

```bash
npx serve -l 3457 "DseMcGenerator"
```

Open http://localhost:3457 → **Settings** → paste Gemini API key → **Generate**.

Offline UI check: Settings → **QA 1…QA 10** (no API).

## Architecture

| Piece | Role |
|-------|------|
| Gemini | Stem, options, smart exam-technique solution |
| `js/verify` | Reject inconsistent JSON; retry |
| `js/graph` | Deterministic DSE-style SVG Cartesian figures |
| `api/generate.proxy.stub.js` | Future Enterprise proxy |

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
