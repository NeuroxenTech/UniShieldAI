#!/usr/bin/env python3
"""
UniShield Sensor & Live Capture Pipeline
Captures packets in promiscuous mode from veth3-sensor, aggregates them into
bidirectional flow records, passes them to the Decision Engine, and streams
verdicts to the WebSocket backend server.
"""

import sys
import os
import json
import time
import argparse
import threading
from datetime import datetime, timezone
from collections import defaultdict

# Add parent directory to path to allow importing decision_engine
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    from decision_engine import UniShieldDecisionEngine
    HAS_DECISION_ENGINE = True
except ImportError:
    HAS_DECISION_ENGINE = False

try:
    from scapy.all import sniff, IP, TCP, UDP, ICMP, DNS, DNSQR
    HAS_SCAPY = True
except ImportError:
    HAS_SCAPY = False

try:
    import urllib.request
    HAS_HTTP = True
except ImportError:
    HAS_HTTP = False


class FlowRecord:
    """Represents a single bidirectional network flow."""
    _counter = 0
    _lock = threading.Lock()

    def __init__(self, src_ip, dst_ip, src_port, dst_port, protocol, initial_pkt_time, initial_bytes, initial_flags):
        with FlowRecord._lock:
            FlowRecord._counter += 1
            self.flow_id = f"FLOW-{FlowRecord._counter:06d}"

        self.start_time = initial_pkt_time
        self.last_time = initial_pkt_time
        self.timestamp = datetime.fromtimestamp(initial_pkt_time, tz=timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

        # 5-Tuple
        self.src_ip = src_ip
        self.dst_ip = dst_ip
        self.src_port = src_port
        self.dst_port = dst_port
        self.protocol = protocol

        # Metrics
        self.packets = 1
        self.bytes = initial_bytes
        self.orig_bytes = initial_bytes
        self.resp_bytes = 0

        # Flag distribution
        self.syn = 1 if 'S' in initial_flags else 0
        self.ack = 1 if 'A' in initial_flags else 0
        self.rst = 1 if 'R' in initial_flags else 0
        self.fin = 1 if 'F' in initial_flags else 0

        self.is_terminated = False

    def update(self, is_orig, pkt_time, pkt_len, flags):
        self.last_time = pkt_time
        self.packets += 1
        self.bytes += pkt_len

        if is_orig:
            self.orig_bytes += pkt_len
        else:
            self.resp_bytes += pkt_len

        if 'S' in flags: self.syn += 1
        if 'A' in flags: self.ack += 1
        if 'R' in flags:
            self.rst += 1
            self.is_terminated = True
        if 'F' in flags:
            self.fin += 1
            if self.fin >= 2:
                self.is_terminated = True

    @property
    def duration(self):
        return round(max(0.001, self.last_time - self.start_time), 3)

    def to_dict(self):
        return {
            "flow_id": self.flow_id,
            "timestamp": self.timestamp,
            "src_ip": self.src_ip,
            "dst_ip": self.dst_ip,
            "src_port": self.src_port,
            "dst_port": self.dst_port,
            "protocol": self.protocol,
            "duration": self.duration,
            "packets": self.packets,
            "bytes": self.bytes,
            "syn": self.syn,
            "ack": self.ack,
            "rst": self.rst,
            "fin": self.fin,
            "orig_bytes": self.orig_bytes,
            "resp_bytes": self.resp_bytes
        }


class UniShieldSensorPipeline:
    """Orchestrates packet capture, flow aggregation, decision evaluation, and telemetry pushing."""

    def __init__(self, idle_timeout=3.0, output_file="flows.jsonl", backend_url="http://localhost:8000"):
        self.active_flows = {}
        self.lock = threading.Lock()
        self.idle_timeout = idle_timeout
        self.output_file = output_file
        self.backend_url = backend_url
        self.running = True

        self.decision_engine = UniShieldDecisionEngine() if HAS_DECISION_ENGINE else None

        # Expiration thread
        self.expiration_thread = threading.Thread(target=self._expiration_loop, daemon=True)
        self.expiration_thread.start()

    def _get_key(self, src_ip, dst_ip, src_port, dst_port, proto):
        f_key = (src_ip, dst_ip, src_port, dst_port, proto)
        r_key = (dst_ip, src_ip, dst_port, src_port, proto)
        if f_key in self.active_flows:
            return f_key, True
        elif r_key in self.active_flows:
            return r_key, False
        else:
            return f_key, True

    def process_packet(self, packet):
        if not packet.haslayer(IP):
            return

        ip = packet[IP]
        src_ip = ip.src
        dst_ip = ip.dst
        pkt_len = len(packet)
        pkt_time = float(packet.time) if hasattr(packet, 'time') else time.time()

        flags = ""
        src_port = 0
        dst_port = 0
        proto = "OTHER"

        if packet.haslayer(TCP):
            tcp = packet[TCP]
            src_port = tcp.sport
            dst_port = tcp.dport
            proto = "TCP"
            flags = tcp.sprintf('%TCP.flags%')
        elif packet.haslayer(UDP):
            udp = packet[UDP]
            src_port = udp.sport
            dst_port = udp.dport
            proto = "UDP"
        elif packet.haslayer(ICMP):
            proto = "ICMP"

        with self.lock:
            key, is_orig = self._get_key(src_ip, dst_ip, src_port, dst_port, proto)
            if key not in self.active_flows:
                self.active_flows[key] = FlowRecord(src_ip, dst_ip, src_port, dst_port, proto, pkt_time, pkt_len, flags)
            else:
                self.active_flows[key].update(is_orig, pkt_time, pkt_len, flags)

            if self.active_flows[key].is_terminated:
                self._flush_key(key)

    def _flush_key(self, key):
        if key not in self.active_flows:
            return
        flow = self.active_flows.pop(key)
        flow_json = flow.to_dict()

        # Step 1: Save flow JSON
        with open(self.output_file, "a") as f:
            f.write(json.dumps(flow_json) + "\n")

        print(f"\n[+] Extracted Flow: {flow_json['flow_id']} [{flow_json['protocol']}] {flow_json['src_ip']}:{flow_json['src_port']} -> {flow_json['dst_ip']}:{flow_json['dst_port']}")

        # Step 2: Call Decision Engine
        if self.decision_engine:
            verdict = self.decision_engine.process_raw_flow(flow_json)
            print(f"    Verdict: [{verdict['classification']}] Threat Score: {verdict['threat_score']} -> Action: {verdict['action_taken']}")
            if verdict["classification"] != "BENIGN":
                print(f"    \033[91m⚠️ Reason: {verdict['reason']} (MITRE: {verdict['mitre_technique']})\033[0m")
        else:
            verdict = None

        # Step 3: Forward to Backend API if online
        self._push_to_backend(flow_json, verdict)

    def _push_to_backend(self, flow_json, verdict):
        if not HAS_HTTP:
            return
        try:
            url = f"{self.backend_url}/api/v1/flows"
            req_data = {"flow": flow_json, "verdict": verdict}
            req = urllib.request.Request(
                url,
                data=json.dumps(flow_json).encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )
            urllib.request.urlopen(req, timeout=0.5)
        except Exception:
            pass  # Backend may be offline during standalone test

    def _expiration_loop(self):
        while self.running:
            time.sleep(1.0)
            now = time.time()
            with self.lock:
                expired = [k for k, v in self.active_flows.items() if (now - v.last_time) > self.idle_timeout]
                for k in expired:
                    self._flush_key(k)


def main():
    parser = argparse.ArgumentParser(description="UniShield Live Capture & Decision Pipeline")
    parser.add_argument("--interface", "-i", default="veth3-sensor", help="Capture interface (default: veth3-sensor)")
    parser.add_argument("--timeout", "-t", type=float, default=3.0, help="Flow idle timeout in seconds (default: 3.0)")
    parser.add_argument("--output", "-o", default="flows.jsonl", help="Output JSONL filepath")
    parser.add_argument("--backend", "-b", default="http://localhost:8000", help="FastAPI backend URL")
    args = parser.parse_args()

    if not HAS_SCAPY:
        print("[!] Error: Scapy is required for live packet capture. Run: pip install scapy")
        sys.exit(1)

    print("=" * 70)
    print("  🛡️ UniShield Sensor & Live Decision Pipeline")
    print(f"  Sniffing Interface: {args.interface}")
    print(f"  Idle Timeout:       {args.timeout}s")
    print(f"  Decision Engine:    {'Enabled' if HAS_DECISION_ENGINE else 'Disabled'}")
    print(f"  Backend Stream:     {args.backend}")
    print("=" * 70)

    pipeline = UniShieldSensorPipeline(idle_timeout=args.timeout, output_file=args.output, backend_url=args.backend)

    try:
        sniff(iface=args.interface, prn=pipeline.process_packet, store=False)
    except PermissionError:
        print("[!] Error: Root/sudo privileges required to capture packets on", args.interface)
        sys.exit(1)
    except Exception as e:
        print(f"[!] Capture error: {e}")


if __name__ == "__main__":
    main()
