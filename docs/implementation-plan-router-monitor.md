# Implementation Plan — Router Link / Unidirectional Enclave Monitor

Status: **MOSTLY EXECUTED.** The backend NetFlow/IPFIX/sFlow ingester is
implemented and running (UDP `:2055`), and the router-level lab tooling —
`backend/scripts/router_export_sim.py` (emits real NetFlow v5 of traffic
crossing a WAN↔LAN gateway) and `backend/app/scripts/setup-router-vm.sh`
(VirtualBox router VM) — is written and **verified end-to-end**. Remaining
items: the measured throughput figure (Change 2) and optional JA3 (Change 5).

The background and constraints of 26145 (read-only ingest via data
diode / SPAN mirror of the gateway link; NetFlow/IPFIX/sFlow + pcap as input;
no return path, no payload decryption, streaming alerts, standardized alert
schema) are satisfied **architecturally** by the current engine. Sections
below mark what has been applied vs. what is still open.

> When the user says "execute", apply these in order. Each section is an
> actionable step with verification.

---

## How the current system already fits 26145

| 26145 requirement | Current status |
|-------------------|----------------|
| (a) Read-only ingest; no return path / no inline block | ✅ Engine only consumes flows/pcap; never probes or blocks. |
| (b) No payload decryption; TLS/QUIC from metadata | ✅ Detection is flow-feature based; no decryption. |
| (c) Streaming, incremental, bounded-latency alerts | ✅ REST + `/ws` + `/ws/alerts` publish per-flow decisions. |
| (e) Standardized alert schema (timestamp, flow id, threat class, confidence, evidence) | ✅ `AlertOut` includes all of these. |
| Detect: DDoS, C2 beaconing, DGA/DNS tunnel, recon/scan, exfil | ✅ Rules + ML cover these classes. |

Reference frames in this doc:
- **Monitoring enclave** = Laptop 1 (backend / analytics, isolated, no path back to production).
- **Sensor / tap** = Laptop 2 (passive tap mirroring the router link). See `docs/vm-testing.md`, `docs/windows-setup.md`.
- **"Link being monitored"** = the internet-facing gateway/peering link, mirrored read-only into the enclave.
- **Router lab (no VM needed):** `backend/scripts/router_export_sim.py` streams real NetFlow v5 of traffic crossing a simulated WAN⇄LAN router straight into the enclave's UDP `:2055`. Fully software-only; verified working.

---

## Change 1 — Add a NetFlow / IPFIX / sFlow ingester  ✅ DONE

**Why:** 26145 explicitly lists "exported flow records (NetFlow/IPFIX/sFlow)"
as a supported input. Current ingest is flow-JSON (`POST /api/v1/traffic/flows`)
and pcap (`ScapyParser`). A router exporting flows to the enclave needs a
standard-format parser.

**Implemented (live):**
- `backend/app/ingestion/netflow.py` — `NetFlowV5Parser`, `NetFlowV9Parser`,
  `IPFIXParser`, `SFlowParser`.
- `backend/app/ingestion/flow_export_listener.py` — UDP listener on
  `netflow_udp_port` **2055**, one datagram → one `FlowRecord` batch into the
  pipeline; started from `app/main.py`.
- `backend/app/api/traffic.py` — `POST /api/v1/traffic/netflow` accepts raw
  exported datagrams over HTTP too.
- `flow_export_listener.stats()` (`datagrams_received / records_parsed /
  records_rejected`) exposed via `GET /api/v1/metrics/engine`.

**Acceptance verified:** a real NetFlow v5 mix run →
`datagrams_received 3407 / records_parsed 5375 / records_rejected 0`, and
17 alerts surfaced from router exports alone (see "Change 6 — Router lab").

---

## Change 2 — Document the throughput target (constraint d)

**Why:** 26145 requires the solution to state and demonstrate the traffic
rate it was tested against (flows/sec or Mbps sustained).

**Files:**
- Edit: `backend/README.md` — add a "Throughput / tested rate" section.
- Edit: `docs/deployment.md` — add a "Performance / throughput" subsection.
- Optionally add `backend/scripts/benchmark_ingest.py` to measure
  flows/sec sustained through `POST /api/v1/traffic/flows`.

**Content to provide (measured value is inferred; fill with the actual number
from a benchmark run):**
- Sustained `flows/sec` the engine processed with bounded queue depth.
- Sustained `Mbps` equivalent (average flow size × flows/sec).
- Config window: `ROLLING_WINDOW_SEC` / `PIPELINE_QUEUE_SIZE` / `MAX_CONCURRENT_FLOWS`.

**Acceptance:** README and deployment docs state the tested rate and how it
was measured.

---

## Change 3 — Reframe docs as a router-link / border enclave monitor

**Why:** The dashboards/docs currently describe a single LAN being watched.
26145 wants the *enclave* observing a *gateway/peering link*.

**Files / edits (documentation only; no engine change):**
- `docs/architecture.md` — add a short "Deployment = monitoring enclave"
  note: the flow sources (sFlow/IPFIX mirror, pcap tap, sensor VM) represent
  a passive mirror of the router link; the backend is the enclave.
