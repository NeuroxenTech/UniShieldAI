import asyncio
import json
from datetime import datetime, timezone

import httpx

from app.alerts.manager import AlertContext
from app.core.config import settings
from app.core.logging import get_logger
from app.state.live import live_feed_controller

logger = get_logger("unishield.notify.sms")


def _fmt_number(raw: str) -> str:
    """Normalize a mobile number to E.164 (+<country><number>)."""
    cleaned = "".join(ch for ch in raw if ch.isdigit() or ch == "+")
    if cleaned.startswith("+"):
        return cleaned
    if cleaned.startswith("00"):
        return "+" + cleaned[2:]
    if len(cleaned) == 10 and not cleaned.startswith("0"):
        return f"+91{cleaned}"
    if len(cleaned) == 11 and cleaned.startswith("0"):
        return f"+91{cleaned[1:]}"
    return f"+{cleaned}" if cleaned else ""


def _mock_delivery(recipient: str, message: str) -> dict:
    logger.info(
        "MOCK SMS → %s | %s",
        recipient,
        message.replace("\n", " · "),
    )
    return {"recipient": recipient, "delivered": True, "via": "mock"}


async def _webhook_delivery(recipient: str, message: str, title: str) -> dict:
    headers = {"Content-Type": "application/json"}
    if settings.sms_gateway_api_key:
        headers["Authorization"] = f"Bearer {settings.sms_gateway_api_key}"
    payload = {
        "to": recipient,
        "message": message,
        "title": title,
        "sender": settings.sms_sender_id,
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(settings.sms_gateway_url, json=payload, headers=headers)
    resp.raise_for_status()
    return {"recipient": recipient, "delivered": True, "via": "webhook"}


async def _fast2sms_delivery(recipient: str, message: str) -> dict:
    """Real Indian SMS via Fast2SMS bulk API (route `q`).

    Needs Fast2SMS DEV API key in SMS_GATEWAY_API_KEY. The message becomes one
    SMS' worth of text; keep bodies under ~150 chars to avoid splitting.
    """
    if not settings.sms_gateway_api_key:
        raise ValueError("SMS_PROVIDER=fast2sms requires SMS_GATEWAY_API_KEY")
    params = {
        "route": "q",
        "message": message,
        "language": "english",
        "flash": "0",
        "numbers": recipient.lstrip("+"),
        "sender_id": (settings.sms_sender_id or "UNISHILD")[:6],
    }
    headers = {"authorization": settings.sms_gateway_api_key}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            "https://www.fast2sms.com/dev/bulkV2",
            params=params,
            headers=headers,
        )
    text = resp.text
    if resp.status_code >= 400:
        raise RuntimeError(f"Fast2SMS HTTP {resp.status_code}: {text[:200]}")
    try:
        data = resp.json()
    except ValueError:
        raise RuntimeError(f"Fast2SMS non-JSON response: {text[:200]}")
    if data.get("return") is not True and data.get("return") != 1:
        raise RuntimeError(f"Fast2SMS rejected: {data.get('message', data)}")
    return {"recipient": recipient, "delivered": True, "via": "fast2sms"}


