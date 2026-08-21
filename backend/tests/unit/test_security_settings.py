import pytest
import importlib


settings_module = importlib.import_module("core.config.settings")


def test_rejects_insecure_session_cookie_in_production(monkeypatch):
    settings = settings_module.settings
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "secret_key", "a" * 32)
    monkeypatch.setattr(settings, "session_cookie_secure", False)
    monkeypatch.setattr(settings, "allowed_origins", ["https://app.example.com"])

    with pytest.raises(RuntimeError, match="SESSION_COOKIE_SECURE"):
        settings_module.validate_security_settings()


def test_rejects_wildcard_origin_in_production(monkeypatch):
    settings = settings_module.settings
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "secret_key", "a" * 32)
    monkeypatch.setattr(settings, "session_cookie_secure", True)
    monkeypatch.setattr(settings, "allowed_origins", ["*"])

    with pytest.raises(RuntimeError, match="ALLOWED_ORIGINS"):
        settings_module.validate_security_settings()


def test_rejects_samesite_none_without_secure(monkeypatch):
    settings = settings_module.settings
    monkeypatch.setattr(settings, "environment", "development")
    monkeypatch.setattr(settings, "session_cookie_samesite", "none")
    monkeypatch.setattr(settings, "session_cookie_secure", False)

    with pytest.raises(RuntimeError, match="SameSite=None"):
        settings_module.validate_security_settings()
