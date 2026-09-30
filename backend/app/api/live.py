from fastapi import APIRouter
from pydantic import BaseModel

from app.core.logging import get_logger
from app.realtime.publisher import publish_payload
from app.state.live import live_feed_controller

logger = get_logger("unishield.api.live")

router = APIRouter()


class LiveFeedRequest(BaseModel):
    enabled: bool


@router.get("/api/v1/engine/live")
async def live_state() -> dict:
    return live_feed_controller.snapshot()


@router.post("/api/v1/engine/live")
async def set_live_state(body: LiveFeedRequest) -> dict:
    await live_feed_controller.set_enabled(body.enabled)
    # Control events bypass the pause gate so every long-lived client learns
    # the new state even while the live streams themselves are frozen.
    await publish_payload("live_state", live_feed_controller.snapshot())
    logger.info("Live feed %s by API", "resumed" if body.enabled else "paused")
    return live_feed_controller.snapshot()