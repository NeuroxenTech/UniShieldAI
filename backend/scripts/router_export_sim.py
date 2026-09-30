#!/usr/bin/env python3
"""Router flow-export simulator for the UniShield unidirectional enclave.

Emulates a peering/gateway ROUTER that passively exports NetFlow v5 records of
the traffic CROSSING its WAN<->LAN link (the PS 26145 input surface). It sends
real NetFlow v5 datagrams to the backend's flow-export listener (udp :2055),
which feeds the exact same detection pipeline as the packet sensor — proving
the enclave detects threats from *router exports* alone, with no return path.

Scenarios (all framed as traffic transiting the router):
  * mix      : benign bulk + SYN flood + UDP flood + port scan + C2 beaconing
  * benign   : iPerf-style LAN->WAN bulk + DNS/HTTPS trickle (no alerts)
  * syn_flood: WAN spoofed-source SYN burst toward LAN:80
  * udp_flood: WAN spoofed-source UDP burst toward LAN:1234
  * port_scan: single WAN source fanning out to many LAN ports
  * c2_beacon: LAN host beaconing out to a single public C2 at fixed intervals

Usage:
  PYTHONPATH=<backend> python scripts/router_export_sim.py \
      --host 127.0.0.1 --port 2055 --duration 8 --scenario mix
"""

import argparse
import random
import socket
import struct
import sys
import time
from datetime import datetime, timezone

# TEST-NET ranges reserved for documentation (RFC 5737) — never route anywhere,
# so they read as "Internet" without polluting real addressing.
WAN = "203.0.113."     # attacker / internet side
C2 = "198.51.100.66"   # beacon destination
LAN_HOST = "10.0.2.10" # victim on the campus LAN
LAN_USER = "10.0.2.20" # benign user machine
LAN_SERVER = "10.0.2.30"

_UPTIME = [100000]  # monotonic ms counter (shared mutable tick)


def tick(dt_ms: int) -> int:
    _UPTIME[0] += dt_ms
    return _UPTIME[0]


def _v5_record(src: str, dst: str, src_port: int, dst_port: int, proto: int,
               pkts: int, octets: int, flags: int = 0, first_ms: int = 0,
               last_ms: int = 0) -> bytes:
    rec = struct.pack(
        ">4s4s4sHHIIIIHHBBBBHHBB",
        socket.inet_aton(src), socket.inet_aton(dst), b"\0\0\0\0",  # nexthop
        0, 0,                        # input, output
        pkts, octets,                # dPkts, dOctets
        first_ms, last_ms,           # flow start/end (uptime ms)
        src_port, dst_port,
        0, flags, proto, 0,          # pad, tcp flags, proto, tos
        0, 0,                        # src_as, dst_as
        0, 0,                        # src_mask, dst_mask
    ) + struct.pack(">H", 0)        # pad2
    assert len(rec) == 48
    return rec


def _v5_datagram(sid: int, records: list[bytes], export_ts: float | None = None) -> bytes:
    ts = export_ts or time.time()
    secs, nsecs = int(ts), int((ts % 1) * 1e9)
    uptime = _UPTIME[0]
    hdr = struct.pack(
        ">HHIIIIBBH",
        5, len(records), uptime,
        secs, nsecs, sid, 0, 0, 0,
    )
    return hdr + b"".join(records)


def _now() -> float:
    return datetime.now(timezone.utc).timestamp()


def mk_flow(proto: int, src_port: int, dst_port: int, flags: int = 0,
            pkts: int = 8, octets: int | None = None) -> tuple[str, str, int, int, int, int, int]:
    """(src,dst,src_port,dst_port,proto,pkts,flags) factory for WAN->LAN flows."""
    src = WAN + str(random.randint(1, 250))
    return src, LAN_HOST, src_port, dst_port, proto, pkts, flags


def mk_flow_out(proto: int, src_port: int, dst_port: int,
                pkts: int = 8) -> tuple[str, str, int, int, int, int, int]:
    """LAN->WAN flow (outbound from the campus side)."""
    src = LAN_USER
    return src, WAN + str(random.randint(1, 250)), src_port, dst_port, proto, pkts, 0


