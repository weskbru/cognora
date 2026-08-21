"""
Testes de integração — Rotas de análise NLP.
Cobre: POST /api/nlp/analisar, POST /api/nlp/analisar-documento

O ServicoAnaliseNLP é mockado para evitar chamadas reais à API externa.
"""
import io
import uuid
from datetime import date, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest

from api.routes.nlp import _get_servico
from infrastructure.ai.gemini_nlp_adapter import ResultadoGeminiNLP
from infrastructure.database.models import AIGenerationJob, Document, Flashcard, Question, Subject, Summary, UserProgress
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

    @pytest.mark.parametrize(
        "file_url",
        [
            "https://example.com/documento.pdf",
            "http://127.0.0.1:5432/segredo",
            "file:///etc/passwd",
        ],
    )
    def test_rejeita_origem_externa_sem_realizar_download(self, client, auth_headers, file_url):
        response = client.post(
            "/api/nlp/analisar-documento",
            json={"file_url": file_url},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Cognora" in response.json()["detail"]

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


class TestGeracaoDocumentoAssincrona:
    def _documento_com_upload(self, client, auth_headers):
        subject_response = client.post(
            "/api/subjects",
            json={"name": "Materia job de IA"},
            headers=auth_headers,
        )
        upload_response = client.post(
            "/api/upload",
            files={"file": ("documento-job.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf")},
            data={"subject_id": subject_response.json()["id"]},
            headers=auth_headers,
        )
        document_response = client.post(
            "/api/documents",
            json={
                "name": "Documento job",
                "subject_id": subject_response.json()["id"],
                "file_url": upload_response.json()["file_url"],
                "status": "pending",
            },
            headers=auth_headers,
        )
        assert document_response.status_code == 201
        return document_response.json()

    def _servico_resultado_real(self):
        service = AsyncMock()
        service.analisar.return_value = ResultadoGeminiNLP.model_validate(
            _MOCK_RESULTADO.model_dump.return_value
        )
        return service

    def test_job_retorna_202_e_persiste_resumo_no_backend(self, client, auth_headers, db, test_user):
        from unittest.mock import patch

        document = self._documento_com_upload(client, auth_headers)
        service = self._servico_resultado_real()
        app.dependency_overrides[_get_servico] = lambda: service
        try:
            with patch("api.routes.nlp.extrair_texto_pdf", return_value="Conteudo do PDF " * 20):
                response = client.post(
                    "/api/nlp/jobs",
                    json={"document_id": document["id"], "operation": "summary"},
                    headers=auth_headers,
                )
        finally:
            app.dependency_overrides.pop(_get_servico, None)

        assert response.status_code == 202
        job_response = client.get(f"/api/nlp/jobs/{response.json()['id']}", headers=auth_headers)
        assert job_response.status_code == 200
        assert job_response.json()["status"] == "completed"
        assert job_response.json()["result"]["created_count"] == 1

        db.expire_all()
        summary = db.query(Summary).filter(Summary.document_id == document["id"]).first()
        progress = db.query(UserProgress).filter(UserProgress.user_email == test_user.email).first()
        assert summary.content == "Resumo gerado pelo mock."
        assert progress.summaries_used_month == 1

    def test_falha_do_job_estorna_uso_e_expoe_mensagem_segura(self, client, auth_headers, db, test_user):
        from unittest.mock import patch

        document = self._documento_com_upload(client, auth_headers)
        service = AsyncMock()
        service.analisar.side_effect = RuntimeError("detalhe interno do provedor")
        app.dependency_overrides[_get_servico] = lambda: service
        try:
            with patch("api.routes.nlp.extrair_texto_pdf", return_value="Conteudo do PDF " * 20):
                response = client.post(
                    "/api/nlp/jobs",
                    json={"document_id": document["id"], "operation": "summary"},
                    headers=auth_headers,
                )
        finally:
            app.dependency_overrides.pop(_get_servico, None)

        job_response = client.get(f"/api/nlp/jobs/{response.json()['id']}", headers=auth_headers)
        assert job_response.json()["status"] == "failed"
        assert job_response.json()["error_code"] == "AI_GENERATION_FAILED"
        assert "detalhe interno" not in job_response.json()["error_message"]

        db.expire_all()
        progress = db.query(UserProgress).filter(UserProgress.user_email == test_user.email).first()
        stored_document = db.query(Document).filter(Document.id == document["id"]).first()
        assert progress.summaries_used_month == 0
        assert stored_document.status == "error"

    def test_plano_expirado_e_informado_e_usa_limites_free(self, client, auth_headers, db, test_user):
        from unittest.mock import patch

        document = self._documento_com_upload(client, auth_headers)
        progress = db.query(UserProgress).filter(UserProgress.user_email == test_user.email).first()
        progress.plan = "premium"
        progress.subscription_status = "active"
        progress.plan_expires_at = datetime.utcnow() - timedelta(minutes=1)
        progress.usage_month = date.today().replace(day=1)
        db.commit()
        app.dependency_overrides[_get_servico] = self._servico_resultado_real
        try:
            with patch("api.routes.nlp.extrair_texto_pdf", return_value="Conteudo do PDF " * 20):
                response = client.post(
                    "/api/nlp/jobs",
                    json={"document_id": document["id"], "operation": "summary"},
                    headers=auth_headers,
                )
        finally:
            app.dependency_overrides.pop(_get_servico, None)

        assert response.status_code == 202
        assert response.json()["plan"] == "free"
        assert response.json()["subscription_status"] == "expired"

    def test_repetir_requisicao_reutiliza_job_ativo_sem_consumir_novo_uso(self, client, auth_headers, db, test_user):
        document = self._documento_com_upload(client, auth_headers)
        existing_job = AIGenerationJob(
            user_email=test_user.email,
            document_id=document["id"],
            operation="summary",
            status="queued",
        )
        db.add(existing_job)
        db.commit()

        response = client.post(
            "/api/nlp/jobs",
            json={"document_id": document["id"], "operation": "summary"},
            headers=auth_headers,
        )

        assert response.status_code == 202
        assert response.json()["id"] == str(existing_job.id)
        db.expire_all()
        progress = db.query(UserProgress).filter(UserProgress.user_email == test_user.email).first()
        assert progress.summaries_used_month == 0

    def test_usuario_nao_consulta_job_de_outra_conta(self, client, auth_headers, db):
        subject = Subject(name="Materia alheia", owner_email="outra-conta@example.com")
        db.add(subject)
        db.commit()
        db.refresh(subject)
        document = Document(name="Documento alheio", subject_id=subject.id)
        db.add(document)
        db.commit()
        db.refresh(document)
        job = AIGenerationJob(
            user_email="outra-conta@example.com",
            document_id=document.id,
            operation="summary",
            status="queued",
        )
        db.add(job)
        db.commit()

        response = client.get(f"/api/nlp/jobs/{job.id}", headers=auth_headers)

        assert response.status_code == 404


class TestAnalisarDocumentoRestante:
    _documento_do_usuario = TestAnalisarDocumento._documento_do_usuario

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
