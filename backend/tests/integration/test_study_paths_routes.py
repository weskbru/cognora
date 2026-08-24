from datetime import date, timedelta

from infrastructure.ai.study_path_adapter import GeneratedStudyPath
from infrastructure.database.models import StudyPath, UserProgress
from main import app
from api.routes.study_paths import _get_adapter


class SuccessfulAdapter:
    async def generate(self, *, objective, target_date, weeks_count, hours_per_week):
        return GeneratedStudyPath.model_validate({
            "title": "Preparação para a Polícia Civil",
            "overview": "Plano progressivo com fundamentos, prática e revisão final.",
            "weeks": [
                {
                    "number": index,
                    "focus": f"Foco da semana {index}",
                    "topics": ["Tópico 1", "Tópico 2", "Tópico 3"],
                    "milestones": ["Resolver 20 questões", "Revisar os erros"],
                    "estimated_hours": hours_per_week,
                }
                for index in range(1, weeks_count + 1)
            ],
        })


class FailingAdapter:
    async def generate(self, **_kwargs):
        raise RuntimeError("provider unavailable")


def _payload() -> dict:
    return {
        "objective": "Passar no concurso da Polícia Civil",
        "target_date": (date.today() + timedelta(days=120)).isoformat(),
        "weeks_count": 4,
        "hours_per_week": 10,
    }


def test_cria_lista_e_atualiza_progresso_da_trilha(client, auth_headers):
    app.dependency_overrides[_get_adapter] = lambda: SuccessfulAdapter()
    try:
        created = client.post("/api/study-paths", json=_payload(), headers=auth_headers)
    finally:
        app.dependency_overrides.pop(_get_adapter, None)

    assert created.status_code == 202
    path_id = created.json()["id"]

    detail = client.get(f"/api/study-paths/{path_id}", headers=auth_headers)
    assert detail.status_code == 200
    assert detail.json()["status"] == "completed"
    assert len(detail.json()["weeks"]) == 4

    updated = client.patch(
        f"/api/study-paths/{path_id}/progress",
        json={"completed_milestones": ["1:0"]},
        headers=auth_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["completed_milestones"] == ["1:0"]

    listed = client.get("/api/study-paths", headers=auth_headers)
    assert listed.status_code == 200
    assert any(item["id"] == path_id for item in listed.json())


def test_usuario_nao_acessa_trilha_de_outra_conta(client, auth_headers, db):
    path = StudyPath(
        user_email="outra-conta@example.com",
        objective="Estudar para outro objetivo",
        weeks_count=2,
        hours_per_week=5,
        status="completed",
    )
    db.add(path)
    db.commit()

    response = client.get(f"/api/study-paths/{path.id}", headers=auth_headers)

    assert response.status_code == 404


def test_rejeita_data_alvo_no_passado(client, auth_headers):
    payload = _payload()
    payload["target_date"] = (date.today() - timedelta(days=1)).isoformat()

    response = client.post("/api/study-paths", json=payload, headers=auth_headers)

    assert response.status_code == 422


def test_falha_da_ia_marca_trilha_e_estorna_limite(client, auth_headers, db, test_user):
    app.dependency_overrides[_get_adapter] = lambda: FailingAdapter()
    try:
        response = client.post("/api/study-paths", json=_payload(), headers=auth_headers)
    finally:
        app.dependency_overrides.pop(_get_adapter, None)

    assert response.status_code == 202
    detail = client.get(f"/api/study-paths/{response.json()['id']}", headers=auth_headers)
    assert detail.json()["status"] == "failed"
    assert detail.json()["error_code"] == "STUDY_PATH_GENERATION_FAILED"

    db.expire_all()
    progress = db.query(UserProgress).filter(UserProgress.user_email == test_user.email).first()
    assert progress.study_paths_used_month == 0
