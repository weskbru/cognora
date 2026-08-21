from core.config.settings import settings
from domain.use_cases import auth


def test_google_verification_reutiliza_request_com_cache(monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "client-id")
    seen_requests = []

    def fake_verify(credential, request, audience):
        seen_requests.append(request)
        return {"sub": credential, "aud": audience, "iss": "accounts.google.com"}

    monkeypatch.setattr(auth.id_token, "verify_oauth2_token", fake_verify)

    assert auth._verify_google_token("one") is not None
    assert auth._verify_google_token("two") is not None
    assert seen_requests == [auth._google_request, auth._google_request]
