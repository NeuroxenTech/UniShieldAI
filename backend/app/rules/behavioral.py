from app.core.constants import ThreatType
from app.rules.base import BaseRule, RuleMatch


class BehavioralRule(BaseRule):
    category = "behavioral"

    def __init__(self, detect: callable, rule_id: str, rule_name: str,
                 weight: float = 1.0, threat_type: ThreatType = ThreatType.SUSPICIOUS_TRAFFIC,
                 severity: int = 2) -> None:
        super().__init__(weight=weight)
        self.detect = detect
        self.rule_id = rule_id
        self.rule_name = rule_name
        self._threat_type = threat_type
        self._severity = severity

    def evaluate(self, features: dict) -> RuleMatch | None:
        result = self.detect(features)
        if not result:
            return None
        if isinstance(result, dict):
            score = float(result.get("score", 0.5))
            details = dict(result)
            details.pop("score", None)
        else:
            score = float(result)
            details = {}
        return self._match(score, self._threat_type, self._severity, **details)


def default_behavioral_rules() -> list[BehavioralRule]:
    return [
        BehavioralRule(
            _periodic_pattern_rule,
            "behav_periodic_conn",
            "Periodic connection pattern (tunneling/beaconing)",
            threat_type=ThreatType.C2_COMMUNICATION, severity=3,
        ),
        BehavioralRule(
            _syn_flood_pattern_rule,
            "behav_syn_flood",
            "SYN flood signature (half-open ratio)",
            threat_type=ThreatType.DDoS, severity=4,
        ),
        BehavioralRule(
            _udp_flood_pattern_rule,
            "behav_udp_flood",
            "UDP flood (many datagrams stacking toward a destination)",
            threat_type=ThreatType.DDoS, severity=4,
        ),
        BehavioralRule(
            _slowloris_rule,
            "behav_slowloris",
            "Low-rate connection-exhaustion (slowloris) pattern",
            threat_type=ThreatType.DOS, severity=4,
        ),
        BehavioralRule(
            _port_sweep_rule,
            "behav_port_sweep",
            "Sequential port sweep",
            threat_type=ThreatType.PORT_SCAN, severity=3,
        ),
        BehavioralRule(
            _small_pkts_many_conn_rule,
            "behav_small_pkt_many_conn",
            "Small packets across many connections",
            threat_type=ThreatType.RECONNAISSANCE, severity=2,
        ),
        BehavioralRule(
            _brute_force_rule,
            "behav_brute_force",
            "Repeated auth attempts (brute force)",
            threat_type=ThreatType.BRUTE_FORCE, severity=4,
        ),
        BehavioralRule(
            _lateral_beacon_rule,
            "behav_lateral_move",
            "Lateral movement pattern",
            threat_type=ThreatType.LATERAL_MOVEMENT, severity=3,
        ),
        BehavioralRule(
            _tls_ja3_blocklist_rule,
            "behav_tls_ja3_blocklist",
            "TLS client fingerprint in known-malicious JA3 set (no decryption)",
            threat_type=ThreatType.MALWARE_COMMUNICATION, severity=4,
        ),
    ]


def _periodic_pattern_rule(features: dict) -> dict | None:
    periodicity = features.get("periodicity", 0.0)
    if periodicity > 0.7:
        return {"score": min(1.0, 0.4 + periodicity / 2), "periodicity": round(periodicity, 3)}
    return None


def _syn_flood_pattern_rule(features: dict) -> dict | None:
    syn_ratio = features.get("syn_ratio", 0.0)
    if syn_ratio > 0.9:
        return {"score": 0.9, "syn_ratio": round(syn_ratio, 3)}
    return None


def _udp_flood_pattern_rule(features: dict) -> dict | None:
    """Single-source UDP flood (hping3 -2 --flood / DNS amp without spoof).

    A spoofed/reflection flood is caught by source entropy; a plain
    single-source UDP barrage is not volumetric across sources, so it needs
    its own signal: many stacked UDP connections (random high source ports)
    from one host carrying small datagrams toward a destination.
    """
    if features.get("protocol") != "udp":
        return None
    connection_frequency = features.get("connection_frequency", 0.0)
    packets_per_sec = features.get("packets_per_sec", 0.0)
    avg_packet_size = features.get("avg_packet_size", 0.0)
    if avg_packet_size and avg_packet_size > 1400.0:
        return None
    # Many stacked connections (random source ports) — classic hping3 -2 --flood.
    if connection_frequency >= 2.0 and packets_per_sec >= 8.0:
        return {
            "score": min(1.0, 0.55 + connection_frequency / 20.0),
            "connection_frequency": round(connection_frequency, 3),
            "packets_per_sec": round(packets_per_sec, 2),
            "avg_packet_size": round(avg_packet_size, 1),
        }
    # Single-flow datagram barrage (fixed src port, e.g. iperf3 -u or one hping3
    # stream): no stacking signal, but the PPS says it's a flood.
    if packets_per_sec >= 40.0:
        return {
            "score": min(1.0, 0.55 + packets_per_sec / 200.0),
            "packets_per_sec": round(packets_per_sec, 2),
            "avg_packet_size": round(avg_packet_size, 1),
        }
    return None


