"""
Testes de integração — Rota de upload de arquivos.
Cobre: POST /api/upload
"""
import io

import pytest
from fastapi.testclient import TestClient
from main import app


class TestUploadRoute:
    def _subject_id(self, client, auth_headers):
        response = client.post(
            "/api/subjects",
            json={"name": "Matéria Upload"},
            headers=auth_headers,
        )
        assert response.status_code == 201
        return response.json()["id"]

    def test_upload_pdf_retorna_200(self, client, auth_headers):
        subject_id = self._subject_id(client, auth_headers)
        response = client.post(
            "/api/upload",
            files={"file": ("test.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf")},
            data={"subject_id": subject_id},
            headers=auth_headers,
        )
        assert response.status_code == 200

    def test_upload_retorna_file_url(self, client, auth_headers):
        subject_id = self._subject_id(client, auth_headers)
        response = client.post(
            "/api/upload",
            files={"file": ("test.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf")},
            data={"subject_id": subject_id},
            headers=auth_headers,
        )
        data = response.json()
        assert "file_url" in data
        assert data["file_url"].startswith("http")

    def test_url_contem_diretorio_uploads(self, client, auth_headers):
        subject_id = self._subject_id(client, auth_headers)
        response = client.post(
            "/api/upload",
            files={"file": ("doc.pdf", io.BytesIO(b"content"), "application/pdf")},
            data={"subject_id": subject_id},
            headers=auth_headers,
        )
        assert "/uploads/" in response.json()["file_url"]

    def test_extensao_pdf_preservada_na_url(self, client, auth_headers):
        subject_id = self._subject_id(client, auth_headers)
        response = client.post(
            "/api/upload",
            files={"file": ("arquivo.pdf", io.BytesIO(b"content"), "application/pdf")},
            data={"subject_id": subject_id},
            headers=auth_headers,
        )
        assert response.json()["file_url"].endswith(".pdf")

    def test_extensao_png_preservada_na_url(self, client, auth_headers):
        response = client.post(
            "/api/upload",
            files={"file": ("imagem.png", io.BytesIO(b"fake png"), "image/png")},
            headers=auth_headers,
        )
        assert response.json()["file_url"].endswith(".png")

    def test_nomes_de_arquivo_sao_unicos(self, client, auth_headers):
        content = b"mesmo conteudo"
        subject_1 = self._subject_id(client, auth_headers)
        subject_2 = self._subject_id(client, auth_headers)
        r1 = client.post(
            "/api/upload",
            files={"file": ("same.pdf", io.BytesIO(content), "application/pdf")},
            data={"subject_id": subject_1},
            headers=auth_headers,
        )
        r2 = client.post(
            "/api/upload",
            files={"file": ("same.pdf", io.BytesIO(content), "application/pdf")},
            data={"subject_id": subject_2},
            headers=auth_headers,
        )
        assert r1.json()["file_url"] != r2.json()["file_url"]

    def test_upload_sem_autenticacao_retorna_401(self, client):
        response = client.post(
            "/api/upload",
            files={"file": ("test.pdf", io.BytesIO(b"content"), "application/pdf")},
        )
        assert response.status_code == 401

    def test_upload_com_token_invalido_retorna_401(self, client):
        response = client.post(
            "/api/upload",
            files={"file": ("test.pdf", io.BytesIO(b"content"), "application/pdf")},
            headers={"Authorization": "Bearer invalido"},
        )
        assert response.status_code == 401

    def test_upload_sem_arquivo_retorna_422(self, client, auth_headers):
        response = client.post("/api/upload", headers=auth_headers)
        assert response.status_code == 422

    def test_rejeita_extensao_nao_permitida(self, client, auth_headers):
        response = client.post(
            "/api/upload",
            files={"file": ("pagina.html", io.BytesIO(b"<script>alert(1)</script>"), "text/html")},
            headers=auth_headers,
        )

        assert response.status_code == 415
        assert response.json()["detail"]["code"] == "UNSUPPORTED_FILE_TYPE"

    def test_rejeita_mime_incompativel_com_extensao(self, client, auth_headers):
        response = client.post(
            "/api/upload",
            files={"file": ("avatar.png", io.BytesIO(b"not an image"), "text/plain")},
            headers=auth_headers,
        )

        assert response.status_code == 415

    def test_upload_arquivo_sem_extensao_usa_pdf_como_default(self, client, auth_headers):
        subject_id = self._subject_id(client, auth_headers)
        response = client.post(
            "/api/upload",
            files={"file": ("sem_extensao", io.BytesIO(b"content"), "application/octet-stream")},
            data={"subject_id": subject_id},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["file_url"].endswith(".pdf")

    def test_bloqueia_upload_acima_de_5mb_no_free(self, client, auth_headers):
        subject_id = self._subject_id(client, auth_headers)
        response = client.post(
            "/api/upload",
            files={"file": ("grande.pdf", io.BytesIO(b"x" * ((5 * 1024 * 1024) + 1)), "application/pdf")},
            data={"subject_id": subject_id},
            headers=auth_headers,
        )

        assert response.status_code == 413
        assert response.json()["detail"]["message"] == "Seu plano permite uploads de até 5 MB."

    def test_bloqueia_pdf_sem_materia_associada(self, client, auth_headers):
        response = client.post(
            "/api/upload",
            files={"file": ("sem_materia.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf")},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert response.json()["detail"]["message"] == "Selecione uma matéria para enviar o documento."

    def test_upload_preserva_cors_em_erro_inesperado(self, auth_headers, monkeypatch):
        origin = "https://cognora-pi.vercel.app"

        def raise_unexpected_error(*_args, **_kwargs):
            raise RuntimeError("falha simulada")

        monkeypatch.setattr(
            "domain.use_cases.limits.check_upload_size",
            raise_unexpected_error,
        )

        with TestClient(app, raise_server_exceptions=False) as client:
            response = client.post(
                "/api/upload",
                files={"file": ("test.pdf", io.BytesIO(b"content"), "application/pdf")},
                data={"subject_id": self._subject_id(client, auth_headers)},
                headers={**auth_headers, "Origin": origin},
            )

        assert response.status_code == 500
        assert response.headers["access-control-allow-origin"] == origin