class RouterSim:
    def __init__(self, host: str, port: int, seed: int):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.addr = (host, port)
        self.seq = 0
        random.seed(seed)

    def send(self, records: list[bytes]) -> None:
        if not records:
            return
        self.seq += 1
        payload = _v5_datagram(self.seq, records)
        self.sock.sendto(payload, self.addr)

    def send_flows(self, flows: list[tuple], dt_ms: int, burst: bool = False,
                   octets_per_pkt: int = 120, first_ms: int | None = None,
                   last_ms: int | None = None) -> None:
        """Wrap up to 30 flows per v5 datagram (the NetFlow count ceiling)."""
        up = tick(dt_ms)
        f = first_ms if first_ms is not None else max(0, up - dt_ms)
        l = last_ms if last_ms is not None else up
        recs = []
        for fl in flows:
            src, dst, sp, dp, proto, pkts = fl[:6]
            flags = fl[6] if len(fl) > 6 else 0
            recs.append(
                _v5_record(src, dst, sp, dp, proto, pkts,
                           octets_per_pkt * pkts, flags, f, l)
            )
        for i in range(0, len(recs), 30):
            self.send(recs[i:i + 30])

    # ---- scenario builders -------------------------------------------------
    def benign(self, duration: float) -> None:
        t0 = time.time()
        while time.time() - t0 < duration:
            flows = []
            for _ in range(8):
                sp, dp = random.randint(1024, 49151), random.randint(49152, 65000)
                flows.append(mk_flow_out(6, sp, dp, pkts=random.randint(4, 20)))
            flows.append(mk_flow_out(17, 5353, 53, pkts=2))      # DNS trickle
            self.send_flows(flows, 250)
            time.sleep(0.25)
            for _ in range(4):
                sp, dp = random.randint(1024, 49151), random.randint(1024, 65000)
                self.send_flows([mk_flow_out(6, sp, dp, pkts=random.randint(40, 400))], 500)
            time.sleep(0.5)

    def syn_flood(self, duration: float) -> None:
        t0 = time.time()
        while time.time() - t0 < duration:
            flows = [mk_flow(6, random.randint(1024, 65535), 80, flags=0x02, pkts=4) for _ in range(25)]
            self.send_flows(flows, 120)
            time.sleep(0.12)

    def udp_flood(self, duration: float) -> None:
        t0 = time.time()
        while time.time() - t0 < duration:
            flows = [mk_flow(17, random.randint(1024, 65535), 1234, pkts=6) for _ in range(25)]
            self.send_flows(flows, 120)
            time.sleep(0.12)

    def port_scan(self, duration: float) -> None:
        src = WAN + str(random.randint(1, 250))
        ports = [21, 22, 23, 25, 53, 80, 110, 135, 139, 443, 445, 3306, 5432, 8080, 8443]
        t0 = time.time()
        while time.time() - t0 < duration:
            for _ in range(3):
                for p in ports:
                    self.send_flows([(src, LAN_HOST, random.randint(2048, 65535), p, 6, 1, 0x02)], 30)
                time.sleep(0.03)

    def c2_beacon(self, duration: float) -> None:
        t0 = time.time()
        # fixed src port + fixed C2 dest = one persistent 5-tuple (periodicity accumulates)
        flow = (LAN_USER, C2, 22444, 4444, 6, 4, 0x18)  # PSH+ACK
        n = 0
        while time.time() - t0 < duration:
            self.send_flows([flow], 250, octets_per_pkt=160)
            n += 1
            time.sleep(1.0)

    def mix(self, duration: float) -> None:
        phases = [
            ("benign", 0.30),
            ("syn_flood", 0.35),
            ("udp_flood", 0.45),
            ("port_scan", 0.55),
            ("c2_beacon", 1.00),
        ]
        runner = {
            "benign": self.benign,
            "syn_flood": self.syn_flood,
            "udp_flood": self.udp_flood,
            "port_scan": self.port_scan,
            "c2_beacon": self.c2_beacon,
        }
        for name, frac in phases:
            step_t0 = time.time()
            sub = duration * frac
            end = time.time() + sub
            while time.time() < end:
                runner[name](min(0.6, end - time.time()))
            print(f"  [mix] {name} done in {time.time() - step_t0:.1f}s", flush=True)

    def _close(self) -> None:
        try:
            self.sock.close()
        except Exception:
            pass


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=2055)
    ap.add_argument("--duration", type=float, default=8.0)
    ap.add_argument("--seed", type=int, default=4242)
    ap.add_argument("--scenario", default="mix",
                    choices=["mix", "benign", "syn_flood", "udp_flood", "port_scan", "c2_beacon"])
    args = ap.parse_args()

    sim = RouterSim(args.host, args.port, args.seed)
    t0 = time.time()
    print(f"Router export sim → udp://{args.host}:{args.port} scenario={args.scenario} "
          f"dur={args.duration}s", flush=True)
    getattr(sim, args.scenario)(args.duration)
    print(f"Done in {time.time() - t0:.1f}s (watched on the live feed)", flush=True)


if __name__ == "__main__":
    sys.exit(main())