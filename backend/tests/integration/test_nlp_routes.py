"""
Testes de integração — Rotas de análise NLP.
Cobre: POST /api/nlp/analisar, POST /api/nlp/analisar-documento

O ServicoAnaliseNLP é mockado para evitar chamadas reais à API externa.
"""
import io
import uuid
from datetime import date
from unittest.mock import AsyncMock, MagicMock

import pytest

from api.routes.nlp import _get_servico
from infrastructure.database.models import Document, Flashcard, Question, Subject, Summary, UserProgress
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

    def test_bloqueia_resumo_sem_creditos_suficientes_sem_chamar_ia(self, client, auth_headers, db, test_user):
        service = AsyncMock()
        db.add(UserProgress(
            user_email=test_user.email,
            summaries_used_month=5,
            usage_month=date.today().replace(day=1),
        ))
        db.commit()

        app.dependency_overrides[_get_servico] = lambda: service
        try:
            response = client.post(
                "/api/nlp/analisar",
                json={"texto": "A" * 100, "operation": "summary"},
                headers=auth_headers,
            )
        finally:
            app.dependency_overrides.pop(_get_servico, None)

        assert response.status_code == 403
        assert response.json()["detail"]["message"] == "Você atingiu o limite mensal de resumos do seu plano."
        service.analisar.assert_not_called()

    @pytest.mark.parametrize("question_count", [3, 5, 10])
    def test_gerar_questoes_desconta_um_uso_mensal(self, client, auth_headers, db, test_user, question_count):
        app.dependency_overrides[_get_servico] = _servico_mock
        try:
            response = client.post(
                "/api/nlp/analisar",
                json={"texto": "A" * 100, "operation": "questions", "question_count": question_count},
                headers=auth_headers,
            )
        finally:
            app.dependency_overrides.pop(_get_servico, None)

        progress = db.query(UserProgress).filter(UserProgress.user_email == test_user.email).first()
        assert response.status_code == 200
        assert progress.questions_used_month == 1

    def test_gerar_flashcards_desconta_um_uso_mensal(self, client, auth_headers, db, test_user):
        app.dependency_overrides[_get_servico] = _servico_mock
        try:
            response = client.post(
                "/api/nlp/analisar",
                json={"texto": "A" * 100, "operation": "flashcards"},
                headers=auth_headers,
            )
        finally:
            app.dependency_overrides.pop(_get_servico, None)

        progress = db.query(UserProgress).filter(UserProgress.user_email == test_user.email).first()
        assert response.status_code == 200
        assert progress.flashcards_used_month == 1


class TestAnalisarDocumento:
    def _documento_do_usuario(self, db, email):
        subject = Subject(name="Matéria NLP", owner_email=email)
        db.add(subject)
        db.commit()
        db.refresh(subject)
        document = Document(name="doc.pdf", subject_id=subject.id, file_url="http://localhost/uploads/doc.pdf")
        db.add(document)
        db.commit()
        db.refresh(document)
        return document

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

    def test_bloqueia_segundo_resumo_no_mesmo_pdf(self, client, auth_headers, db, test_user):
        document = self._documento_do_usuario(db, test_user.email)
        db.add(Summary(content="Resumo", document_id=document.id))
        db.commit()

        response = client.post(
            "/api/nlp/analisar-documento",
            json={"file_url": document.file_url, "document_id": str(document.id), "operation": "summary"},
            headers=auth_headers,
        )

        assert response.status_code == 403
        assert response.json()["detail"]["message"] == "No plano gratuito, este PDF já possui essa geração. Faça upgrade para gerar novamente."

    def test_bloqueia_segunda_geracao_de_questoes_no_mesmo_pdf(self, client, auth_headers, db, test_user):
        document = self._documento_do_usuario(db, test_user.email)
        db.add(Question(statement="Q?", document_id=document.id))
        db.commit()

        response = client.post(
            "/api/nlp/analisar-documento",
            json={"file_url": document.file_url, "document_id": str(document.id), "operation": "questions", "question_count": 3},
            headers=auth_headers,
        )

        assert response.status_code == 403
        assert response.json()["detail"]["message"] == "No plano gratuito, este PDF já possui essa geração. Faça upgrade para gerar novamente."

    def test_bloqueia_segunda_geracao_de_flashcards_no_mesmo_pdf(self, client, auth_headers, db, test_user):
        document = self._documento_do_usuario(db, test_user.email)
        db.add(Flashcard(front="F", back="B", document_id=document.id))
        db.commit()

        response = client.post(
            "/api/nlp/analisar-documento",
            json={"file_url": document.file_url, "document_id": str(document.id), "operation": "flashcards"},
            headers=auth_headers,
        )

        assert response.status_code == 403
        assert response.json()["detail"]["message"] == "No plano gratuito, este PDF já possui essa geração. Faça upgrade para gerar novamente."

    def test_analise_bem_sucedida_com_arquivo_real(self, client, auth_headers):
        """Sobe um arquivo via /upload e depois analisa via mock do NLP."""
        from unittest.mock import patch

        # 1. Upload do arquivo
        subject_resp = client.post(
            "/api/subjects",
            json={"name": "Matéria NLP Upload"},
            headers=auth_headers,
        )
        assert subject_resp.status_code == 201
        upload_resp = client.post(
            "/api/upload",
            files={"file": ("documento.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf")},
            data={"subject_id": subject_resp.json()["id"]},
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

        subject_resp = client.post(
            "/api/subjects",
            json={"name": "Matéria NLP Scan"},
            headers=auth_headers,
        )
        assert subject_resp.status_code == 201
        upload_resp = client.post(
            "/api/upload",
            files={"file": ("scan.pdf", io.BytesIO(b"%PDF-1.4 image-only"), "application/pdf")},
            data={"subject_id": subject_resp.json()["id"]},
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
