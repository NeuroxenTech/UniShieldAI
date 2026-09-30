import httpx

from app.alerts.manager import AlertContext
from app.core.config import settings
from app.core.logging import get_logger
from app.state.live import live_feed_controller

logger = get_logger("unishield.notify")

_SEVERITY_PRIORITY = {
    "critical": 5,
    "high": 4,
    "medium": 3,
    "low": 2,
    "info": 1,
}


class NtfyNotifier:
    """Fire-and-forget mobile push for new alerts via ntfy.sh.

    Only reaches the phone for genuinely NEW detections (never for edit pulsing
    of an ongoing flood) so a 30-fps attack cannot spam the notification feed.
    Pauses with the live feed switch; storage/dedup keeps running meanwhile.
    """

    def __init__(self, url: str = "", topic: str = "", enabled: bool = False,
                 timeout_sec: float = 8.0) -> None:
        self.url = url.rstrip("/")
        self.topic = topic
        self.enabled = enabled and bool(topic)
        self.timeout_sec = timeout_sec

    @classmethod
    def from_settings(cls) -> "NtfyNotifier":
        return cls(
            url=settings.ntfy_url,
            topic=settings.ntfy_topic,
            enabled=settings.ntfy_enabled,
        )

    def _ready(self) -> bool:
        return self.enabled and self.topic and live_feed_controller.is_enabled()

    async def notify(self, ctx: AlertContext) -> None:
        if not self._ready():
            return
        alert = ctx.alert
        severity = (alert.severity or "info").lower()
        features = (alert.evidence or {}).get("features") or {}
        if isinstance(features, dict):
            dst_port = features.get("dst_port")
        else:
            dst_port = None
        src = f"Port: {dst_port} · " if dst_port else ""
        title = f"{alert.threat_type.upper()} — {alert.src_ip} → {alert.dst_ip}"
        body = (
            f"Protocol: {alert.protocol or '?'} · {src}"
            f"Risk: {alert.risk_score:.2f} · Confidence: {alert.confidence:.2f}"
        )
        headers = {
            "Title": title,
            "Priority": str(_SEVERITY_PRIORITY.get(severity, 1)),
            "Tags": "rotating_light" if severity in {"high", "critical"} else "warning",
        }
        payload = {
            "alert_id": ctx.alert_id,
            "timestamp": alert.timestamp,
            "src_ip": alert.src_ip,
            "dst_ip": alert.dst_ip,
            "protocol": alert.protocol,
            "threat_type": alert.threat_type,
            "severity": severity,
            "risk_score": alert.risk_score,
            "confidence": alert.confidence,
        }
        host = f"{self.url}/{self.topic}"
        try:
            async with httpx.AsyncClient(timeout=self.timeout_sec) as client:
                resp = await client.post(host, json=payload, headers=headers)
            resp.raise_for_status()
        except Exception:
            logger.exception("ntfy push failed for alert %s", ctx.alert_id)


ntfy_notifier = NtfyNotifier.from_settings()