async def _twilio_delivery(recipient: str, message: str, whatsapp: bool = False) -> dict:
    """Real SMS (or WhatsApp sandbox) via Twilio REST API.

    SMS needs the Twilio Account SID in SMS_GATEWAY_ACCOUNT, the Auth Token in
    SMS_GATEWAY_API_KEY, and a Twilio number in SMS_SENDER_ID (E.164). India
    requires Twilio number/toll-free verification first.
    For WhatsApp Sandbox (FREE) set SMS_SENDER_ID to the sandbox WhatsApp
    number (e.g. +14155238886); each recipient must first WhatsApp the sandbox
    with "join <sandbox-name>" — membership lasts 72h, rejoin anytime.
    """
    if not settings.sms_gateway_account or not settings.sms_gateway_api_key:
        raise ValueError(
            "SMS_PROVIDER=twilio(_whatsapp) requires SMS_GATEWAY_ACCOUNT and SMS_GATEWAY_API_KEY"
        )
    if not settings.sms_sender_id:
        raise ValueError(
            "SMS_PROVIDER=twilio(_whatsapp) requires SMS_SENDER_ID (Twilio From number/sandbox number)"
        )
    url = (
        f"https://api.twilio.com/2010-04-01/Accounts/"
        f"{settings.sms_gateway_account}/Messages.json"
    )
    to = f"whatsapp:{recipient}" if whatsapp else recipient
    sender = settings.sms_sender_id
    if whatsapp and not sender.startswith("whatsapp:"):
        sender = f"whatsapp:{sender}"
    data = {"To": to, "From": sender}
    if whatsapp and settings.sms_twilio_content_sid:
        # WhatsApp now requires an approved Content Template (ContentSid);
        # our message goes into the template's first variable {{1}}.
        data["ContentSid"] = settings.sms_twilio_content_sid
        data["ContentVariables"] = json.dumps(
            {settings.sms_twilio_content_var or "1": message}
        )
    else:
        data["Body"] = message
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            url,
            data=data,
            auth=(settings.sms_gateway_account, settings.sms_gateway_api_key),
        )
    resp.raise_for_status()
    return {"recipient": recipient, "delivered": True, "via": "twilio_whatsapp" if whatsapp else "twilio"}


def _callmebot_key_for(recipient: str) -> str | None:
    """Look up the per-number CallMeBot API key ("PHONE:KEY,PHONE:KEY")."""
    for entry in settings.sms_callmebot_keys:
        if ":" in entry:
            phone, key = entry.split(":", 1)
            if _fmt_number(phone) == recipient and key:
                return key
    return settings.sms_gateway_api_key or None


