#!/usr/bin/env python3
"""Standalone UniShield sensor — single-file, no backend clone required.

Sniffs mirrored lab traffic on a tap/SPAN interface with Scapy, aggregates
packets into 1s flow records (5-tuple), extracts DNS query names from client
AND server queries (dst_port==53 OR src_port==53), and POSTs batches to the
UniShield backend over WireGuard.

Run on Laptop 2 (inside the sensor VM) as root:

    python3 run_sensor_standalone.py -i enp0s8 -u http://172.16.250.1:8000

Only dependencies: scapy + requests. (pip install scapy requests)
"""

import argparse
import sys
import time
from collections import defaultdict
from datetime import datetime, timezone

try:
    import requests
except ImportError:
    sys.exit("ERROR: `requests` not installed. Run: pip install requests")

FLOW_KEYS = ("src_ip", "dst_ip", "src_port", "dst_port", "protocol")


def tcp_flags(pkt) -> dict:
    from scapy.all import TCP

    f = pkt[TCP].flags
    return {
        "syn": 1 if f & 0x02 else 0,
        "ack": 1 if f & 0x10 else 0,
        "rst": 1 if f & 0x04 else 0,
        "fin": 1 if f & 0x01 else 0,
    }


def extract_dns_qname(pkt):
    try:
        from scapy.all import DNS, DNSQR

        if DNS in pkt and pkt[DNS].qd and DNSQR in pkt[DNS]:
            qname = pkt[DNS][DNSQR].qname
            if isinstance(qname, bytes):
                qname = qname.decode("utf-8", "replace").rstrip(".")
            else:
                qname = str(qname).rstrip(".")
            return qname or None
    except Exception:
        return None
    return None


def parse_packet(pkt, local_ip: str | None = None):
    """Return (key, meta) for one IP packet, or None.

    When local_ip is set, only INBOUND packets (dst == local_ip) are
    forwarded. The sensor is the lab target/SPAN host, so it should only
    report attacker->sensor traffic; the reverse half (sensor SYN-ACK/RST
    replies) must not generate its own alerts on the backend.
    """
    from scapy.all import IP, TCP, UDP, ICMP, Raw

    if pkt is None or IP not in pkt:
        return None
    ip = pkt[IP]
    if local_ip is not None and ip.dst != local_ip:
        return None
    protocol = "tcp"
    s_port = d_port = None
    dns_qname = None
    tls_payload = None
    if TCP in pkt:
        f = tcp_flags(pkt)
        s_port, d_port = pkt[TCP].sport, pkt[TCP].dport
        if d_port == 443 and Raw in pkt:
            tls_payload = bytes(pkt[Raw].load)
    elif UDP in pkt:
        protocol = "udp"
        f = {"syn": 0, "ack": 0, "rst": 0, "fin": 0}
        s_port, d_port = pkt[UDP].sport, pkt[UDP].dport
        if s_port == 53 or d_port == 53:
            dns_qname = extract_dns_qname(pkt)
    elif ICMP in pkt:
        protocol = "icmp"
        f = {"syn": 0, "ack": 0, "rst": 0, "fin": 0}
    else:
        return None
    key = (ip.src, ip.dst, s_port, d_port, protocol)
    meta = {
        "packets": 1,
        "bytes": len(pkt),
        "ts": float(pkt.time),
        "syn": f["syn"],
        "ack": f["ack"],
        "rst": f["rst"],
        "fin": f["fin"],
        "dns": dns_qname,
        "ja3": None,
        "tls_payload": tls_payload,
    }
    return key, meta


def to_record(meta, key):
    src_ip, dst_ip, src_port, dst_port, protocol = key
    rec = {
        "ts": datetime.fromtimestamp(meta["ts"], tz=timezone.utc).isoformat(),
        "src_ip": src_ip,
        "dst_ip": dst_ip,
        "src_port": src_port,
        "dst_port": dst_port,
        "protocol": protocol,
        "packet_count": meta["packets"],
        "byte_count": meta["bytes"],
        "syn_count": meta["syn"],
        "ack_count": meta["ack"],
        "rst_count": meta["rst"],
        "fin_count": meta["fin"],
    }
    if meta["dns"] is not None:
        rec["dns_query"] = meta["dns"]
    if meta["ja3"] is not None:
        rec["tls_ja3"] = meta["ja3"]
    return rec


def main():
    parser = argparse.ArgumentParser(description="UniShield standalone sensor")
    parser.add_argument("-i", "--iface", required=True, help="tap/SPAN interface")
    parser.add_argument("-u", "--url", default="http://172.16.250.1:8000")
    parser.add_argument("--batch", type=int, default=100)
    parser.add_argument("--window", type=float, default=1.0)
    parser.add_argument("--local-ip", default=None,
                        help="only forward inbound flows to this IP (e.g. 10.0.10.10)")
    args = parser.parse_args()

    from scapy.all import sniff

    print(f"[sensor] sniffing {args.iface} -> {args.url} (batch={args.batch}, inbound_only={args.local_ip})")

    window_meta = defaultdict(lambda: {
        "packets": 0, "bytes": 0, "ts": None,
        "syn": 0, "ack": 0, "rst": 0, "fin": 0,
        "dns": None, "ja3": None, "tls_payload": None,
    })

    def flush():
        if not window_meta:
            return
        records = [to_record(m, k) for k, m in window_meta.items()]
        window_meta.clear()
        try:
            r = requests.post(
                f"{args.url.rstrip('/')}/api/v1/traffic/flows",
                json={"sensor_id": "unishield-sensor", "flows": records},
                timeout=5.0,
            )
            r.raise_for_status()
            print(f"[sensor] sent {len(records)} flows ({r.status_code})", flush=True)
        except Exception as exc:
            print(f"[sensor] send failed ({len(records)} flows): {exc}", flush=True)

    def handle(pkt):
        parsed = parse_packet(pkt, local_ip=args.local_ip)
        if parsed is None:
            return
        key, meta = parsed
        cur = window_meta[key]
        cur["packets"] += meta["packets"]
        cur["bytes"] += meta["bytes"]
        cur["ts"] = meta["ts"] if cur["ts"] is None else min(cur["ts"], meta["ts"])
        cur["syn"] = max(cur["syn"], meta["syn"])
        cur["ack"] = max(cur["ack"], meta["ack"])
        cur["rst"] = max(cur["rst"], meta["rst"])
        cur["fin"] = max(cur["fin"], meta["fin"])
        if meta["dns"] is not None and cur["dns"] is None:
            cur["dns"] = meta["dns"]
        if meta["ja3"] is not None and cur["ja3"] is None:
            cur["ja3"] = meta["ja3"]

    while True:
        window_meta.clear()
        sniff(iface=args.iface, prn=handle, count=args.batch, timeout=args.window, store=False)
        flush()
        time.sleep(0.05)


if __name__ == "__main__":
    main()