from infrastructure.database.models import Document, Question, Subject


def test_dashboard_exige_autenticacao(client):
    response = client.get("/api/dashboard")
    assert response.status_code == 401


def test_dashboard_retorna_snapshot_privado(client, db, test_user, auth_headers):
    own_subject = Subject(name="Minha materia", owner_email=test_user.email)
    other_subject = Subject(name="Materia alheia", owner_email="other@example.com")
    db.add_all([own_subject, other_subject])
    db.commit()
    db.add_all([
        Document(name="Meu PDF", subject_id=own_subject.id),
        Document(name="PDF alheio", subject_id=other_subject.id),
        Question(statement="Minha questao", owner_email=test_user.email, subject_id=own_subject.id),
        Question(statement="Questao alheia", owner_email="other@example.com", subject_id=other_subject.id),
    ])
    db.commit()

    response = client.get("/api/dashboard", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert [item["name"] for item in data["subjects"]] == ["Minha materia"]
    assert [item["name"] for item in data["documents"]] == ["Meu PDF"]
    assert [item["statement"] for item in data["questions"]] == ["Minha questao"]
    assert data["limits"]["plan"] == "free"
    assert response.headers["cache-control"] == "private, no-store"
