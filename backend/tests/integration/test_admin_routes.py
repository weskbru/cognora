import uuid
from datetime import datetime

from core.security.jwt import create_token
from core.security.password import hash_password, verify_password
from infrastructure.database.models import (
    AdminAuditLog,
    PixPaymentRequest,
    QuestionAttempt,
    SystemEvent,
    User,
    UserProgress,
)


def _headers(email: str) -> dict:
    return {"Authorization": f"Bearer {create_token(email)}"}


def _admin_user(db) -> User:
    suffix = uuid.uuid4().hex[:8]
    admin = User(
        email=f"admin_panel_{suffix}@cognora.com",
        username=f"admin_panel_{suffix}",
        hashed_password=hash_password("senha123"),
        role="admin",
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


def test_usuario_comum_nao_acessa_admin_overview(client, auth_headers):
    response = client.get("/api/admin/overview", headers=auth_headers)

    assert response.status_code == 403


def test_admin_overview_retorna_metricas(client, db):
    admin = _admin_user(db)
    db.add(PixPaymentRequest(
        user_id=admin.id,
        user_email=admin.email,
        user_name=admin.username,
        plan="pro",
        amount_cents=990,
        pix_reference="COG-ADMIN-TEST",
        pix_payload="payload",
        status="pending",
        expires_at=datetime(2099, 1, 1),
    ))
    db.commit()

    response = client.get("/api/admin/overview", headers=_headers(admin.email))

    assert response.status_code == 200
    data = response.json()
    assert "total_users" in data
    assert data["pending_pix"] >= 1
    assert "recent_payment_requests" in data


def test_admin_busca_usuario_e_libera_plano(client, db, test_user):
    admin = _admin_user(db)

    search_response = client.get(
        f"/api/admin/users?q={test_user.email}",
        headers=_headers(admin.email),
    )
    assert search_response.status_code == 200
    assert search_response.json()[0]["email"] == test_user.email

    grant_response = client.post(
        f"/api/admin/users/{test_user.id}/grant-plan",
        json={"plan": "pro", "days": 45, "note": "liberacao manual"},
        headers=_headers(admin.email),
    )

    assert grant_response.status_code == 200
    progress = db.query(UserProgress).filter(UserProgress.user_email == test_user.email).first()
    assert progress.plan == "pro"
    assert progress.subscription_status == "active"
    assert db.query(AdminAuditLog).filter(AdminAuditLog.action == "manual_plan_granted").count() >= 1


def test_admin_revoga_plano(client, db, test_user):
    admin = _admin_user(db)
    db.add(UserProgress(user_email=test_user.email, plan="pro", subscription_status="active"))
    db.commit()

    response = client.post(
        f"/api/admin/users/{test_user.id}/revoke-plan",
        json={"note": "fraude confirmada"},
        headers=_headers(admin.email),
    )

    assert response.status_code == 200
    progress = db.query(UserProgress).filter(UserProgress.user_email == test_user.email).first()
    assert progress.plan == "free"
    assert progress.subscription_status == "inactive"


def test_admin_lista_auditoria(client, db):
    admin = _admin_user(db)
    db.add(AdminAuditLog(
        admin_user_id=admin.id,
        admin_email=admin.email,
        action="manual_plan_granted",
        target_user_email="alvo@cognora.com",
        target_type="user",
        target_id="target-id",
        metadata_json={"plan": "pro"},
    ))
    db.commit()

    response = client.get("/api/admin/audit-logs?q=alvo", headers=_headers(admin.email))

    assert response.status_code == 200
    assert response.json()[0]["action"] == "manual_plan_granted"


def test_usuario_comum_nao_acessa_eventos_do_sistema(client, auth_headers):
    response = client.get("/api/admin/system-events", headers=auth_headers)

    assert response.status_code == 403


def test_admin_lista_eventos_do_sistema(client, db):
    admin = _admin_user(db)
    db.add(SystemEvent(
        level="error",
        event_type="ai_generation_failed",
        user_email="aluno@cognora.com",
        message="Falha na geracao de conteudo por IA.",
        metadata_json={"provider": "fallback"},
    ))
    db.commit()

    response = client.get(
        "/api/admin/system-events?q=aluno&level=error",
        headers=_headers(admin.email),
    )

    assert response.status_code == 200
    data = response.json()
    assert data[0]["event_type"] == "ai_generation_failed"
    assert data[0]["metadata"]["provider"] == "fallback"


def test_admin_summary_eventos_do_sistema(client, db):
    admin = _admin_user(db)
    db.add(SystemEvent(
        level="warning",
        event_type="auth_login_failed",
        user_email="aluno@cognora.com",
        message="Falha de login.",
        metadata_json={"identifier": "aluno@cognora.com"},
    ))
    db.commit()

    response = client.get("/api/admin/system-events/summary", headers=_headers(admin.email))

    assert response.status_code == 200
    data = response.json()
    assert data["last_24h"]["warning"] >= 1
    assert data["by_type_7d"]["auth_login_failed"] >= 1


def test_admin_reseta_senha_de_usuario(client, db, test_user):
    admin = _admin_user(db)

    response = client.post(
        f"/api/admin/users/{test_user.id}/reset-password",
        json={"new_password": "nova_senha_segura_123", "note": "suporte"},
        headers=_headers(admin.email),
    )

    assert response.status_code == 200
    db.refresh(test_user)
    assert verify_password("nova_senha_segura_123", test_user.hashed_password)
    assert db.query(AdminAuditLog).filter(AdminAuditLog.action == "user_password_reset_by_admin").count() >= 1


def test_admin_exclui_usuario_com_confirmacao(client, db, test_user):
    admin = _admin_user(db)
    db.add(UserProgress(user_email=test_user.email, plan="pro", subscription_status="active"))
    db.add(QuestionAttempt(question_id="q1", user_email=test_user.email, is_correct=True))
    db.commit()

    response = client.request(
        "DELETE",
        f"/api/admin/users/{test_user.id}",
        json={"confirm_email": test_user.email, "note": "solicitacao do usuario"},
        headers=_headers(admin.email),
    )

    assert response.status_code == 200
    assert db.query(User).filter(User.id == test_user.id).first() is None
    assert db.query(UserProgress).filter(UserProgress.user_email == test_user.email).first() is None
    assert db.query(QuestionAttempt).filter(QuestionAttempt.user_email == test_user.email).first() is None
    assert db.query(AdminAuditLog).filter(AdminAuditLog.action == "user_deleted_by_admin").count() >= 1


def test_admin_nao_exclui_a_propria_conta(client, db):
    admin = _admin_user(db)

    response = client.request(
        "DELETE",
        f"/api/admin/users/{admin.id}",
        json={"confirm_email": admin.email},
        headers=_headers(admin.email),
    )

    assert response.status_code == 400
    assert db.query(User).filter(User.id == admin.id).first() is not None
