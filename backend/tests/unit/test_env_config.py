import importlib

import core.config.settings as settings_module
from core.config.settings import _clean_env


def test_clean_env_remove_prefixo_aspas_e_espacos(monkeypatch):
    monkeypatch.setenv(
        "PIX_KEY",
        '  PIX_KEY="abc-123"  ',
    )

    assert _clean_env("PIX_KEY") == "abc-123"


def test_upload_dir_pode_ser_configurado_por_env(monkeypatch):
    monkeypatch.setenv("UPLOAD_DIR", "/tmp/cognora-uploads")

    reloaded = importlib.reload(settings_module)

    assert reloaded.Settings.upload_dir == "/tmp/cognora-uploads"
    monkeypatch.delenv("UPLOAD_DIR", raising=False)
    importlib.reload(settings_module)
