# AGENTS.md

## Project layout

Two independent apps — no monorepo tooling, no shared workspace.

```
frontend/   React 18 + TypeScript + Vite 6 + Tailwind CSS v4
backend/    Python FastAPI + WebSocket + Scapy decision engine
```

Backend pipeline apps live under `backend/app/` (ingest, features, rules, ML,
decision, realtime WS). Utility scripts split into two dirs:
- `backend/scripts/` — Python tools (train_models.py, replay_pcap.py, run_sensor.py).
- `backend/app/scripts/` — shell scripts (run-sensor.sh, setup-wireguard.sh, setup-vm-lab.sh).

## Commands

All frontend commands run from `frontend/`:

```sh
cd frontend
npm run dev        # Vite dev server on :5173, proxies /api and /ws to :8000
npm run build      # tsc -b && vite build
npm run lint       # eslint . (flat config: eslint.config.mjs)
npm run test       # playwright test (Chromium only, auto-starts dev server)
npm run test:report
```

Backend (from `backend/`):

```sh
python app/main.py                       # dev server on 0.0.0.0:8000
PYTHONPATH=$PWD python -m pytest tests/ -q   # 20 unit/integration tests
```

Backend deps must be pip-installed manually — there is no `requirements.txt`
at the root `backend/`; install from a venv (fastapi, uvicorn, scapy,
pydantic, aiosqlite, pytest, pytest-asyncio, httpx).

## Key architecture facts

- Frontend pages are wired to the backend through `src/lib/api.ts` (typed
  client) + `src/store/engine.ts` (zustand `useEngine` store: `gotData` flag,
  `error` set when every poll endpoint fails, plus **real-time toasts** and
  per-source **ACTIVE/STOPPED attack tracking** fed by `/ws/alerts`) and a sync
  hook in `src/hooks/useEngineSync.tsx` (5s polling + `/ws` for metrics +
  `/ws/alerts` for bare alert broadcasts, 2s source-activity tick, reconnect,
  mounted in `AppFrame`). New detections raise a slide-in toast popup
  (click → investigation) and a separate "Attack ended" toast fires ~20s after
  a source stops sending. Alert delivery: while a flood keeps hitting the same
  (dst, proto, threat, severity) the backend **merges** into the existing
  alert and re-broadcasts a ~2s live pulse (`AlertManager._pulse`) so the UI's
  aggregation counts/timestamp keep updating; the frontend **upserts** already-
  seen alert ids instead of ignoring them. The 5s poll baselines existing
  alerts once and afterwards toasts genuinely-new ids it discovers (WS-failure
  fallback). `GET /api/v1/alerts` returns live-session alerts only (never the
  full DB history) so floods can't bias the window. Backend timestamps are naive
  UTC — `parseApiTs` in `api.ts` appends `Z` so `timeAgo`/`formatTs` show real
  ages (`4h` bug was naive timestamps parsed as local). The Overview trend keeps
  24 × 5s samples (≈2 min) so the chart never gaps like the old 5-minute window.
- **Mobile push (`backend/app/notifications/ntfy.py`)**: new alerts are pushed
  to an ntfy.sh topic (`POST {NTFY_URL}/{NTFY_TOPIC}`, headers Title/Priority/
  Tags, JSON body with src/dst/threat/risk). Wired via a THIRD `AlertManager`
  hook, `register_notifier` (`alerts/manager.py`), which fires **only on
  genuinely-new emissions — never on `_pulse` merges**, so a 30-fps flood can't
  spam the phone. Priority maps severity→ntfy priority (critical=5 … info=1).
  `ntfy.py` reads `alert.evidence["features"]["dst_port"]` (the raw `AlertCreate`
  has NO port fields — `alerts/generator._feature_summary` was extended to
  include src/dst_port); do not use `alert.dst_port` on `AlertCreate`.
  Config lives in `backend/.env` (`NTFY_ENABLED=true`, `NTFY_URL`,
  `NTFY_TOPIC=unishield-alerts-ps26145`); notifier is a no-op unless enabled AND
  a topic is set. NOTE: `pydantic.BaseModel.__getattr__` RAISES
  `AttributeError` for unknown fields, so `getattr(alert, "dst_port", None)`
  DOES NOT fall back cleanly on model instances — use the evidence dict.