def _slowloris_rule(features: dict) -> dict | None:
    """Slowloris: one attacker slowly opening many half-finished sockets.

    The flow rate is tiny (no pps/bps volume rules fire) so the pattern must
    be recognized from *connection* locality: a burst of small, never-closed
    web-tier connections (fin_ratio ~0) accumulating from a single source.
    """
    connection_frequency = features.get("connection_frequency", 0.0)
    dst_port = features.get("dst_port")
    fin_ratio = features.get("fin_ratio", 0.0)
    avg_packet_size = features.get("avg_packet_size", 0.0)
    protocol = features.get("protocol")
    if protocol != "tcp":
        return None
    if dst_port not in (80, 443, 8080):
        return None
    if connection_frequency < 1.5:
        return None
    if fin_ratio > 0.05:
        return None
    if avg_packet_size <= 0 or avg_packet_size >= 500:
        return None
    return {
        "score": min(1.0, 0.5 + connection_frequency / 10.0),
        "connection_frequency": round(connection_frequency, 3),
        "avg_packet_size": round(avg_packet_size, 1),
        "fin_ratio": round(fin_ratio, 3),
    }


def _port_sweep_rule(features: dict) -> dict | None:
    unique_ports = features.get("unique_dst_ports", 0)
    connection_frequency = features.get("connection_frequency", 0.0)
    if unique_ports >= 10:
        return {"score": 0.75, "unique_dst_ports": unique_ports}
    if unique_ports >= 5 and connection_frequency >= 1.0:
        return {"score": 0.5, "unique_dst_ports": unique_ports}
    return None


def _brute_force_rule(features: dict) -> dict | None:
    dst_port = features.get("dst_port")
    dst_port_conn_freq = features.get("dst_port_conn_freq", 0.0)
    auth_ports = {22, 23, 3389, 445, 5985, 5900}
    # Match on the connection rate aimed at THIS auth port, not the pair-wide
    # unique_ports count: right after a port scan the (src,dst) pair carries
    # dozens of stale ports, but a brute force concentrates attempts on one
    # auth port (80 fast attempts ≈ 1.3 conns/s), so per-port frequency stays
    # high while the scan's ~0.02/s por-port rate never trips it.
    if dst_port in auth_ports and dst_port_conn_freq >= 0.5:
        return {
            "score": 0.8,
            "connection_frequency": round(features.get("connection_frequency", 0.0), 3),
            "dst_port_conn_freq": round(dst_port_conn_freq, 3),
        }
    return None


def _small_pkts_many_conn_rule(features: dict) -> dict | None:
    small_ratio = features.get("small_packet_ratio", 0.0)
    unique_ips = features.get("unique_dst_ips", 0)
    if small_ratio > 0.6 and unique_ips >= 5:
        return {"score": 0.65, "small_packet_ratio": round(small_ratio, 3)}
    return None


def _lateral_beacon_rule(features: dict) -> dict | None:
    outbound_ratio = features.get("outbound_inbound_ratio", 0.5)
    connection_frequency = features.get("connection_frequency", 0.0)
    if 0.0 < outbound_ratio < 0.3 and connection_frequency > 2.0:
        return {"score": 0.6, "outbound_inbound_ratio": round(outbound_ratio, 3)}
    return None


def _tls_ja3_blocklist_rule(features: dict) -> dict | None:
    ja3 = features.get("tls_ja3")
    if not ja3:
        return None
    from app.core.constants import KNOWN_MALICIOUS_JA3
    if ja3 in KNOWN_MALICIOUS_JA3:
        return {"score": 0.95, "ja3_fingerprint": ja3, "source": "JA3 blocklist"}
    return None