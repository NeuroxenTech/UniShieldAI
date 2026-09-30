import asyncio


class LiveFeedController:
    """Runtime live-feed switch.

    When disabled the backend keeps ingesting, detecting and persisting alerts
    to the audit DB, but every live outlet is silenced: WebSocket metrics and
    alert broadcasts plus the mobile push notifier. Re-enabling resumes the
    stream; stored data is untouched either way.
    """

    def __init__(self) -> None:
        self._enabled = True
        self._lock = asyncio.Lock()

    def is_enabled(self) -> bool:
        return self._enabled

    async def set_enabled(self, enabled: bool) -> bool:
        async with self._lock:
            self._enabled = bool(enabled)
            return self._enabled

    def snapshot(self) -> dict:
        return {"enabled": self._enabled, "paused": not self._enabled}


live_feed_controller = LiveFeedController()