from fastapi import APIRouter

from app.core.config import settings
from app.core.logging import get_logger
from app.notifications.sms import sms_notifier
from app.realtime.publisher import publish_payload
from app.state.live import live_feed_controller

logger = get_logger("unishield.api.notify")

router = APIRouter()


@router.post("/api/v1/notify/test")
async def send_test_notification() -> dict:
    result = await sms_notifier.send_test()
    # Visible in the browser too so demo/testing doesn't need the log.
    await publish_payload("notify_test", result)
    logger.info("Test notification result: %s", result)
    return result


@router.get("/api/v1/notify/config")
async def notify_config() -> dict:
    return {
        "ntfy_enabled": sms_notifier_enabled_ntfy(),
        "sms_enabled": sms_notifier.enabled,
        "sms_provider": sms_notifier.provider,
        "sms_recipients": sms_notifier.recipients,
        "sms_sender_id": settings.sms_sender_id,
        "sms_gateway_url": settings.sms_gateway_url,
        "sms_gateway_account": settings.sms_gateway_account,
        "sms_gateway_key_set": bool(settings.sms_gateway_api_key),
        "telegram_token_set": bool(settings.telegram_bot_token),
        "telegram_chat_ids": [i for i in (settings.telegram_chat_id.split(",") if settings.telegram_chat_id else []) if i.strip()],
        "live_enabled": live_feed_controller.is_enabled(),
    }


def sms_notifier_enabled_ntfy() -> bool:
    from app.notifications.ntfy import ntfy_notifier

    return ntfy_notifier.enabled