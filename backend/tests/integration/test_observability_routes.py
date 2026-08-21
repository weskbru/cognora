from infrastructure.database.models import SystemEvent


def test_request_id_header_e_retornado(client, auth_headers):
    response = client.get("/api/auth/me", headers=auth_headers)

    assert response.status_code == 200
    assert response.headers.get("X-Request-ID")


def test_request_id_recebido_e_reutilizado(client, auth_headers):
    response = client.get("/api/auth/me", headers={**auth_headers, "X-Request-ID": "req-test-123"})

    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == "req-test-123"


def test_frontend_evento_autenticado_e_registrado(client, db, auth_headers, test_user):
    response = client.post(
        "/api/observability/frontend-events",
        json={
            "level": "error",
            "event_type": "frontend_api_failure",
            "message": "Falha ao carregar documentos.",
            "request_id": "req-front-123",
            "metadata": {"path": "/documents", "status": 500, "token": "nao-deve-vazar"},
        },
        headers=auth_headers,
    )

    assert response.status_code == 201
    event = db.query(SystemEvent).filter(SystemEvent.request_id == "req-front-123").first()
    assert event is not None
    assert event.user_email == test_user.email
    assert event.event_type == "frontend_api_failure"
    assert event.metadata_json["token"] == "[redacted]"


def test_frontend_evento_sem_auth_retorna_401(client):
    response = client.post(
        "/api/observability/frontend-events",
        json={
            "level": "error",
            "event_type": "frontend_error",
            "message": "Erro renderizando tela.",
        },
    )

    assert response.status_code == 401