- `docs/detection.md` — already maps lab scenarios to internet-facing
  attackers (hping3/tr/rex, Slowloris, dnscat2/iodine, DGA); add an explicit
  "border/gateway link" framing sentence.
- `docs/vm-testing.md` / `docs/windows-setup.md` — label Laptop 2 tap as
  "mirroring the router link", Laptop 1 as "enclave".
- `backend/README.md` — first paragraph: describe the system as monitoring a
  unidirectional gateway link tap/enclave (data-diode / SPAN), read-only.

**Acceptance:** Reading the docs, a reviewer sees the enclave + passive
mirror-of-router-link model, not a single-laptop monitor.

---

## Change 4 — Scenario mapping table already aligned (verify only)

**Why:** The problem statement's dataset list (iperf3/Ostinato/TRex benign;
hping3 SYN/UDP; Slowloris; dnscat2/iodine; DGA samples; sandboxed C2
emulator) maps to existing synthetic scenarios. This is documentation-only
verification, applied with Change 3.

**Files:** `docs/detection.md` "Scenario → detection mapping" table is the
single source; confirm lab-tool names (`Ostinato`, `TRex`, `DGArchive`,
`dnscat2`, `iodine`) appear next to the threat types.

---

## Change 5 — (Optional, deferred) Production-styled fingerprinting

**Why:** 26145 part (d) mentions JA3/JA3S/JA4 from TLS/QUIC metadata. The
current engine uses flow/feature detection, not cipher-string fingerprinting.
Not required to satisfy the base constraints; only add if extra guardrail
coverage is wanted.

**Files (new, not started):**
- `backend/app/features/tls.py` — parse TLS ClientHello from pcap to derive a
  JA3-like string.
- Wire into `ScapyParser`/flow record as an optional `tls_ja3` field.
- Add `tls_ja3` to the feature set (would require retraining if added to
  `FEATURE_COLUMNS` — **keep out of the ML vector** to avoid retraining; use
  it as a rule input only).

**Acceptance (if executed):** a TLS flow yields a JA3 string surfaced in
evidence. NOT needed for the main deliverable.

---

## Change 6 — Router-level lab tooling  ✅ DONE (verified)

**Why:** the actual 26145 scenario is "monitor the router/gateway's traffic",
not two laptops. This change delivers the router-side input surface two ways.

**Files:**
- New: `backend/scripts/router_export_sim.py` — **no-VM simulator.** Emits
  genuine NetFlow v5 export datagrams (UDP `:2055`, or any `--host/--port`)
  representing traffic crossing a gateway between TEST-NET WAN
  (`203.0.113.x` / `198.51.100.x`) and LAN (`10.0.2.x`). Scenarios:
  `benign`, `syn_flood`, `udp_flood`, `port_scan`, `c2_beacon`, `mix`
  (`--scenario`, `--duration`, `--seed`). Batches ≤30 records/datagram.
- New: `backend/app/scripts/setup-router-vm.sh` — creates the **VirtualBox
  router VM** on Laptop 2: 3 internal nets (`wan`/`lan`/`mirror`) + NAT, disk/
  memory sizing, and a paste-in bootstrap block:
  - `ip_forward` + NAT `MASQUERADE` (the router actually forwards),
  - packet mirror to the enclave with `iptables -t mangle ... -j TEE --gateway <monitor>`,
  - flow export with `softflowd -i eth0 -v 5 -n <enclave-IP>:2055`.

**Verified end-to-end (Laptop 1, backend running):**
```sh
PYTHONPATH=$PWD python scripts/router_export_sim.py --scenario mix --duration 12 --seed 777
```
Result: `flow_export: received 3407 datagrams / parsed 5375 records / 0
rejected` (`/api/v1/metrics/engine`) and 17 alerts from router exports alone:
`c2_communication` 1.0, `port_scan` 1.0, `ddos` TCP 1.0, `ddos` UDP 1.0, ...
— **no packet capture involved; pure exported-flow input.**

**Run the physical variant (Laptop 2):**
```sh
# router VM (VirtualBox on Laptop 2) + attacker VM; then paste the in-VM block
./backend/app/scripts/setup-router-vm.sh router
# in-VM bootstrap (see script header): ip_forward, MASQUERADE,
# iptables TEE → mirror, softflowd -i eth0/eth1 -v 5 -n <L1-tailscale-ip>:2055
```

---

## Execution order (partly done)

1. **Change 1** (ingester) — **done**, verified.
2. **Change 6** (router lab) — **done**, verified via simulator; physical VM
   script written (`setup-router-vm.sh`) and awaiting Laptop 2.
3. **Change 2** (throughput) — open: run the benchmark, fill in the number,
   document in README/deployment.
4. **Change 3 + 4** (docs framing / scenario table) — open: labels already
   updated where they bite; final sweep pending.
5. **Change 5** (JA3) — deferred, only if requested.

## Notes / risks
- Adding `tls_ja3` to `FEATURE_COLUMNS` would invalidate trained models;
  Change 5 deliberately avoids that by staying a rule-only input.
- The NetFlow/sFlow endpoint must trust the mirrored stream boundary — no
  authentication over the wire in a lab; document that the enclave boundary
  provides the trust, matching the data-diode model (read-only, no return
  path).