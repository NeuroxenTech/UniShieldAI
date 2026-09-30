from ipaddress import ip_address, ip_network

from app.core.constants import ThreatType

THREAT_PRIORITY: dict[ThreatType, int] = {
    ThreatType.BENIGN: 0,
    ThreatType.RECONNAISSANCE: 1,
    ThreatType.SUSPICIOUS_TRAFFIC: 2,
    ThreatType.PORT_SCAN: 3,
    ThreatType.BRUTE_FORCE: 3,
    ThreatType.LATERAL_MOVEMENT: 3,
    ThreatType.C2_COMMUNICATION: 4,
    ThreatType.DATA_EXFILTRATION: 4,
    ThreatType.MALWARE_COMMUNICATION: 4,
    ThreatType.DOS: 4,
    ThreatType.DDoS: 4,
    ThreatType.DNS_TUNNELING: 5,  # more specific technique than generic exfil
}

# Fast-path checks that can vet the interoperability of a threat label before
# it leaves the classifier. Volume-oriented labels (exfil / ddos / malware /
# suspicious) must never survive for link-local noise such as DHCP broadcasts.
#: true if the label describe a discrete technique rather than a bulk signal
_TECHNIQUE_TYPES = {
    ThreatType.PORT_SCAN,
    ThreatType.BRUTE_FORCE,
    ThreatType.C2_COMMUNICATION,
    ThreatType.DNS_TUNNELING,
    ThreatType.LATERAL_MOVEMENT,
    ThreatType.DOS,
}

_BROADCAST_NETS = (
    ip_network("255.255.255.255/32"),
    ip_network("224.0.0.0/4"),      # multicast
    ip_network("ff00::/8"),         # IPv6 multicast
)


