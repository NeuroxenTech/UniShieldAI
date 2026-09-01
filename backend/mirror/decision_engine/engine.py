#!/usr/bin/env python3
"""
UniShield Decision Engine
Transforms raw flow JSON records into feature vectors, evaluates them
using a hybrid (Heuristic + Machine Learning) engine, and determines mitigation actions.
"""

import json
import time
import math
from datetime import datetime, timezone
from typing import Dict, Any, Tuple, Optional


class FeatureExtractor:
    """Extracts analytical features and statistical ratios from raw flow JSON."""

    @staticmethod
    def extract(flow: Dict[str, Any]) -> Dict[str, float]:
        duration = max(0.001, float(flow.get("duration", 0.0)))
        packets = int(flow.get("packets", 1))
        total_bytes = int(flow.get("bytes", 0))
        orig_bytes = int(flow.get("orig_bytes", 0))
        resp_bytes = int(flow.get("resp_bytes", 0))
        syn = int(flow.get("syn", 0))
        ack = int(flow.get("ack", 0))
        rst = int(flow.get("rst", 0))
        fin = int(flow.get("fin", 0))
        dst_port = int(flow.get("dst_port", 0))

        # 1. Traffic Rates
        packet_rate = packets / duration
        byte_rate = total_bytes / duration

        # 2. Flag Ratios & Anomaly Indicators
        # A high SYN ratio with near zero ACKs indicates SYN flood / port scanning
        syn_ratio = syn / max(1, (syn + ack))
        syn_to_ack_ratio = syn / max(1, ack)
        rst_ratio = rst / max(1, packets)

        # 3. Directional Asymmetry
        # High orig_bytes with low resp_bytes suggests exfiltration or DoS
        asymmetry_ratio = orig_bytes / max(1, (orig_bytes + resp_bytes))

        # 4. Service / Port Categorization
        is_privileged_port = 1.0 if dst_port < 1024 else 0.0
        avg_packet_size = total_bytes / max(1, packets)

        return {
            "duration": duration,
            "packets": packets,
            "bytes": total_bytes,
            "packet_rate": round(packet_rate, 2),
            "byte_rate": round(byte_rate, 2),
            "syn_ratio": round(syn_ratio, 3),
            "syn_to_ack_ratio": round(syn_to_ack_ratio, 2),
            "rst_ratio": round(rst_ratio, 3),
            "asymmetry_ratio": round(asymmetry_ratio, 3),
            "avg_packet_size": round(avg_packet_size, 2),
            "is_privileged_port": is_privileged_port
        }


class HeuristicRuleEngine:
    """Fast deterministic rule engine based on signatures and thresholds."""

    @staticmethod
    def evaluate(flow: Dict[str, Any], features: Dict[str, float]) -> Optional[Dict[str, Any]]:
        proto = flow.get("protocol", "TCP")
        syn = flow.get("syn", 0)
        ack = flow.get("ack", 0)
        packets = flow.get("packets", 0)
        orig_bytes = flow.get("orig_bytes", 0)
        resp_bytes = flow.get("resp_bytes", 0)

        # Rule 1: High-Rate SYN Flood (T1498.001)
        if proto == "TCP" and (syn >= 15 and ack == 0) or (features["syn_to_ack_ratio"] > 20 and features["packet_rate"] > 50):
            return {
                "classification": "MALICIOUS",
                "attack_type": "SYN_FLOOD_DOS",
                "threat_score": 0.98,
                "mitre_id": "T1498.001",
                "reason": f"High SYN-to-ACK ratio ({features['syn_to_ack_ratio']}) with {features['packet_rate']} pkts/sec"
            }

        # Rule 2: Single SYN Port Reconnaissance Probe (T1046)
        if proto == "TCP" and syn == 1 and ack == 0 and packets == 1:
            return {
                "classification": "SUSPICIOUS",
                "attack_type": "PORT_SCAN_PROBE",
                "threat_score": 0.65,
                "mitre_id": "T1046",
                "reason": "Single unanswered SYN probe to target port"
            }

        # Rule 3: Data Exfiltration Anomaly (T1048)
        if orig_bytes > 500000 and resp_bytes < 5000:
            return {
                "classification": "SUSPICIOUS",
                "attack_type": "DATA_EXFILTRATION",
                "threat_score": 0.82,
                "mitre_id": "T1048",
                "reason": f"Severe upload asymmetry ({orig_bytes} bytes sent vs {resp_bytes} received)"
            }

        return None


