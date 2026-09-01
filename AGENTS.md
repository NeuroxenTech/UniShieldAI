# AGENTS.md

## Project layout

Two independent apps — no monorepo tooling, no shared workspace.

```
frontend/   React 18 + TypeScript + Vite 6 + Tailwind CSS v4
backend/    Python FastAPI + WebSocket + Scapy decision engine
```

## Commands

All frontend commands run from `frontend/`:

```sh
cd frontend
npm run dev        # Vite dev server on :5173, proxies /api and /ws to :8000
npm run build      # tsc -b && vite build
npm run lint       # eslint .
npm run test       # playwright test (Chromium only, auto-starts dev server)
npm run test:report
```

Backend (from `backend/mirror/`):

```sh
python server.py   # FastAPI on 0.0.0.0:8000
```

No `requirements.txt` or `pyproject.toml` — backend deps (fastapi, uvicorn, scapy, pydantic) must be pip-installed manually.

## Key architecture facts

- Frontend uses **hardcoded demo data** (`src/data/demo.ts`), not connected to backend API yet.
- Vite proxy: `/api` -> `http://localhost:8000`, `/ws` -> `ws://localhost:8000`.
- Path alias: `@/*` maps to `src/*` (tsconfig `baseUrl: "."`).
- Tailwind v4 configured via Vite plugin — no `tailwind.config.*` file.
- `zustand` is in `package.json` but unused in source code.
- Backend has a standalone HTML dashboard (`backend/mirror/index.html`) separate from React frontend.

## Testing

- Playwright E2E only — 19 tests across 5 spec files in `frontend/tests/`.
- Chromium only, 1440x900 viewport, `trace: retain-on-failure`.
- `webServer` config auto-runs `npm run dev` before tests.
- Test helper: `tests/_helpers.ts` exports `attachFullPage()` for screenshots.

## TypeScript / Linting

- `strict: true` in tsconfig, but `noUnusedLocals` and `noUnusedParameters` are **off**.
- ESLint 9 in devDeps but no config file found — `eslint .` may use built-in defaults.

## Style conventions

- Tailwind utility classes inline — no CSS modules, no styled-components.
- Custom CSS in `src/index.css` uses `@theme` directives and custom utility classes.
- Components in `src/components/` (UI primitives + dashboard widgets), pages in `src/pages/`.
- Router uses `react-router-dom` v7 `createBrowserRouter`.

## Gotchas

- No root `.gitignore` — only `frontend/.gitignore` exists (`dist/` and `node_modules/` are ignored).
- No CI workflows, no pre-commit hooks.
- Backend has no test suite.
- `frontend/src/data/demo.ts` and `components/dashboard/` are legacy (unused by the SOC dashboard); `zustand` in `package.json` is also unused.
- New dashboard lives in `components/soc/` (glass/violet "SOC Command Center" theme) with typed mock data in `data/soc.ts` configured via props so API data can be wired in later.
