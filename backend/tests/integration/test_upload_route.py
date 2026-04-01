"""
Testes de integração — Rota de upload de arquivos.
Cobre: POST /api/upload
"""
import io

import pytest


class TestUploadRoute:
    def test_upload_pdf_retorna_200(self, client, auth_headers):
        response = client.post(
            "/api/upload",
            files={"file": ("test.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf")},
            headers=auth_headers,
        )
        assert response.status_code == 200

    def test_upload_retorna_file_url(self, client, auth_headers):
        response = client.post(
            "/api/upload",
            files={"file": ("test.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf")},
            headers=auth_headers,
        )
        data = response.json()
        assert "file_url" in data
        assert data["file_url"].startswith("http")

    def test_url_contem_diretorio_uploads(self, client, auth_headers):
        response = client.post(
            "/api/upload",
            files={"file": ("doc.pdf", io.BytesIO(b"content"), "application/pdf")},
            headers=auth_headers,
        )
        assert "/uploads/" in response.json()["file_url"]

    def test_extensao_pdf_preservada_na_url(self, client, auth_headers):
        response = client.post(
            "/api/upload",
            files={"file": ("arquivo.pdf", io.BytesIO(b"content"), "application/pdf")},
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
        r1 = client.post(
            "/api/upload",
            files={"file": ("same.pdf", io.BytesIO(content), "application/pdf")},
            headers=auth_headers,
        )
        r2 = client.post(
            "/api/upload",
            files={"file": ("same.pdf", io.BytesIO(content), "application/pdf")},
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

    def test_upload_arquivo_sem_extensao_usa_pdf_como_default(self, client, auth_headers):
        response = client.post(
            "/api/upload",
            files={"file": ("sem_extensao", io.BytesIO(b"content"), "application/octet-stream")},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["file_url"].endswith(".pdf")