class ThreatClassifier:
    def classify(self, risk_score: float, rule_matches: list,
                 ml_result: dict, anomaly_score: float,
                 dst_ip: str | None = None,
                 src_ip: str | None = None) -> ThreatType:
        rule_candidates = [
            (match.score, match.threat_type, match.rule_id) for match in rule_matches
        ]

        # Specific rule matches (port_scan, brute_force, c2, ...) always
        # out-rank the generic ML/anomaly "threat" label: the supervised model
        # is binary and can only contribute a broad suspicious_traffic signal,
        # which would otherwise win by raw score and drown out real TTPs.
        specific = [
            (score, tt, rid)
            for score, tt, rid in rule_candidates
            if tt != ThreatType.SUSPICIOUS_TRAFFIC
        ]
        if specific:
            winner_score, winner, _ = max(
                specific, key=lambda item: (item[0], self.priority(item[1]))
            )
            winner = self._refine_label(winner, specific)
        else:
            candidates: list[tuple[float, ThreatType, str]] = list(rule_candidates)

            supervised_threat = ml_result.get("supervised", {}).get(
                "threat_type", ThreatType.BENIGN.value
            )
            probability = float(ml_result.get("supervised", {}).get("probability", 0.0))
            try:
                candidates.append((probability, ThreatType(supervised_threat), "ml"))
            except ValueError:
                # Binary model labels are "benign"/"threat" — keep a generic hit as
                # suspicious_traffic just like anomaly, but it never masks rules.
                if probability >= 0.5 and supervised_threat != ThreatType.BENIGN.value:
                    candidates.append((probability, ThreatType.SUSPICIOUS_TRAFFIC, "ml"))

            if anomaly_score > 0.6:
                candidates.append((anomaly_score, ThreatType.SUSPICIOUS_TRAFFIC, "anomaly"))

            if risk_score < 0.4:
                return ThreatType.BENIGN
            if not candidates:
                return ThreatType.SUSPICIOUS_TRAFFIC

            _, winner, _ = max(candidates, key=lambda item: item[0])

        winner = self._drop_link_local_noise(winner, dst_ip, src_ip)
        winner = self._demote_internal_segment(winner, specific, src_ip, dst_ip)
        return winner

    @staticmethod
    def _refine_label(winner: ThreatType, specific: list[tuple[float, ThreatType, str]]) -> ThreatType:
        """Skew the raw max-score label toward the most actionable TTP.

        Rule ordering matters: a many-ports signature (port_scan) is
        distinctive no matter what volume signal co-fires on that same flow,
        and a beaconing/tunneling technique is strictly more specific than the
        byte-ratio exfil (or pps-rate dos) it rides on. One caveat: after a
        scan finishes its ~30 distinct ports remain attached to the (src,dst)
        pair in the connection tracker for a short window, so an unrelated
        beacon/brute/dns flow RIGHT after a scan would also trip the port-sweep
        by-product. A STRONGER discrete technique (periodicity, auth-port focus,
        dns entropy) that scores above the port-sweep rule must win then — the
        port-sweep is a side-effect of the other scenario, not the story.
        """
        # 1. A scan with many distinct ports is a scan — even when it also trips
        #    high source-entropy (spread) or outbound-byte rules on the same flow.
        #    But a discrete technique with a HIGHER score (c2 cadence, auth brute
        #    focus, dns entropy, slowloris) describes the flow more specifically
        #    and beats the scan label.
        port_scores = [score for score, tt, _ in specific if tt == ThreatType.PORT_SCAN]
        if port_scores:
            stronger_technique = [
                score for score, tt, _ in specific
                if tt in _TECHNIQUE_TYPES and tt != ThreatType.PORT_SCAN
            ]
            if not stronger_technique or max(port_scores) >= max(stronger_technique):
                return ThreatType.PORT_SCAN

        # 2. C2 beacon beats any generic volume label it co-fires with.
        if any(tt == ThreatType.C2_COMMUNICATION for _, tt, _ in specific):
            if winner in (
                ThreatType.DATA_EXFILTRATION,
                ThreatType.MALWARE_COMMUNICATION,
                ThreatType.DOS,
                ThreatType.DDoS,
            ):
                return ThreatType.C2_COMMUNICATION

        # 3. Technique overrides for generic byte-ratio exfil / malware labels.
        if winner in (ThreatType.DATA_EXFILTRATION, ThreatType.MALWARE_COMMUNICATION):
            if any(tt == ThreatType.DNS_TUNNELING for _, tt, _ in specific):
                return ThreatType.DNS_TUNNELING

        # 4. Slowloris vs DDoS: a slowloris signature (small, held-open web
        #    sockets from one host) that only trips *source-spread* evidence is
        #    a low-rate DoS, not a volumetric/reflection DDoS. A real DDoS has
        #    SYN-flood, pps/bps or UDP-amp rules too.
        if winner == ThreatType.DDoS and any(
            rid == "behav_slowloris" for _, _, rid in specific
        ):
            ddos_ids = [rid for _, tt, rid in specific if tt == ThreatType.DDoS]
            if not any(
                any(tok in rid for tok in ("syn_flood", "pps", "bps", "amp"))
                for rid in ddos_ids
            ):
                return ThreatType.DOS

        return winner

    @staticmethod
    def _drop_link_local_noise(winner: ThreatType, dst_ip: str | None,
                               src_ip: str | None) -> ThreatType:
        """DHCP discover/renew and multicast chatter must never read as exfil.

        A broadcast/multicast destination (or the unconfigured 0.0.0.0 source)
        carries a dominant-outbound byte signal that the exfil rules would
        otherwise happily flag for a 68-byte DHCP packet.
        """
        if winner == ThreatType.BENIGN:
            return winner
        if not dst_ip or not src_ip:
            return winner
        try:
            dst = ip_address(dst_ip)
        except ValueError:
            return winner
        # Broadcast/multicast targets and 0.0.0.0 sources are link-local
        # provisioning chatter (DHCP discover, ARP probes). No technique —
        # port scan, C2 beacon or flood — is ever routed to 255.255.255.255
        # or a 224.x group, so drop every label for them. This must run before
        # the technique bypass or a periodic DHCP discover keeps reading as a
        # live C2 channel.
        if any(dst in net for net in _BROADCAST_NETS):
            return ThreatType.BENIGN
        if src_ip == "0.0.0.0":
            return ThreatType.BENIGN
        if winner in _TECHNIQUE_TYPES:
            return winner
        return winner

    @staticmethod
    def _demote_internal_segment(winner: ThreatType, specific: list[tuple[float, ThreatType, str]],
                                 src_ip: str | None, dst_ip: str | None) -> ThreatType:
        """Keep intra-segment bulk traffic from reading as border exfil/flood.

        Data exfiltration is a *border* technique: bytes leaving the watched
        segment. RFC1918-to-RFC1918 transfers (iPerf benchmarks, LAN backup
        copies) trip the byte-rate/exfil rules but are not exfiltration, and
        a pure-volume DoS signal (pps/bps rules only, no SYN/UDP technique)
        inside a single lab segment is usually a bandwidth test, not an
        attack. Downgrade to suspicious so the dedicated technique rules
        (syn_flood, udp_flood, slowloris) still win when they really fire.
        """
        if src_ip is None or dst_ip is None:
            return winner
        try:
            src = ip_address(src_ip)
            dst = ip_address(dst_ip)
        except ValueError:
            return winner
        if dst.is_private != src.is_private:
            return winner
        if not dst.is_private or not src.is_private:
            return winner
        if winner == ThreatType.DATA_EXFILTRATION:
            return ThreatType.SUSPICIOUS_TRAFFIC
        if winner == ThreatType.DOS:
            dos_ids = [rid for _, tt, rid in specific if tt == ThreatType.DOS]
            if dos_ids and all(rid in ("stat_pps_high", "stat_bps_high") for rid in dos_ids):
                return ThreatType.SUSPICIOUS_TRAFFIC
        return winner

    def priority(self, threat: ThreatType) -> int:
        return THREAT_PRIORITY.get(threat, 2)


classifier = ThreatClassifier()