async def _callmebot_delivery(recipient: str, message: str) -> dict:
    """FREE WhatsApp delivery via CallMeBot (api.callmebot.com).

    Each number must authorize the bot once (details in the summary/docs):
    WhatsApp-message the bot at +1 415 523 8886 with "I allow callmebot to
    send me WhatsApp messages" and it replies with that number's API key.
    """
    api_key = _callmebot_key_for(recipient)
    if not api_key:
        raise ValueError(
            f"no CallMeBot API key for {recipient} (set SMS_CALLMEBOT_KEYS)"
        )
    params = {
        "phone": recipient.lstrip("+"),
        "text": message,
        "apikey": api_key,
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get("https://api.callmebot.com/whatsapp.php", params=params)
    text = resp.text.strip()
    if "Message Sent" not in text:
        raise RuntimeError(f"CallMeBot rejected: {text[:200]}")
    return {"recipient": recipient, "delivered": True, "via": "callmebot"}


def _telegram_chat_ids() -> list[str]:
    """Split TELEGRAM_CHAT_ID into ids (comma/newline separated)."""
    if not settings.telegram_chat_id:
        return []
    return [
        p.strip()
        for p in settings.telegram_chat_id.replace("\n", ",").split(",")
        if p.strip()
    ]


async def _telegram_delivery(chat_id: str, message: str) -> dict:
    """Real Telegram message via the Bot API (free, no approval)."""
    if not settings.telegram_bot_token:
        raise ValueError("SMS_PROVIDER=telegram requires TELEGRAM_BOT_TOKEN")
    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    data = {"chat_id": chat_id, "text": message, "disable_web_page_preview": True}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(url, json=data)
    try:
        body = resp.json()
    except ValueError:
        raise RuntimeError(f"Telegram non-JSON response: {resp.text[:200]}")
    if not body.get("ok"):
        raise RuntimeError(f"Telegram rejected: {body.get('description', body)[:200]}")
    return {"recipient": chat_id, "delivered": True, "via": "telegram"}


class SmsNotifier:
    """Phone alerts for new detections.

    Delivers to every configured `phone_numbers` recipient. Without a real
    gateway account the provider stays `mock`: the exact message that a gateway
    would send is written to the log so delivery can be validated in a lab.
    AWS-free, no moving parts beyond the backend — a twilio/fast2sms adapter
    only needs SMS_PROVIDER + SMS_GATEWAY_URL + SMS_GATEWAY_API_KEY.
    """

    def __init__(self, enabled: bool, recipients: list[str], provider: str) -> None:
        self.enabled = enabled * bool(recipients)
        if provider == "telegram":
            self.recipients = [r.strip() for r in recipients if r.strip()]
        else:
            self.recipients = [_fmt_number(n) for n in recipients if _fmt_number(n)]
        self.provider = provider

    @classmethod
    def from_settings(cls) -> "SmsNotifier":
        if settings.sms_provider == "telegram":
            return cls(
                enabled=settings.sms_enabled,
                recipients=_telegram_chat_ids(),
                provider="telegram",
            )
        return cls(
            enabled=settings.sms_enabled,
            recipients=list(settings.phone_numbers),
            provider=settings.sms_provider,
        )

    def _ready(self) -> bool:
        return self.enabled and bool(self.recipients) and live_feed_controller.is_enabled()

    async def send(self, recipient: str, title: str, message: str) -> dict:
        if self.provider in {"mock", ""}:
            return _mock_delivery(recipient, message)
        if self.provider == "fast2sms":
            return await _fast2sms_delivery(recipient, message)
        if self.provider == "twilio":
            return await _twilio_delivery(recipient, message, whatsapp=False)
        if self.provider == "twilio_whatsapp":
            return await _twilio_delivery(recipient, message, whatsapp=True)
        if self.provider == "callmebot":
            return await _callmebot_delivery(recipient, message)
        if self.provider == "telegram":
            return await _telegram_delivery(recipient, message)
        if settings.sms_gateway_url:
            return await _webhook_delivery(recipient, message, title)
        logger.warning(
            "SMS PROVIDER %s needs SMS_GATEWAY_URL or a built-in adapter credential; dropping",
            self.provider,
        )
        return {"recipient": recipient, "delivered": False, "via": self.provider}

    async def notify(self, ctx: AlertContext) -> None:
        if not self._ready():
            return
        alert = ctx.alert
        features = (alert.evidence or {}).get("features") or {}
        dst_port = features.get("dst_port") if isinstance(features, dict) else None
        port = f":{dst_port}" if dst_port else ""
        when = datetime.now(timezone.utc).strftime("%d %b %H:%M UTC")
        title = f"UniShield AI — {alert.threat_type.upper()}"
        message = (
            f"ALERT {alert.threat_type.upper()}\n"
            f"{alert.src_ip} → {alert.dst_ip} {alert.protocol.upper()}{port}\n"
            f"Risk {alert.risk_score:.2f} · Severity {alert.severity}\n"
            f"{when}"
        )
        results = []
        for recipient in self.recipients:
            try:
                results.append(await self.send(recipient, title, message))
            except Exception:
                logger.exception("SMS delivery failed → %s", recipient)
                results.append({"recipient": recipient, "delivered": False, "via": self.provider})

    async def send_test(self) -> dict:
        """Fire a canned test alert at every configured number (mock data)."""
        if not self.recipients:
            return {"sent": False, "reason": "no phone numbers configured"}
        if not live_feed_controller.is_enabled():
            return {"sent": False, "reason": "live feed paused"}
        title = "UniShield AI — TEST NOTIFICATION"
        message = (
            "UniShield AI diagnostic test\n"
            "This confirms phone alert delivery is wired.\n"
            f"{datetime.now(timezone.utc).strftime('%d %b %H:%M UTC')}"
        )
        results = []
        for recipient in self.recipients:
            try:
                results.append(await self.send(recipient, title, message))
            except Exception:
                logger.exception("Test SMS delivery failed → %s", recipient)
                results.append({"recipient": recipient, "delivered": False, "via": self.provider})
        return {"sent": all(r["delivered"] for r in results), "recipients": results}


sms_notifier = SmsNotifier.from_settings()