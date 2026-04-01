"""
Testes de integração — Rota de limites freemium.
Cobre: GET /api/limits/status
"""
import pytest

from domain.use_cases.limits import FREE_DAILY_LIMIT, FREE_DOCS_PER_SUBJECT, FREE_SUBJECT_LIMIT


class TestLimitsStatus:
    def test_retorna_200_autenticado(self, client, auth_headers):
        response = client.get("/api/limits/status", headers=auth_headers)
        assert response.status_code == 200

    def test_retorna_401_sem_autenticacao(self, client):
        response = client.get("/api/limits/status")
        assert response.status_code == 401

    def test_retorna_401_com_token_invalido(self, client):
        response = client.get(
            "/api/limits/status",
            headers={"Authorization": "Bearer invalido"},
        )
        assert response.status_code == 401

    def test_campos_presentes_na_resposta(self, client, auth_headers):
        response = client.get("/api/limits/status", headers=auth_headers)
        data = response.json()
        campos_esperados = {
            "used", "limit", "remaining", "can_generate",
            "plan", "has_daily_bonus", "subject_limit", "docs_per_subject_limit",
        }
        assert campos_esperados.issubset(data.keys())

    def test_novo_usuario_tem_limite_completo(self, client, auth_headers):
        response = client.get("/api/limits/status", headers=auth_headers)
        data = response.json()
        assert data["used"] == 0
        assert data["can_generate"] is True

    def test_plano_padrao_e_free(self, client, auth_headers):
        response = client.get("/api/limits/status", headers=auth_headers)
        assert response.json()["plan"] == "free"

    def test_plano_free_tem_limites_de_materias_e_docs(self, client, auth_headers):
        response = client.get("/api/limits/status", headers=auth_headers)
        data = response.json()
        assert data["subject_limit"] == FREE_SUBJECT_LIMIT
        assert data["docs_per_subject_limit"] == FREE_DOCS_PER_SUBJECT

    def test_limite_base_e_free_daily_limit(self, client, auth_headers):
        response = client.get("/api/limits/status", headers=auth_headers)
        data = response.json()
        # Limite pode ser FREE_DAILY_LIMIT ou FREE_DAILY_LIMIT+1 (com bônus)
        assert data["limit"] in (FREE_DAILY_LIMIT, FREE_DAILY_LIMIT + 1)

    def test_remaining_e_limit_menos_used(self, client, auth_headers):
        response = client.get("/api/limits/status", headers=auth_headers)
        data = response.json()
        assert data["remaining"] == data["limit"] - data["used"]
