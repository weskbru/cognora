import logging
from contextvars import ContextVar
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from core.config.settings import settings
from infrastructure.database.models import ObservabilityAlertState, SystemEvent

logger = logging.getLogger(__name__)

MAX_TEXT_LENGTH = 500
MAX_METADATA_ITEMS = 20
_request_id_context: ContextVar[str | None] = ContextVar("request_id", default=None)


def set_current_request_id(request_id: str) -> object:
    return _request_id_context.set(request_id)


def reset_current_request_id(token: object) -> None:
    _request_id_context.reset(token)


def get_current_request_id() -> str | None:
    return _request_id_context.get()


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


def cleanup_old_system_events(db: Session, retention_days: int | None = None) -> int:
    days = retention_days if retention_days is not None else settings.observability_retention_days
    if days <= 0:
        return 0
    cutoff = datetime.utcnow() - timedelta(days=days)
    deleted = db.query(SystemEvent).filter(SystemEvent.created_at < cutoff).delete()
    db.commit()
    return deleted


def _send_observability_alert_email(subject: str, html: str) -> bool:
    if not settings.resend_api_key or not settings.observability_alert_emails:
        return False
    try:
        import resend

        resend.api_key = settings.resend_api_key
        resend.Emails.send({
            "from": "Cognora <onboarding@resend.dev>",
            "to": settings.observability_alert_emails,
            "subject": subject,
            "html": html,
        })
        return True
    except Exception:
        logger.exception("Falha ao enviar alerta de observabilidade por email")
        return False


def _maybe_send_error_alert(db: Session) -> None:
    threshold = settings.observability_alert_error_threshold
    window_minutes = settings.observability_alert_window_minutes
    cooldown_minutes = settings.observability_alert_cooldown_minutes
    recipients = settings.observability_alert_emails
    if threshold <= 0 or window_minutes <= 0 or cooldown_minutes <= 0 or not recipients or not settings.resend_api_key:
        return

    now = datetime.utcnow()
    since = now - timedelta(minutes=window_minutes)
    error_count = (
        db.query(SystemEvent)
        .filter(SystemEvent.level == "error", SystemEvent.created_at >= since)
        .count()
    )
    if error_count < threshold:
        return

    alert_key = f"error-spike:{threshold}:{window_minutes}"
    state = db.query(ObservabilityAlertState).filter(ObservabilityAlertState.alert_key == alert_key).first()
    if state and state.last_sent_at > now - timedelta(minutes=cooldown_minutes):
        return

    recent_errors = (
        db.query(SystemEvent)
        .filter(SystemEvent.level == "error", SystemEvent.created_at >= since)
        .order_by(SystemEvent.created_at.desc())
        .limit(5)
        .all()
    )
    lines = "".join(
        f"<li><strong>{event.event_type}</strong> - {event.message}"
        f"<br><small>{event.user_email or '-'} | {event.request_id or '-'}</small></li>"
        for event in recent_errors
    )
    sent = _send_observability_alert_email(
        subject=f"Cognora: {error_count} erros em {window_minutes} min",
        html=f"""
        <p>O painel de observabilidade registrou <strong>{error_count}</strong> erros nos ultimos {window_minutes} minutos.</p>
        <p>Eventos recentes:</p>
        <ul>{lines}</ul>
        <p>Abra o painel admin e filtre por nivel <strong>Erro</strong> para investigar.</p>
        """,
    )
    if not sent:
        return

    if state:
        state.last_sent_at = now
    else:
        db.add(ObservabilityAlertState(alert_key=alert_key, last_sent_at=now))
    db.add(SystemEvent(
        level="info",
        event_type="observability_alert_sent",
        message="Alerta de pico de erros enviado por email.",
        metadata_json={
            "error_count": error_count,
            "window_minutes": window_minutes,
            "cooldown_minutes": cooldown_minutes,
            "recipients": recipients,
        },
    ))
    db.commit()


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
    notify: bool = True,
) -> None:
    try:
        event_request_id = request_id or get_current_request_id()
        db.add(SystemEvent(
            level=level,
            event_type=event_type,
            user_email=user_email,
            request_id=event_request_id,
            message=message[:MAX_TEXT_LENGTH],
            metadata_json=sanitize_metadata(metadata),
        ))
        if commit:
            db.commit()
            if notify and level == "error":
                _maybe_send_error_alert(db)
        else:
            db.flush()
    except Exception:
        db.rollback()
        logger.exception("Falha ao registrar evento de observabilidade: %s", event_type)
