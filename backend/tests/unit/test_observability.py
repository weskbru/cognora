from datetime import datetime, timedelta

from core.config.settings import settings
from infrastructure.database.models import ObservabilityAlertState, SystemEvent
from infrastructure.observability import cleanup_old_system_events, record_system_event


def test_cleanup_old_system_events_remove_apenas_eventos_antigos(db):
    db.add(SystemEvent(
        level="info",
        event_type="old_event",
        message="Evento antigo",
        created_at=datetime.utcnow() - timedelta(days=40),
    ))
    db.add(SystemEvent(
        level="info",
        event_type="recent_event",
        message="Evento recente",
        created_at=datetime.utcnow(),
    ))
    db.commit()

    deleted = cleanup_old_system_events(db, retention_days=30)

    assert deleted >= 1
    assert db.query(SystemEvent).filter(SystemEvent.event_type == "old_event").first() is None
    assert db.query(SystemEvent).filter(SystemEvent.event_type == "recent_event").first() is not None


def test_record_system_event_envia_alerta_quando_erros_passam_do_limite(db, monkeypatch):
    current_errors = db.query(SystemEvent).filter(SystemEvent.level == "error").count()
    threshold = current_errors + 2
    sent_emails = []

    monkeypatch.setattr(settings, "resend_api_key", "test-key")
    monkeypatch.setattr(settings, "observability_alert_emails", ["admin@cognora.com"])
    monkeypatch.setattr(settings, "observability_alert_error_threshold", threshold)
    monkeypatch.setattr(settings, "observability_alert_window_minutes", 10)
    monkeypatch.setattr(settings, "observability_alert_cooldown_minutes", 60)

    def fake_send(subject: str, html: str) -> bool:
        sent_emails.append((subject, html))
        return True

    monkeypatch.setattr("infrastructure.observability._send_observability_alert_email", fake_send)

    record_system_event(db, level="error", event_type="first_error", message="Primeiro erro")
    record_system_event(db, level="error", event_type="second_error", message="Segundo erro")

    alert_key = f"error-spike:{threshold}:10"
    assert db.query(ObservabilityAlertState).filter(ObservabilityAlertState.alert_key == alert_key).first() is not None
    assert db.query(SystemEvent).filter(SystemEvent.event_type == "observability_alert_sent").count() >= 1
    assert len(sent_emails) == 1
