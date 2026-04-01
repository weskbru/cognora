"""
Testes de integração — Rotas de autenticação.
Cobre: POST /api/auth/register, POST /api/auth/login, GET /api/auth/me
"""
import uuid

import pytest


def _payload_unico() -> dict:
    """Gera credenciais únicas por teste."""
    return {
        "email": f"auth_{uuid.uuid4().hex[:8]}@cognora.com",
        "password": "senha_segura_123",
    }


class TestRegister:
    def test_registro_bem_sucedido_retorna_201(self, client):
        response = client.post("/api/auth/register", json=_payload_unico())
        assert response.status_code == 201

    def test_registro_retorna_token_e_email(self, client):
        payload = _payload_unico()
        response = client.post("/api/auth/register", json=payload)
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["email"] == payload["email"]

    def test_registro_retorna_generations_remaining(self, client):
        response = client.post("/api/auth/register", json=_payload_unico())
        assert "generations_remaining" in response.json()

    def test_email_duplicado_retorna_400(self, client):
        payload = _payload_unico()
        client.post("/api/auth/register", json=payload)
        response = client.post("/api/auth/register", json=payload)
        assert response.status_code == 400
        assert "cadastrado" in response.json()["detail"].lower()

    def test_sem_email_retorna_422(self, client):
        response = client.post("/api/auth/register", json={"password": "abc"})
        assert response.status_code == 422

    def test_sem_senha_retorna_422(self, client):
        response = client.post("/api/auth/register", json={"email": "x@x.com"})
        assert response.status_code == 422

    def test_corpo_vazio_retorna_422(self, client):
        response = client.post("/api/auth/register", json={})
        assert response.status_code == 422

    def test_token_retornado_e_utilizavel(self, client):
        payload = _payload_unico()
        reg_resp = client.post("/api/auth/register", json=payload)
        token = reg_resp.json()["access_token"]

        me_resp = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me_resp.status_code == 200
        assert me_resp.json()["email"] == payload["email"]


class TestLogin:
    def _registrar(self, client, payload):
        client.post("/api/auth/register", json=payload)

    def test_login_bem_sucedido_retorna_200(self, client):
        payload = _payload_unico()
        self._registrar(client, payload)
        response = client.post("/api/auth/login", json=payload)
        assert response.status_code == 200

    def test_login_retorna_token_email_e_bonus(self, client):
        payload = _payload_unico()
        self._registrar(client, payload)
        response = client.post("/api/auth/login", json=payload)
        data = response.json()
        assert "access_token" in data
        assert data["email"] == payload["email"]
        assert "generations_remaining" in data
        assert "has_daily_bonus" in data

    def test_senha_errada_retorna_401(self, client):
        payload = _payload_unico()
        self._registrar(client, payload)
        response = client.post("/api/auth/login", json={
            "email": payload["email"],
            "password": "senha_completamente_errada",
        })
        assert response.status_code == 401

    def test_email_inexistente_retorna_401(self, client):
        response = client.post("/api/auth/login", json={
            "email": "nao_existe@cognora.com",
            "password": "qualquer",
        })
        assert response.status_code == 401

    def test_campos_ausentes_retornam_422(self, client):
        response = client.post("/api/auth/login", json={"email": "a@b.com"})
        assert response.status_code == 422

    def test_token_de_login_e_valido(self, client):
        payload = _payload_unico()
        self._registrar(client, payload)
        login_resp = client.post("/api/auth/login", json=payload)
        token = login_resp.json()["access_token"]

        me_resp = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me_resp.status_code == 200


class TestMe:
    def test_me_autenticado_retorna_email_e_id(self, client, auth_headers, test_user):
        response = client.get("/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user.email
        assert "id" in data

    def test_me_sem_autenticacao_retorna_401(self, client):
        response = client.get("/api/auth/me")
        assert response.status_code == 401

    def test_me_com_token_invalido_retorna_401(self, client):
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer token.invalido.aqui"},
        )
        assert response.status_code == 401

    def test_me_com_bearer_malformado_retorna_401(self, client):
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": "Basic dXNlcjpwYXNz"},
        )
        assert response.status_code == 401

    def test_me_id_e_string_uuid_valido(self, client, auth_headers):
        response = client.get("/api/auth/me", headers=auth_headers)
        data = response.json()
        # Deve ser um UUID válido
        uuid.UUID(data["id"])
