"""
Testes de integração — Rotas de análise NLP.
Cobre: POST /api/nlp/analisar, POST /api/nlp/analisar-documento

O ServicoAnaliseNLP é mockado para evitar chamadas reais à API externa.
"""
import io
import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from api.routes.nlp import _get_servico
from main import app

# ── Resultado mockado retornado pelo serviço NLP ──────────────────────────
_MOCK_RESULTADO = MagicMock()
_MOCK_RESULTADO.model_dump.return_value = {
    "resumo": "Resumo gerado pelo mock.",
    "perguntas": [
        {
            "statement": "Questão de exemplo?",
            "type": "multiple_choice",
            "alternatives": [
                {"text": "Opção A", "correct": True},
                {"text": "Opção B", "correct": False},
                {"text": "Opção C", "correct": False},
                {"text": "Opção D", "correct": False},
            ],
            "difficulty": "easy",
            "explanation": "Explicação da resposta.",
        }
    ],
    "flashcards": [
        {"front": "Conceito?", "back": "Definição do conceito."}
    ],
}


def _servico_mock():
    """Factory que retorna um ServicoAnaliseNLP mockado."""
    service = AsyncMock()
    service.analisar.return_value = _MOCK_RESULTADO
    return service


class TestAnalisarTexto:
    def test_analise_bem_sucedida_retorna_200(self, client, auth_headers):
        app.dependency_overrides[_get_servico] = _servico_mock
        try:
            response = client.post(
                "/api/nlp/analisar",
                json={"texto": "A" * 100},
                headers=auth_headers,
            )
        finally:
            app.dependency_overrides.pop(_get_servico, None)
        assert response.status_code == 200

    def test_retorna_resumo_perguntas_e_flashcards(self, client, auth_headers):
        app.dependency_overrides[_get_servico] = _servico_mock
        try:
            response = client.post(
                "/api/nlp/analisar",
                json={"texto": "B" * 100},
                headers=auth_headers,
            )
        finally:
            app.dependency_overrides.pop(_get_servico, None)
        data = response.json()
        assert "resumo" in data
        assert "perguntas" in data
        assert "flashcards" in data

    def test_texto_muito_curto_retorna_422(self, client, auth_headers):
        response = client.post(
            "/api/nlp/analisar",
            json={"texto": "curto"},
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_texto_com_exatamente_50_chars_e_aceito(self, client, auth_headers):
        app.dependency_overrides[_get_servico] = _servico_mock
        try:
            response = client.post(
                "/api/nlp/analisar",
                json={"texto": "x" * 50},
                headers=auth_headers,
            )
        finally:
            app.dependency_overrides.pop(_get_servico, None)
        assert response.status_code == 200

    def test_sem_autenticacao_retorna_401(self, client):
        response = client.post(
            "/api/nlp/analisar",
            json={"texto": "A" * 100},
        )
        assert response.status_code == 401

    def test_corpo_vazio_retorna_422(self, client, auth_headers):
        response = client.post(
            "/api/nlp/analisar",
            json={},
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_value_error_no_servico_retorna_422(self, client, auth_headers):
        def _servico_value_error():
            svc = AsyncMock()
            svc.analisar.side_effect = ValueError("JSON inválido retornado pela IA.")
            return svc

        app.dependency_overrides[_get_servico] = _servico_value_error
        try:
            response = client.post(
                "/api/nlp/analisar",
                json={"texto": "A" * 100},
                headers=auth_headers,
            )
        finally:
            app.dependency_overrides.pop(_get_servico, None)
        assert response.status_code == 422

    def test_runtime_error_no_servico_retorna_500(self, client, auth_headers):
        def _servico_runtime_error():
            svc = AsyncMock()
            svc.analisar.side_effect = RuntimeError("Falha na comunicação com a API.")
            return svc

        app.dependency_overrides[_get_servico] = _servico_runtime_error
        try:
            response = client.post(
                "/api/nlp/analisar",
                json={"texto": "A" * 100},
                headers=auth_headers,
            )
        finally:
            app.dependency_overrides.pop(_get_servico, None)
        assert response.status_code == 500


class TestAnalisarDocumento:
    def test_arquivo_inexistente_retorna_404(self, client, auth_headers):
        response = client.post(
            "/api/nlp/analisar-documento",
            json={"file_url": "http://localhost/uploads/nao_existe_xyz.pdf"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    def test_sem_autenticacao_retorna_401(self, client):
        response = client.post(
            "/api/nlp/analisar-documento",
            json={"file_url": "http://localhost/uploads/qualquer.pdf"},
        )
        assert response.status_code == 401

    def test_body_vazio_retorna_422(self, client, auth_headers):
        response = client.post(
            "/api/nlp/analisar-documento",
            json={},
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_analise_bem_sucedida_com_arquivo_real(self, client, auth_headers):
        """Sobe um arquivo via /upload e depois analisa via mock do NLP."""
        from unittest.mock import patch

        # 1. Upload do arquivo
        upload_resp = client.post(
            "/api/upload",
            files={"file": ("documento.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf")},
            headers=auth_headers,
        )
        assert upload_resp.status_code == 200
        file_url = upload_resp.json()["file_url"]

        # 2. Analisa documento com NLP e PDF extractor mockados
        app.dependency_overrides[_get_servico] = _servico_mock
        try:
            with patch(
                "api.routes.nlp.extrair_texto_pdf",
                return_value="Conteúdo extraído do PDF. " * 10,
            ):
                response = client.post(
                    "/api/nlp/analisar-documento",
                    json={"file_url": file_url},
                    headers=auth_headers,
                )
        finally:
            app.dependency_overrides.pop(_get_servico, None)

        assert response.status_code == 200
        data = response.json()
        assert "resumo" in data
        assert "perguntas" in data

    def test_pdf_sem_texto_extraivel_retorna_422(self, client, auth_headers):
        """PDF sem texto (ex.: escaneado) deve retornar 422."""
        from unittest.mock import patch

        upload_resp = client.post(
            "/api/upload",
            files={"file": ("scan.pdf", io.BytesIO(b"%PDF-1.4 image-only"), "application/pdf")},
            headers=auth_headers,
        )
        file_url = upload_resp.json()["file_url"]

        with patch(
            "api.routes.nlp.extrair_texto_pdf",
            side_effect=ValueError("Nenhum texto encontrado no PDF."),
        ):
            response = client.post(
                "/api/nlp/analisar-documento",
                json={"file_url": file_url},
                headers=auth_headers,
            )
        assert response.status_code == 422
