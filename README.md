# UniShield AI

**AI-based detection of cyber threats in unidirectional IP traffic** — a passive,
streaming threat-detection enclave that monitors router-level gateway links on a
strictly read-only basis and raises standardized, evidence-backed alerts for
attacks against **any device** behind the router.

Built for Problem Statement **26145** (NTRO): detect DDoS, C2 beaconing,
DGA/DNS tunneling, scaling/recon, and data exfiltration on links that give you
**no return path, no inline inspection, and no payload decryption**.

> **Why "unidirectional"?** The monitored network sends traffic one way (data
> diode / SPAN mirror) and there is no route back into it. This system only
> *ingests* the metadata the router already produces — it never blocks, never
> mitigates, and never decrypts payloads. The enclave is unreachable from the
> network it watches.

---

## What it does

- **Router-level, multi-device monitoring** — one monitored link = every host
  behind the router is watched; attacks on any device alert individually
  (`dst_ip` on every alert).
- **Read-only inputs, two interchangeable legs:**
  - **Flow export:** NetFlow v5/v9, IPFIX v10, sFlow v5 over UDP (default port
    `2055`) — the native output of production routers, softflowd, pmacctd,
    nfacctd. Ideal for data-diode perimeters.
  - **Packet mirror:** SPAN/TEE truncated captures or PCAP replay, which adds
    DNS query-name and TLS metadata to the evidence.
- **Fused detection engine:** behavioral/signature rules (SYN & UDP floods,
  slowloris, port sweeps, C2 beaconing, DNS tunneling by name entropy, brute
  force, exfiltration asymmetry) + XGBoost classifier over ~20 traffic features
  for volume/anomaly catching — merged into one calibrated risk score and
  severity.
- **Standardized alert schema:** timestamp, flow ID, src/dst IP & port,
  protocol, threat class, confidence, severity, and the evidence behind the
  decision (matched rules, feature values, score breakdown) — SIEM/audit ready.
- **Real-time delivery:** WebSocket dashboard (ongoing floods refresh ~2s via
  live pulses, dedup so a high-rate attack produces one actionable alert, not
  spam), REST API, and push notifications (Telegram / ntfy) to operator phones.

## Detection coverage

| Threat class | Detector |
|---|---|
| TCP SYN flood / UDP flood (DDoS) | behavioral flood rules |
| Slowloris HTTP DoS | low-and-slow TCP rule |
| Port scans / sweeps | unique-port + flow-frequency rules |
| C2 beaconing | periodic-connection rule |
| DGA / DNS tunneling | whole-qname entropy rule |
| Brute-force access | auth-frequency rule |
| Data exfiltration | outbound/inbound ratio rule |
| Generic suspicious volume / reconnaissance | XGBoost + anomaly ML |

---

## Repository layout

```
frontend/            React 18 + TypeScript + Vite 6 + Tailwind CSS v4 (SOC dashboard)
backend/             Python FastAPI + WebSocket + Scapy detection pipeline
  app/               ingest, features, rules, ML, decision, realtime WS, notifications
  scripts/           Python tools: router_export_sim, generate_test_traffic, attack-suite, sensors
  app/scripts/       shell scripts: setup-router-vm.sh, setup-vm-lab.sh, run-sensor.sh, setup-wireguard.sh
  tests/             23 backend unit/integration tests
docs/                architecture, api, detection, deployment, router-lab, VM-lab, presentation
```

Pointers: `docs/architecture.md` (data flow), `docs/api.md` (API reference),
`docs/detection.md` (pipeline & scenario mapping), `docs/deployment.md`
(environments), `docs/implementation-plan-router-monitor.md` (26145 alignment),
`docs/laptop2-router-setup.md` (real router-lab on Laptop 2).

---

## Prerequisites

- **Python 3.12+** (venv recommended)
- **Node.js 20+** with npm
- Backend deps: `fastapi uvicorn scapy pydantic pydantic-settings aiosqlite
  numpy psutil sqlalchemy structlog xgboost joblib scikit-learn pytest
  pytest-asyncio httpx websockets` (install via `requirements.txt`).
  `websockets`/`uvicorn[standard]` is required for the realtime websockets.

---

## Run it — step by step