- **Live feed pause/resume**: a TopBar pause button (Play/Pause icon) toggles
  `POST /api/v1/engine/live {"enabled": bool}` (router `app/api/live.py`,
  state `app/state/live.py` `LiveFeedController`, in-memory flag, lock-protected
  setter). While paused the backend keeps ingesting + detecting + **persisting
  alerts to the audit DB**, but `realtime/publisher._publish_all` early-returns
  (metrics/engine_state streams frozen), `main._publish_alert` returns before
  broadcasting, and `NtfyNotifier.notify` is gated too. The toggle itself
  broadcasts a NON-gated `{type:"live_state"}` control envelope via
  `publish_payload` so clients learn the new state (that envelope also lands on
  `/ws/alerts`, which shares `connection_manager`). Frontend: `engine.ts`
  stores `liveEnabled`, `toggleLiveFeed()` calls the API then `refreshAll()` on
  resume; `useEngineSync` skips poll/tick/WS-frame handling while paused
  (reading `useEngine.getState().liveEnabled` inside the callbacks to avoid
  stale closures) and the `ConnectionBadge` flips to a PAUSED pill. Resume
  re-polls and surfaces everything that was stored meanwhile.
- Routes (6, `createBrowserRouter`): `/` Overview, `/alerts`, `/traffic`,
  `/engine`, `/about`, `/investigation/:id`. Sidebar lists these 5 pages
  (alerts item carries a live open-count badge) plus a collapse toggle.
  TopBar shows live counters (flow rate, active flows, alerts, open/critical)
  and a Refresh button. `ConnectivityBanner` in AppFrame surfaces
  `error`/no-data as an explicit amber banner (never a silent blank page).
- Shared threat/severity meta lives in `src/lib/threats.ts`
  (`SEVERITY` colors + `threatMeta` blurbs); `src/components/alerts/`
  holds `SeverityBadge`, `ThreatBadge`, `AlertRow`/`FlowPair`, `EmptyState`.
  `src/components/ui/StatCard.tsx` is the KPI card. Pages: Overview uses
  recharts (trend area + threat donut), Alerts has search + severity/threat
  selects + status tabs, Traffic renders the live flow table with TCP-flag
  and periodicity columns, Investigation fetches the alert by id and shows
  features + score_breakdown + advisory actions.
- Alert ordering is **freshness, not insertion**: `AlertManager.recent()`
  sorts by `alert.timestamp` desc and the store re-sorts on every poll/WS
  update (`sortByFreshness`), so a flood that keeps pulsing (timestamp
  refreshed ~2s during the 300s dedup window) stays on top instead of an
  old-but-pulsing alert lingering below fresher ones. Backend timestamps are
  naive UTC ISO strings — lexicographic comparison is chronologically
  correct.
- Classification gotchas (fixed Jan '26): `_outbound_inbound_ratio` must NOT
  count the current flow's own bytes as outbound (it made a single fresh flow
  read as a 54:1 egress and fired `data_exfiltration` on EVERY connection,
  drowning the SYN-flood DDoS rule that scores 0.9 < 1.0). It now only sums
  tracker counters toward external (non-RFC1918) peers. Dedicated flood rules
  live in `app/rules/behavioral.py`: `behav_syn_flood` (syn_ratio>0.9→DDoS),
  `behav_udp_flood` (UDP→DDoS; two arms: conn_freq≥2 ∧ pps≥8, OR a
  single-flow datagram barrage with pps≥40 — real hping3 floods are often ONE
  fixed-source flow and scored only ~0.50 otherwise, silently under the 0.6
  alert gate),
  `behav_slowloris` (TCP to 80/443/8080, conn_freq≥3, fin_ratio≤0.05, small
  avg pkt→DoS). `ThreatClassifier._demote_internal_segment` downgrades
  DATA_EXFILTRATION and pure-volume DOS (pps/bps only) for RFC1918→RFC1918
  flows (iPerf benchmarks, LAN copies) to suspicious so intra-segment bulk
  doesn't alarm as border exfil.
- Alert gate gotcha: `settings.detection_threshold` is **0.6**, and `is_threat`
  is `risk_score >= threshold`. A single high-entropy DNS query matched
  `stat_dns_entropy_high` but fused only ~0.24 risk → silently no alert, so a
  "DNS tunneling" scenario produced nothing. Fix (`app/decision/engine.py`):
  when the classifier returns a discrete technique (`dns_tunneling`,
  `port_scan`, `c2_communication`, `slowloris/dos`, `brute_force`, ...) that
  matched its OWN rule, the risk is floored to the strongest matched technique-rule score (at least the
  threshold) so a lone technique match always surfaces AND a flood that skips
  ML (`fast_ml`) still reads as the rule's true severity (SYN flood → 0.90),
  not the diluted weighted mean (~0.60/low). Volume-only labels
  (ML/anomaly `suspicious_traffic`) keep the raw gate.