class MLAnomalyModel:
    """
    Simulated ML Classifier (e.g. Random Forest / XGBoost model).
    Can be replaced with `joblib.load('model.pkl').predict_proba(X)`.
    """

    def predict(self, feature_vector: Dict[str, float]) -> Tuple[str, float]:
        # Scoring logic simulating an ML decision boundary
        score = 0.05  # Base benign probability

        if feature_vector["packet_rate"] > 100:
            score += 0.40
        if feature_vector["syn_ratio"] > 0.8:
            score += 0.45
        if feature_vector["asymmetry_ratio"] > 0.95 and feature_vector["bytes"] > 100000:
            score += 0.35

        threat_score = min(1.0, round(score, 3))

        if threat_score >= 0.70:
            return "MALICIOUS", threat_score
        elif threat_score >= 0.40:
            return "SUSPICIOUS", threat_score
        else:
            return "BENIGN", threat_score


class UniShieldDecisionEngine:
    """Master Decision Engine coordinating feature extraction, rule checks, ML, and policy."""

    def __init__(self, block_threshold: float = 0.85):
        self.block_threshold = block_threshold
        self.feature_extractor = FeatureExtractor()
        self.rule_engine = HeuristicRuleEngine()
        self.ml_model = MLAnomalyModel()

    def process_raw_flow(self, raw_flow: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main entrypoint: Accepts a raw flow JSON record and returns an actionable decision.
        """
        # Step 1: Extract mathematical features
        features = self.feature_extractor.extract(raw_flow)

        # Step 2: Evaluate Heuristic Rules (Instant high-confidence match)
        rule_verdict = self.rule_engine.evaluate(raw_flow, features)

        if rule_verdict:
            classification = rule_verdict["classification"]
            threat_score = rule_verdict["threat_score"]
            attack_type = rule_verdict["attack_type"]
            mitre_id = rule_verdict["mitre_id"]
            reason = rule_verdict["reason"]
        else:
            # Step 3: Run through ML Inference
            classification, threat_score = self.ml_model.predict(features)
            attack_type = "ANOMALY_TRAFFIC" if classification != "BENIGN" else "NONE"
            mitre_id = "T1071" if classification != "BENIGN" else None
            reason = f"ML model threat score: {threat_score}"

        # Step 4: Determine Mitigation Policy Action
        if threat_score >= self.block_threshold:
            action = "BLOCK_IP"  # Trigger iptables / eBPF drop
        elif threat_score >= 0.40:
            action = "FLAG_ALERT"  # Send WebSocket alert to Dashboard
        else:
            action = "ALLOW"  # Normal traffic

        # Build complete verdict record
        verdict = {
            "verdict_id": f"VERDICT-{raw_flow.get('flow_id', 'UNKNOWN')}",
            "timestamp": datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
            "flow_id": raw_flow.get("flow_id"),
            "src_ip": raw_flow.get("src_ip"),
            "dst_ip": raw_flow.get("dst_ip"),
            "dst_port": raw_flow.get("dst_port"),
            "protocol": raw_flow.get("protocol"),
            "classification": classification,
            "attack_type": attack_type,
            "threat_score": threat_score,
            "mitre_technique": mitre_id,
            "action_taken": action,
            "reason": reason,
            "extracted_features": features
        }

        return verdict


# Demo execution
if __name__ == "__main__":
    engine = UniShieldDecisionEngine()

    sample_raw_flow = {
        "flow_id": "FLOW-000123",
        "timestamp": "2026-09-01T08:31:20Z",
        "src_ip": "192.168.1.20",
        "dst_ip": "10.0.0.10",
        "src_port": 49152,
        "dst_port": 443,
        "protocol": "TCP",
        "duration": 10.4,
        "packets": 120,
        "bytes": 85200,
        "syn": 1,
        "ack": 118,
        "rst": 0,
        "fin": 1,
        "orig_bytes": 70000,
        "resp_bytes": 15200
    }

    print("=== Raw Flow Input ===")
    print(json.dumps(sample_raw_flow, indent=2))

    print("\n=== Calling Decision Engine ===")
    verdict = engine.process_raw_flow(sample_raw_flow)
    print(json.dumps(verdict, indent=2))