### 1. Backend (detection engine + API)

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # no secrets needed to run locally
PYTHONPATH=$PWD python app/main.py
```

Server starts on `0.0.0.0:8000` (see `.env`: `HOST`/`PORT`). It also starts the
NetFlow/IPFIX/sFlow UDP collector on `:2055` automatically.

### 2. Frontend (SOC dashboard)

```bash
cd frontend
npm install
npm run dev                # http://localhost:5173
```

Vite proxies `/api` and `/ws` to the backend on `:8000`.

### 3. Verify

```bash
curl http://localhost:8000/api/v1/metrics          # engine snapshot
curl http://localhost:8000/api/v1/alerts           # live-session alerts
curl http://localhost:8000/api/v1/metrics/engine   # includes flow_export stats
# API docs: http://localhost:8000/docs
```

### 4. Optional: phone / push alerts (`.env`)

Telegram (verified channel):

```env
SMS_ENABLED=true
SMS_PROVIDER=telegram
TELEGRAM_BOT_TOKEN=<bot token>
TELEGRAM_CHAT_ID=<chat1>,<chat2>,...
```

ntfy.sh push:

```env
NTFY_ENABLED=true
NTFY_URL=https://ntfy.sh
NTFY_TOPIC=your-topic
```

> All secrets live in `backend/.env` (gitignored) — never commit them.

---

## Testing

```bash
# backend — 23 tests
cd backend && PYTHONPATH=$PWD python -m pytest tests -q

# frontend
cd frontend
npm run lint               # ESLint (0 errors)
npm run build              # tsc -b && vite build
npm run test               # Playwright E2E (21 tests, auto-starts dev server)
```

---

## Real lab setup (router-level, Laptop 2)

The full, copy-paste runbook is **`docs/laptop2-router-setup.md`**. Summary:

```
attacker(wan) ──► ROUTER ◄── targets(lan: .20 web, .21 mail, .22 desktop)
                        │   two one-way legs into the enclave:
                        ├─ (a) iptables TEE mirror  → sensor VM (pcap / flows)
                        └─ (b) softflowd/pmacctd    → Laptop 1 UDP :2055 (NetFlow/sFlow)
```

Out of the box:

```bash
# 1. Router VM (VirtualBox on Laptop 2): 3 internal nets wan/lan/mirror + NAT
./backend/app/scripts/setup-router-vm.sh router

# 2. In-VM bootstrap (router OS): ip_forward, MASQUERADE,
#    iptables TEE → mirror lane, softflowd → <enclave-ip>:2055
#    (exact steps in the script header + docs/laptop2-router-setup.md §2)

# 3. Sensor VM on the mirror lane streams flows to the enclave:
python3 backend/scripts/run_sensor_standalone.py -i enp0s3 -u http://<L1-tailscale-ip>:8000

# 4. Attacker on wan against a LAN target:
./backend/scripts/attack-suite.sh 10.0.2.20
```

Legacy two-VM lab (old sensor+attacker topology): `docs/vm-testing.md`
(Linux host) / `docs/windows-setup.md` (Windows host), created by
`setup-vm-lab.sh`. WireGuard peering between laptops:
`backend/app/scripts/setup-wireguard.sh server|client`.

## Demo without hardware

Two no-VM paths prove the engine end-to-end on one machine:

```bash
# Real NetFlow v5 router-export simulation (mix = benign + floods + scan + C2):
cd backend && PYTHONPATH=$PWD python scripts/router_export_sim.py --scenario mix --duration 12 --seed 777
# → watch /api/v1/alerts + dashboard; floods alert within ~2s

# Synthetic scenario traffic through the JSON ingest path:
cd backend && PYTHONPATH=$PWD python scripts/generate_test_traffic.py --fps 50 --duration 5

# Replay a PCAP into the pipeline:
cd backend && PYTHONPATH=$PWD python scripts/replay_pcap.py path/to/file.pcap
```

---

## Common gotchas

- Backend tuning is read from **`backend/.env`**, not `config.py` defaults —
  edit the env file.
- Restart the backend to clear the in-memory live alert store before judging a
  fresh demo run (alerts are live-session only).
- `websockets` must be installed or every `/ws` upgrade fails and the UI
  silently degrades to 5s polling.
- Attack-suite specifics: slowloris needs a real `:80` listener on the target;
  the C2 beacon must bind a fixed local port. See `scripts/attack-suite.sh`.

## License

MIT (see `LICENSE`).