- Scenario isolation in the real lab: `generate_test_traffic.py` must run with
  `PYTHONPATH=<backend>` or it silently dies with `ModuleNotFoundError: app`.
  Each of the 7 scenarios now alerts (verified end-to-end): udp_flood→ddos
  (risk 1.00), syn_flood→ddos (0.90), dns_tunnel→dns_tunneling (1.00),
  port_scan→port_scan (1.00), c2_beacon→c2_communication (1.00),
  slowloris→dos (0.80), brute_force→brute_force (0.80).
- Real attack-suite gotchas (Sep '26, `backend/scripts/attack-suite.sh`): the
  generator bypasses the scapy ingestion layer (`test_source.py` sets
  `record.dns_query` directly), so rule-layer passes DON'T prove the wire path.
  Real attacks over the wire found three true gaps: (1) `scapy.py` + `scapy_live.py`
  only parsed `dns_qname` when the packet's **source** port was 53 (server
  response); a client **query** (rand src port → :53) — the actual tunneling
  traffic — was silently dropped from `FlowRecord.dns_query`, so DNS tunneling
  could never fire on the live path. Now parses when either side is 53 (and the
  offline `ScapyParser` path had the same bug). (2) `hping3 -U` is the TCP **URG**
  flag, NOT UDP — `-U` floods send TCP and correctly read as ddos (masquerading
  as a "UDP flood"); UDP mode is `hping3 -2`. (3) `behav_slowloris` demanded
  conn_freq ≥3.0 (~180 held sockets), above the suite's 100 → lowered to 1.5.
  Feetures calibrated to whole-qname char entropy (nats, threshold 3.5): a
  tunnel payload needs 4-5 random labels (62-char alphabet) like the generator's,
  not 2 random labels + a long static suffix (whole-name entropy ~3.1 < 3.5, and
  per-label entropy caps at ln(label_len) so short labels can NEVER reach 3.5).
  The suite's C2 beacon must bind a FIXED local src port — a fresh ephemeral port
  per heartbeat fragments beacons into one-shot 5-tuples and periodicity never
  accumulates. Slowloris needs an actual :80 listener or `socket count: 0`.
  (Also: `ScapyParser` never implemented the abstract `parse_line`, so
  `scripts/replay_pcap.py` crashed on construction — parse_line now raises
  NotImplemented; replay works.)
