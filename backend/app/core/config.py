import os
from functools import lru_cache
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "UniShield AI"
    app_version: str = "0.1.0"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000

    database_url: str = "sqlite+aiosqlite:///./unishield.db"
    db_echo: bool = False

    detection_threshold: float = 0.6
    high_risk_threshold: float = 0.85
    critical_risk_threshold: float = 0.95

    rule_weight_signature: float = 0.30
    rule_weight_statistical: float = 0.25
    rule_weight_behavioral: float = 0.25
    ml_weight_supervised: float = 0.12
    ml_weight_anomaly: float = 0.08

    ml_model_dir: str = "models"
    xgboost_model_path: str = "models/xgboost/model.json"
    isolation_forest_model_path: str = "models/isolation_forest/model.pkl"
    scaler_path: str = "models/preprocessing/scaler.pkl"
    feature_columns_path: str = "models/preprocessing/feature_columns.json"

    pcap_active_path: str = "captures/active/current.pcap"
    pcap_incidents_path: str = "captures/incidents"
    pcap_archive_path: str = "captures/archive"
    pcap_max_bytes: int = 1024 * 1024
    pcap_rotation_interval_sec: int = 300

    flow_timeout_sec: int = 120
    connection_expiry_sec: int = 300
    rolling_window_sec: int = 60
    dedup_window_sec: int = 300

    max_concurrent_flows: int = 10000
    pipeline_queue_size: int = 200000
    pipeline_consumers: int = 6

    netflow_udp_port: int = 2055
    netflow_udp_host: str = "0.0.0.0"

    # Mobile push notifications via ntfy.sh (self-hosted ntfy also works).
    # Enabled only when both ntfy_enabled is true AND a topic is configured.
    ntfy_enabled: bool = False
    ntfy_url: str = "https://ntfy.sh"
    ntfy_topic: str = ""

    # SMS/WhatsApp-style phone alerts. Recipients are E.164 mobile numbers
    # (e.g. +919876543210). sms_provider is "mock" (logs the message that a
    # gateway would send — the only provider usable without external API keys);
    # "twilio" / "fast2sms" / "callmebot" need a per-account key from you.
    # callmebot delivers via WhatsApp (free) and needs SMS_CALLMEBOT_KEYS in
    # the form "PHONE:APIKEY,PHONE:APIKEY" (one key per authorized number).
    sms_enabled: bool = False
    sms_provider: str = "mock"
    sms_gateway_url: str = ""
    sms_gateway_account: str = ""
    sms_gateway_api_key: str = ""
    sms_sender_id: str = "UNISHILD"
    sms_twilio_content_sid: str = ""
    sms_twilio_content_var: str = "1"
    sms_callmebot_keys: Annotated[
        list[str],
        NoDecode,
    ] = []
    # Telegram Bot API alerts (free, reliable). TELEGRAM_CHAT_ID may hold a
    # comma-separated list of chat ids (negative for group chats).
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""
    phone_numbers: Annotated[
        list[str],
        NoDecode,
    ] = []

    zeek_log_path: str = "logs/zeek"
    sensor_endpoint: str = "http://localhost:8000/api/v1/traffic/flow"

    # Annotated with NoDecode so the raw comma-separated env string is passed
    # through to the before-validator instead of being JSON-decoded first.
    cors_origins: Annotated[
        list[str],
        NoDecode,
    ] = ["http://localhost:3000", "http://localhost:5173"]

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _parse_cors_list(cls, value):
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @field_validator("phone_numbers", mode="before")
    @classmethod
    def _parse_phone_list(cls, value):
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @field_validator("sms_callmebot_keys", mode="before")
    @classmethod
    def _parse_keymap_list(cls, value):
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
