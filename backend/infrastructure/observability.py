import logging
from typing import Any

from sqlalchemy.orm import Session

from infrastructure.database.models import SystemEvent

logger = logging.getLogger(__name__)

MAX_TEXT_LENGTH = 500
MAX_METADATA_ITEMS = 20


def _safe_value(value: Any) -> Any:
    if value is None or isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, str):
        return value[:MAX_TEXT_LENGTH]
    if isinstance(value, (list, tuple)):
        return [_safe_value(item) for item in value[:MAX_METADATA_ITEMS]]
    if isinstance(value, dict):
        return {
            str(key)[:80]: _safe_value(item)
            for key, item in list(value.items())[:MAX_METADATA_ITEMS]
        }
    return str(value)[:MAX_TEXT_LENGTH]


def sanitize_metadata(metadata: dict[str, Any] | None) -> dict[str, Any]:
    if not metadata:
        return {}
    blocked_terms = ("password", "senha", "token", "secret", "key", "credential")
    safe: dict[str, Any] = {}
    for key, value in metadata.items():
        key_text = str(key)
        if any(term in key_text.lower() for term in blocked_terms):
            safe[key_text] = "[redacted]"
        else:
            safe[key_text] = _safe_value(value)
    return safe


def record_system_event(
    db: Session,
    *,
    level: str,
    event_type: str,
    message: str,
    user_email: str | None = None,
    request_id: str | None = None,
    metadata: dict[str, Any] | None = None,
    commit: bool = True,
) -> None:
    try:
        db.add(SystemEvent(
            level=level,
            event_type=event_type,
            user_email=user_email,
            request_id=request_id,
            message=message[:MAX_TEXT_LENGTH],
            metadata_json=sanitize_metadata(metadata),
        ))
        if commit:
            db.commit()
        else:
            db.flush()
    except Exception:
        db.rollback()
        logger.exception("Falha ao registrar evento de observabilidade: %s", event_type)