- C2/beacon rule gotchas (fixed Sep '26): `FlowEntry.merge_stats` used the
  synthetic record `ts` for `last_seen`, so a c2 demo's back-dated beacon
  timestamps (~60s apart) made the fresh flow look ANCIENT → the expiry
  manager evicted it before 3 samples accumulated and `behav_periodic_conn`
  never fired. Now `ts` only feeds the `timestamps` periodic-signal list;
  `last_seen` always tracks wall-clock arrival. Also: `TestTrafficSource`
  picked `233.51.x` as its C2 server — 233/8 is **multicast (224/4)**, and
  `_drop_link_local_noise` correctly refuses to label beaconing toward a
  broadcast/multicast group... after the DHCP-fix reordered it to run BEFORE
  the technique-type bypass (a periodic DHCP discover used to read as a live
  C2 channel, risk 1.00, from 0.0.0.0→255.255.255.255). Generator now uses a
  unicast public C2 IP.
- Running backend on the demo machine: `cd backend && PYTHONPATH=$PWD
  setsid ENV...python -u app/main.py` from a subshell (plain `&`/`nohup` gets
  killed with the tool's process group). Do NOT `pkill -f "app/main.py"` from
  a shell whose own command line contains that string — pkill matches the
  shell itself and the call hangs; use `pkill -f 'a[p]p/main.py'`. Restart
  backend to clear the in-memory alert store + pcap before judging a run; the
  wire capture keeps feeding live attacker-VM traffic (e.g. an idle NULL-TCP
  flood to :1234 pollutes every scenario) — stop the attacker VM tools first.
- Vite proxy: `/api` -> `http://localhost:8000` (changeOrigin), `/ws` ->
  `ws://localhost:8000` (ws: true).
- Path alias: `@/*` maps to `src/*` (tsconfig `baseUrl: "."`).
- Tailwind v4 configured via Vite plugin — no `tailwind.config.*` file.
- The legacy standalone HTML dashboard (`backend/mirror/`) was removed and
  replaced by the FastAPI pipeline under `backend/app/`; frontend is
  exclusively the React app in `frontend/`.
- Backend ingest channels all feed one pipeline: `POST /traffic/flow` + `/flows`
  (sensor/pcap replay), live Scapy capture (`ingestion/scapy*.py`), and the UDP
  flow-export listener (`ingestion/flow_export_listener.py`, port 2055) parsing
  NetFlow v5/v9, IPFIX v10, and sFlow (`ingestion/netflow.py`).
- Runtime websocket events: `/ws` emits `{type:"metrics"|"engine_state", data}`
  envelopes plus `hello`/`pong`; `/ws/alerts` broadcasts bare alert payloads
  (no envelope) identifiable by an `alert_id` key.
- `useEngine.refreshAll` runs `Promise.allSettled` over six `/api` fetches with
  an 8s per-endpoint timeout (`withTimeout` in `store/engine.ts`). Without it a
  single hung vite-proxy upstream socket stalls the whole batch forever, leaving
  `gotData=false` and causing Traffic/Overview to render their offline EmptyState
  permanently even though packet-level endpoints keep working.

## Testing

- Playwright E2E — 21 tests across 6 spec files in `frontend/tests/`
  (`navigation`, `dashboard`, `alerts`, `traffic`, `investigation`,
  `inspector`). Specs are written against the live network-SOC UI with
  tolerant empty-state fallbacks (`.or()` matchers) so they pass with the
  backend either up or down.
- The inspector spec (`inspector.spec.ts`, 4 tests) pumps real traffic via
  `generate_test_traffic.py` (`c2_beacon`, `--duration 8 --fps 20 --seed 4242`)
  using `execFileSync` against the venv python at `/tmp/opencode/ush_venv/bin/python`.
  Deep-link/search/jump tests each carry a pump+reload retry loop (~4 attempts)
  because sibling specs pump into the SAME shared `captures/active/current.pcap`
  and the 1MB rotation can archive the searched packets mid-test. Notes:
  deep-link waits for the actual `div[title^="Flow "]` row — NOT `row.or(offline)`,
  which latches on the transient "not reachable" EmptyState shown for the ~1s
  before the first 5s `refreshAll` poll lands; the `/packets?file=...` URL is
  asserted with `file=active%2Fcurrent.pcap` (URLSearchParams encodes the `/`);
  the search term is derived at runtime from `/api/v1/traffic/flows?limit=5`
  latest flow `src_ip` (generated srcs are random `10.0.{rand}.{rand}`), then
  polled into the table body.
- Chromium only, 1440x900 viewport, `trace: retain-on-failure`.
- `webServer` config auto-runs `npm run dev` before tests (backend must be
  running on :8000 for live data assertions). A long-lived vite dev server
  accumulates stale upstream sockets after a backend restart — restart vite
  (not just the backend) if every browser fetch to `/api` wedges (HTTP 000).
- Test helper: `tests/_helpers.ts` exports `attachFullPage()` for screenshots.
- Backend tests: `backend/tests/` — 23 passing (`pytest -q`), asyncio via
  `pytest-asyncio` auto mode; `conftest.py` uses a temp SQLite DB.

## TypeScript / Linting

- `strict: true` in tsconfig, but `noUnusedLocals` and `noUnusedParameters`
  are **off** (TS build tolerates unused vars; ESLint still flags them).
- ESLint 9 flat config at `eslint.config.mjs` (typescript-eslint +
  react-hooks recommended-latest + react-refresh). `npm run lint` is clean
  (0 errors; one known warning for the hook/component export in
  `useEngineSync.tsx`).

## Style conventions

- Tailwind utility classes inline — no CSS modules, no styled-components.
- Custom CSS in `src/index.css` uses `@theme` directives and custom utility
  classes (`glass-panel`, `accent-gradient`, `live-source`, etc.).
- Components in `src/components/` (UI primitives in `ui/`, layout in
  `layout/`, alert widgets in `alerts/`, brand in `brand/`), pages in
  `src/pages/`.
- Router uses `react-router-dom` v7 `createBrowserRouter`.
- Shared threat/severity meta lives in `src/lib/threats.ts`; format helpers
  in `src/lib/api.ts` (`humanThreatType`, `formatBytes`, `formatNumber`,
  `formatTs`, `timeAgo`).

## Gotchas

- Backend pcap capture used to grow unbounded (RSS ballooned 212MB→~1.9GB and
  the event loop stalled, making the browser show every page as "offline"):
  `GET /api/v1/captures/packets` was `rdpcap`-ing the ENTIRE `current.pcap`
  (which grew to 12.9MB / 71k packets) per request. Fixed by streaming reads
  via `PcapReader` (`app/api/captures.py`, only the requested page decoded),
  capping the capture at `pcap_max_bytes=1MB` (`app/core/config.py`), and
  rolling any leftover `current.pcap` into `captures/archive/rolling_<ts>.pcap`
  at startup (`app/capture/flow_pcap.py` also unlinks after archiving so the
  reopen starts fresh). Watch RSS — if it climbs, this is the first suspect.
- Backend deps (pip): fastapi, uvicorn, scapy, pydantic, pydantic-settings,
  aiosqlite, numpy, psutil, sqlalchemy, structlog, xgboost, joblib,
  scikit-learn, pytest, pytest-asyncio, httpx, **websockets** — without
  websockets/uvicorn[standard] every `/ws` and `/ws/alerts` upgrade fails
  ("Unsupported upgrade request") and the UI silently degrades to 5s polling
  toasts. `pip install websockets` + backend restart fixes it.
- Pipeline tuning lives in `backend/.env`, NOT `config.py` (pydantic-settings
  reads the env file; editing the default in `config.py` is silently ignored).
  `PIPELINE_QUEUE_SIZE=200000`, `PIPELINE_CONSUMERS=6`. A random-source hping3
  SYN flood creates a distinct 5-tuple per packet; with the old 50k queue the
  batch endpoint accepted only 50k/request and `record_error()`-dropped the
  rest (14k+ "processing errors"), and any other scenario POSTed mid-flood was
  rejected wholesale (that's why only ddos showed). Also: `DecisionEngine`
  skips the slow per-flow ML inference when a discrete rule already matched
  ≥0.70 (flood/port-scan/etc.), so floods drain faster and burst ingestion
  isn't ML-bound. `connection_tracker` self-evicts once >1.5x
  `max_concurrent_flows` (amortized sort, oldest dropped to 0.8x) so flood
  state can't balloon RSS.
- `dedup_window_sec` is 300: re-sending the same (dst, proto, threat,
  severity) within 5 min merges into the old alert (live WS pulse, no new id),
  so a fresh sim to the same victim won't emit a new alert/toast until the
  window lapses — restart the backend (or use a new scenario/target) for clean
  demos.
- No root `.gitignore` — only `frontend/.gitignore` exists (`dist/` and
  `node_modules/` are ignored).
- No CI workflows, no pre-commit hooks.
- Legacy SOC-product UI (`src/components/soc/`, `src/components/dashboard/`,
  `src/data/soc.ts`, `src/theme.ts`, old pages like Reports/Settings/AI) was
  **removed** in the frontend rewrite — do NOT re-add it as live-pages.
- UniShield AI is a **read-only analyzer**: no Block/Isolate/mitigation
  buttons in the frontend; "Recommended Actions" are advisory only.
- Backend `FlowRecord` only carries cyber fields via optional metadata
  (`dns_qname`, `tls_ja3`); the numeric ML vector is fixed at
  `FEATURE_COLUMNS` (20) — new features go through rules/evidence, not the
  vector.
- Tailwind v4 quirk: `.inline-flex`/`.flex` override `.hidden`, so a class
  list that ALSO carries a base display utility (e.g. `FlowPair` in
  `components/alerts/AlertRow.tsx`) makes `hidden xl:inline-flex` permanently
  visible at every width — the responsive-hide breaks. Don't bolt `hidden`
  onto an element that already has `inline-flex`; instead render conditionally
  with `useMediaQuery` (`hooks/useMediaQuery.ts`, breakpoint check
  `(min-width: 1280px)`). Layout is verified overflow-free at 1440/1366/1280/
  1024/768/640/390; `Card` components carry `min-w-0` so grid/flex tracks and
  `overflow-x-auto` wrappers shrink instead of clipping at the app frame's
  `overflow-hidden` root.
- WireGuard: Laptop 1 server `/etc/wireguard/wg0.conf` (tunnel net
  `172.16.250.0/24`, server `172.16.250.1`, server pubkey
  `D2xtJpoZVuM8unhjrgFXu5NBh1eNtfpgiCvuX0CIYwo=`); Laptop 2 Windows client
  pubkey `gGC6ZZAajuFyhLrP/3VAKuFysu7C4QNcULYuGxPHwzw=` (peer `.2`, importable
  config `docs/wireguard/laptop2-windows.conf`). Endpoints `171.79.55.84:51820`
  (public, dynamic) / `10.21.21.131:51820` (LAN). After a machine reset
  regenerate with `backend/app/scripts/setup-wireguard.sh server` + a fresh
  client keypair; demo steps in `docs/Presentation-Steps.md`.