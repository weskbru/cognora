from fastapi import HTTPException

from api.routes.upload import _get_supabase
from core.config.settings import _clean_env, settings


def test_clean_env_remove_prefixo_aspas_e_espacos(monkeypatch):
    monkeypatch.setenv(
        "SUPABASE_URL",
        '  SUPABASE_URL="https://example.supabase.co"  ',
    )

    assert _clean_env("SUPABASE_URL") == "https://example.supabase.co"


def test_get_supabase_rejeita_url_invalida(monkeypatch):
    monkeypatch.setattr(settings, "supabase_url", "SUPABASE_URL=https://example.supabase.co")
    monkeypatch.setattr(settings, "supabase_key", "test-key")

    try:
        _get_supabase()
    except HTTPException as exc:
        assert exc.status_code == 503
        assert "SUPABASE_URL" in exc.detail
    else:
        raise AssertionError("URL inválida deveria ser rejeitada")
