"""
Testes de integração — Rotas de entidades genéricas (CRUD).
Cobre: GET/POST/PUT/DELETE /api/{entity} e /api/{entity}/{id}
Entidades testadas: subjects, documents, questions, flashcards,
                   competitions, question_attempts, user_progress
"""
import uuid

import pytest


class TestSubjects:
    def test_criar_subject_retorna_201(self, client, auth_headers):
        response = client.post(
            "/api/subjects",
            json={"name": "Matemática"},
            headers=auth_headers,
        )
        assert response.status_code == 201

    def test_criar_subject_retorna_dados(self, client, auth_headers):
        response = client.post(
            "/api/subjects",
            json={"name": "Física", "description": "Mecânica clássica"},
            headers=auth_headers,
        )
        data = response.json()
        assert data["name"] == "Física"
        assert data["description"] == "Mecânica clássica"
        assert "id" in data

    def test_criar_subject_define_owner_email_do_usuario_logado(self, client, auth_headers, test_user):
        response = client.post(
            "/api/subjects",
            json={"name": "Química"},
            headers=auth_headers,
        )
        assert response.json()["owner_email"] == test_user.email

    def test_listar_subjects_sem_auth_retorna_401(self, client):
        response = client.get("/api/subjects")
        assert response.status_code == 401

    def test_listar_subjects_autenticado_retorna_lista(self, client, auth_headers):
        response = client.get("/api/subjects", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_listar_subjects_com_filtro_owner(self, client, auth_headers, test_user):
        client.post("/api/subjects", json={"name": "FiltroSub"}, headers=auth_headers)
        response = client.get(
            f"/api/subjects?owner_email={test_user.email}",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert all(s["owner_email"] == test_user.email for s in data)

    def test_buscar_subject_por_id(self, client, auth_headers):
        created = client.post(
            "/api/subjects", json={"name": "BuscaPorId"}, headers=auth_headers
        ).json()
        response = client.get(f"/api/subjects/{created['id']}", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["id"] == created["id"]

    def test_buscar_id_inexistente_retorna_404(self, client, auth_headers):
        response = client.get(f"/api/subjects/{uuid.uuid4()}", headers=auth_headers)
        assert response.status_code == 404

    def test_atualizar_subject(self, client, auth_headers):
        created = client.post(
            "/api/subjects", json={"name": "Antes"}, headers=auth_headers
        ).json()
        response = client.put(
            f"/api/subjects/{created['id']}",
            json={"name": "Depois"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Depois"

    def test_atualizar_id_inexistente_retorna_404(self, client, auth_headers):
        response = client.put(
            f"/api/subjects/{uuid.uuid4()}",
            json={"name": "Nada"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    def test_deletar_subject(self, client, auth_headers):
        created = client.post(
            "/api/subjects", json={"name": "Deletar"}, headers=auth_headers
        ).json()
        response = client.delete(f"/api/subjects/{created['id']}", headers=auth_headers)
        assert response.status_code == 204

    def test_deletar_subject_id_inexistente_retorna_404(self, client, auth_headers):
        response = client.delete(f"/api/subjects/{uuid.uuid4()}", headers=auth_headers)
        assert response.status_code == 404

    def test_subject_deletado_nao_encontrado_depois(self, client, auth_headers):
        created = client.post(
            "/api/subjects", json={"name": "ExDeletado"}, headers=auth_headers
        ).json()
        client.delete(f"/api/subjects/{created['id']}", headers=auth_headers)
        response = client.get(f"/api/subjects/{created['id']}", headers=auth_headers)
        assert response.status_code == 404


class TestDocuments:
    def _criar_subject(self, client, auth_headers):
        resp = client.post(
            "/api/subjects",
            json={"name": f"Sub_{uuid.uuid4().hex[:4]}"},
            headers=auth_headers,
        )
        return resp.json()["id"]

    def test_criar_documento(self, client, auth_headers):
        subject_id = self._criar_subject(client, auth_headers)
        response = client.post(
            "/api/documents",
            json={"name": "doc.pdf", "subject_id": subject_id},
            headers=auth_headers,
        )
        assert response.status_code == 201
        assert response.json()["name"] == "doc.pdf"

    def test_listar_documentos_por_subject(self, client, auth_headers):
        subject_id = self._criar_subject(client, auth_headers)
        client.post(
            "/api/documents",
            json={"name": "d1.pdf", "subject_id": subject_id},
            headers=auth_headers,
        )
        client.post(
            "/api/documents",
            json={"name": "d2.pdf", "subject_id": subject_id},
            headers=auth_headers,
        )
        response = client.get(
            f"/api/documents?subject_id={subject_id}",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2


class TestQuestions:
    def test_criar_questao(self, client, auth_headers):
        response = client.post(
            "/api/questions",
            json={
                "statement": "Qual é a capital do Brasil?",
                "type": "multiple_choice",
                "difficulty": "easy",
                "alternatives": [{"text": "Brasília", "correct": True}],
                "correct_answer": "Brasília",
                "explanation": "Brasília é a capital federal.",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        assert response.json()["statement"] == "Qual é a capital do Brasil?"

    def test_listar_questoes_retorna_lista(self, client, auth_headers):
        response = client.get("/api/questions", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestFlashcards:
    def test_criar_flashcard(self, client, auth_headers):
        response = client.post(
            "/api/flashcards",
            json={"front": "O que é DNA?", "back": "Ácido desoxirribonucleico."},
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["front"] == "O que é DNA?"
        assert data["back"] == "Ácido desoxirribonucleico."

    def test_deletar_flashcard(self, client, auth_headers):
        created = client.post(
            "/api/flashcards",
            json={"front": "F", "back": "B"},
            headers=auth_headers,
        ).json()
        response = client.delete(f"/api/flashcards/{created['id']}", headers=auth_headers)
        assert response.status_code == 204


class TestCompetitions:
    def test_criar_competition(self, client, auth_headers):
        response = client.post(
            "/api/competitions",
            json={
                "title": "Concurso Teste",
                "mode": "solo",
                "host_email": "host@test.com",
                "invite_code": uuid.uuid4().hex[:8],
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        assert response.json()["title"] == "Concurso Teste"


class TestQuestionAttempts:
    def test_registrar_tentativa(self, client, auth_headers):
        response = client.post(
            "/api/question_attempts",
            json={
                "question_id": str(uuid.uuid4()),
                "user_email": "user@test.com",
                "is_correct": True,
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        assert response.json()["is_correct"] is True

    def test_filtrar_tentativas_por_email(self, client, auth_headers):
        email = f"attempt_{uuid.uuid4().hex[:8]}@test.com"
        client.post(
            "/api/question_attempts",
            json={"question_id": str(uuid.uuid4()), "user_email": email, "is_correct": True},
            headers=auth_headers,
        )
        response = client.get(f"/api/question_attempts?user_email={email}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert all(a["user_email"] == email for a in data)


class TestEntidadeInvalida:
    def test_entidade_inexistente_retorna_404_no_list(self, client, auth_headers):
        response = client.get("/api/entidade_inexistente", headers=auth_headers)
        assert response.status_code == 404

    def test_entidade_inexistente_retorna_404_no_create(self, client, auth_headers):
        response = client.post("/api/entidade_inexistente", json={}, headers=auth_headers)
        assert response.status_code == 404

    def test_entidade_inexistente_retorna_404_no_get_by_id(self, client, auth_headers):
        response = client.get(f"/api/entidade_inexistente/{uuid.uuid4()}", headers=auth_headers)
        assert response.status_code == 404

    def test_entidade_inexistente_retorna_404_no_delete(self, client, auth_headers):
        response = client.delete(f"/api/entidade_inexistente/{uuid.uuid4()}", headers=auth_headers)
        assert response.status_code == 404


class TestListWithQueryParams:
    def test_limit_restringe_resultados(self, client, auth_headers):
        for i in range(3):
            client.post(
                "/api/flashcards",
                json={"front": f"F{i}", "back": f"B{i}"},
                headers=auth_headers,
            )
        response = client.get("/api/flashcards?limit=2", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()) <= 2
