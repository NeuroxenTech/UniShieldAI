#!/usr/bin/env python3
"""
UniShield Real-Time WebSocket & Decision Backend Server (FastAPI)
Receives network flows from the sensor, passes them through the Decision Engine,
and broadcasts telemetry and security verdicts to connected web dashboard clients.
"""

import sys
import os
import json
import asyncio
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add parent directory to path to allow importing decision_engine
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    from decision_engine import UniShieldDecisionEngine
    decision_engine = UniShieldDecisionEngine(block_threshold=0.80)
    HAS_DECISION_ENGINE = True
except ImportError:
    decision_engine = None
    HAS_DECISION_ENGINE = False

app = FastAPI(
    title="UniShield Real-Time Telemetry & Decision API",
    description="Real-time WebSocket feed and decision engine service for UniShield NIDS"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================================================================
# WebSocket Connection Manager
# ==============================================================================
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self.lock:
            self.active_connections.append(websocket)
        print(f"[+] UI Client connected. Active sessions: {len(self.active_connections)}")

    async def disconnect(self, websocket: WebSocket):
        async with self.lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
        print(f"[-] UI Client disconnected. Active sessions: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcasts event JSON to all connected clients."""
        async with self.lock:
            to_remove = []
            for ws in self.active_connections:
                try:
                    await ws.send_json(message)
                except Exception:
                    to_remove.append(ws)
            for ws in to_remove:
                if ws in self.active_connections:
                    self.active_connections.remove(ws)


manager = ConnectionManager()


# ==============================================================================
# Schemas & Ingest Endpoints
# ==============================================================================
class FlowPayload(BaseModel):
    flow_id: str
    timestamp: str
    src_ip: str
    dst_ip: str
    src_port: int
    dst_port: int
    protocol: str
    duration: float
    packets: int
    bytes: int
    syn: int
    ack: int
    rst: int
    fin: int
    orig_bytes: int
    resp_bytes: int


@app.get("/")
async def health_check():
    return {
        "status": "online",
        "service": "UniShield Telemetry & Decision Backend",
        "decision_engine_active": HAS_DECISION_ENGINE,
        "active_clients": len(manager.active_connections)
    }


@app.post("/api/v1/flows")
async def ingest_flow(flow: FlowPayload):
    """
    Ingests a raw flow, runs it through the Decision Engine,
    and broadcasts the Flow, Verdict, and any Security Alerts.
    """
    flow_dict = flow.dict()

    # 1. Evaluate with Decision Engine
    if decision_engine:
        verdict = decision_engine.process_raw_flow(flow_dict)
    else:
        verdict = {
            "classification": "UNKNOWN",
            "threat_score": 0.0,
            "action_taken": "ALLOW",
            "reason": "Decision engine offline"
        }

    # 2. Broadcast Flow Event
    await manager.broadcast({
        "type": "NETWORK_FLOW",
        "data": flow_dict
    })

    # 3. Broadcast Verdict Event
    await manager.broadcast({
        "type": "DECISION_VERDICT",
        "data": verdict
    })

    # 4. If Threat Detected, Broadcast Alert
    if verdict.get("classification") != "BENIGN":
        await manager.broadcast({
            "type": "SECURITY_ALERT",
            "data": {
                "alert_id": f"ALT-{flow.flow_id}",
                "timestamp": flow.timestamp,
                "flow_id": flow.flow_id,
                "src_ip": flow.src_ip,
                "dst_ip": flow.dst_ip,
                "dst_port": flow.dst_port,
                "classification": verdict["classification"],
                "attack_type": verdict["attack_type"],
                "threat_score": verdict["threat_score"],
                "mitre_technique": verdict["mitre_technique"],
                "action_taken": verdict["action_taken"],
                "reason": verdict["reason"]
            }
        })

    return {
        "status": "processed",
        "flow_id": flow.flow_id,
        "action": verdict.get("action_taken")
    }


# ==============================================================================
# WebSocket Endpoint for UI
# ==============================================================================
@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception:
        await manager.disconnect(websocket)


# ==============================================================================
# Background Demo Traffic Simulator
# ==============================================================================
async def simulated_traffic_worker():
    """Simulates realistic traffic and runs it through the decision engine for live UI testing."""
    import random
    from datetime import datetime, timezone

    flow_seq = 100
    while True:
        await asyncio.sleep(2.5)
        if manager.active_connections:
            flow_seq += 1
            now_iso = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
            attack_roll = random.random()

            if attack_roll < 0.15:
                # SYN Flood Scenario
                flow_data = {
                    "flow_id": f"FLOW-{flow_seq:06d}",
                    "timestamp": now_iso,
                    "src_ip": "192.168.100.10",
                    "dst_ip": "192.168.100.11",
                    "src_port": random.randint(30000, 60000),
                    "dst_port": 80,
                    "protocol": "TCP",
                    "duration": round(random.uniform(0.5, 1.5), 2),
                    "packets": random.randint(300, 900),
                    "bytes": random.randint(30000, 70000),
                    "syn": random.randint(300, 900),
                    "ack": 0,
                    "rst": 0,
                    "fin": 0,
                    "orig_bytes": random.randint(30000, 70000),
                    "resp_bytes": 0
                }
            elif attack_roll < 0.30:
                # Port Scan Probe Scenario
                flow_data = {
                    "flow_id": f"FLOW-{flow_seq:06d}",
                    "timestamp": now_iso,
                    "src_ip": "192.168.100.10",
                    "dst_ip": "192.168.100.11",
                    "src_port": random.randint(40000, 60000),
                    "dst_port": random.choice([21, 22, 23, 3306, 8080, 8443]),
                    "protocol": "TCP",
                    "duration": 0.05,
                    "packets": 1,
                    "bytes": 60,
                    "syn": 1,
                    "ack": 0,
                    "rst": 0,
                    "fin": 0,
                    "orig_bytes": 60,
                    "resp_bytes": 0
                }
            else:
                # Standard Benign Web/API Traffic
                flow_data = {
                    "flow_id": f"FLOW-{flow_seq:06d}",
                    "timestamp": now_iso,
                    "src_ip": "192.168.100.10",
                    "dst_ip": "192.168.100.11",
                    "src_port": random.randint(30000, 60000),
                    "dst_port": 443,
                    "protocol": "TCP",
                    "duration": round(random.uniform(1.0, 10.0), 2),
                    "packets": random.randint(20, 120),
                    "bytes": random.randint(15000, 90000),
                    "syn": 1,
                    "ack": random.randint(19, 119),
                    "rst": 0,
                    "fin": 1,
                    "orig_bytes": random.randint(10000, 60000),
                    "resp_bytes": random.randint(5000, 30000)
                }

            # Evaluate with Decision Engine
            verdict = decision_engine.process_raw_flow(flow_data) if decision_engine else None

            # Broadcast events to connected browsers
            await manager.broadcast({"type": "NETWORK_FLOW", "data": flow_data})
            if verdict:
                await manager.broadcast({"type": "DECISION_VERDICT", "data": verdict})
                if verdict["classification"] != "BENIGN":
                    await manager.broadcast({
                        "type": "SECURITY_ALERT",
                        "data": {
                            "alert_id": f"ALT-{flow_data['flow_id']}",
                            "timestamp": flow_data["timestamp"],
                            "flow_id": flow_data["flow_id"],
                            "src_ip": flow_data["src_ip"],
                            "dst_ip": flow_data["dst_ip"],
                            "dst_port": flow_data["dst_port"],
                            "classification": verdict["classification"],
                            "attack_type": verdict["attack_type"],
                            "threat_score": verdict["threat_score"],
                            "mitre_technique": verdict["mitre_technique"],
                            "action_taken": verdict["action_taken"],
                            "reason": verdict["reason"]
                        }
                    })


@app.on_event("startup")
async def startup_event():
    asyncio.create_task(simulated_traffic_worker())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
