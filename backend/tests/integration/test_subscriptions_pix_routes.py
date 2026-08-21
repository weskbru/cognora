from core.config.settings import settings
from core.security.jwt import create_token
from core.security.password import hash_password
from infrastructure.database.models import User, UserProgress


def _headers(email: str) -> dict:
    return {"Authorization": f"Bearer {create_token(email)}"}


def test_usuario_cria_pedido_pix(client, auth_headers):
    settings.pix_key = "test-pix-key"

    response = client.post("/api/subscriptions/pix", json={"plan": "pro"}, headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["plan"] == "pro"
    assert data["amount_cents"] == 990
    assert data["status"] == "pending"
    assert data["pix_reference"].startswith("COG-")
    assert data["pix_payload"]
    assert data["qr_code_data_url"].startswith("data:image/png;base64,")


def test_usuario_comum_nao_acessa_admin(client, auth_headers):
    response = client.get("/api/subscriptions/admin/payment-requests", headers=auth_headers)

    assert response.status_code == 403


def test_admin_aprova_pix_e_ativa_plano(client, db, test_user, auth_headers):
    settings.pix_key = "test-pix-key"
    admin = User(
        email="admin_pix@cognora.com",
        hashed_password=hash_password("senha123"),
        role="admin",
    )
    db.add(admin)
    db.commit()

    create_response = client.post("/api/subscriptions/pix", json={"plan": "pro"}, headers=auth_headers)
    payment_id = create_response.json()["id"]

    approve_response = client.post(
        f"/api/subscriptions/admin/payment-requests/{payment_id}/approve",
        json={"admin_note": "confirmado no extrato"},
        headers=_headers(admin.email),
    )

    assert approve_response.status_code == 200
    assert approve_response.json()["status"] == "approved"

    status_response = client.get("/api/subscriptions/status", headers=auth_headers)
    status = status_response.json()
    assert status["plan"] == "pro"
    assert status["subscription_status"] == "active"
    assert status["plan_expires_at"] is not None


def test_user_progress_nao_permita_auto_upgrade(client, db, auth_headers, test_user):
    create_response = client.post(
        "/api/user_progress",
        json={"user_email": test_user.email, "plan": "pro", "xp": 10},
        headers=auth_headers,
    )

    assert create_response.status_code == 201
    progress = db.query(UserProgress).filter(UserProgress.user_email == test_user.email).first()
    assert progress.plan in (None, "free")
