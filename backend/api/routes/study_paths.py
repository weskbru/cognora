import asyncio
import logging
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session, sessionmaker

from api.dependencies import get_current_user
from api.schemas.study_path import CreateStudyPathRequest, StudyPathResponse, UpdateStudyPathProgressRequest
from core.config.settings import settings
from domain.use_cases.limits import AIUsageReservation, AIUsageType, refund_ai_usage, reserve_ai_usage
from infrastructure.ai.study_path_adapter import StudyPathAdapter
from infrastructure.database.connection import get_db
from infrastructure.database.models import StudyPath, User
from infrastructure.observability import record_system_event

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/study-paths", tags=["study-paths"])
_generation_semaphore = asyncio.Semaphore(max(1, settings.ai_generation_max_concurrency))


def _get_adapter() -> StudyPathAdapter:
    try:
        return StudyPathAdapter()
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


def _response(path: StudyPath) -> StudyPathResponse:
    return StudyPathResponse(
        id=str(path.id),
        objective=path.objective,
        target_date=path.target_date,
        weeks_count=path.weeks_count,
        hours_per_week=path.hours_per_week,
        title=path.title,
        overview=path.overview,
        status=path.status,
        weeks=path.weeks or [],
        completed_milestones=path.completed_milestones or [],
        error_code=path.error_code,
        error_message=path.error_message,
        created_at=path.created_at,
        updated_at=path.updated_at,
        completed_at=path.completed_at,
    )


async def _process_study_path(path_id: str, adapter: StudyPathAdapter, factory: sessionmaker) -> None:
    async with _generation_semaphore:
        db = factory()
        path = db.query(StudyPath).filter(StudyPath.id == path_id).first()
        if not path:
            db.close()
            return

        path.status = "processing"
        path.updated_at = datetime.utcnow()
        db.commit()
        try:
            generated = await adapter.generate(
                objective=path.objective,
                target_date=path.target_date,
                weeks_count=path.weeks_count,
                hours_per_week=path.hours_per_week,
            )
            path.title = generated.title
            path.overview = generated.overview
            path.weeks = [week.model_dump() for week in generated.weeks]
            path.status = "completed"
            path.completed_at = datetime.utcnow()
            path.updated_at = datetime.utcnow()
            db.commit()
            record_system_event(
                db,
                level="info",
                event_type="study_path_generation_success",
                user_email=path.user_email,
                message="Trilha de estudos gerada com sucesso.",
                metadata={"study_path_id": path_id, "weeks_count": path.weeks_count},
            )
        except Exception:
            logger.exception("Falha ao gerar trilha de estudos: id=%s", path_id)
            path.status = "failed"
            path.error_code = "STUDY_PATH_GENERATION_FAILED"
            path.error_message = "Não foi possível gerar a trilha agora. Tente novamente em alguns minutos."
            path.updated_at = datetime.utcnow()
            db.commit()
            refund_ai_usage(
                AIUsageReservation(email=path.user_email, usage_type=AIUsageType.STUDY_PATH),
                db,
            )
            record_system_event(
                db,
                level="error",
                event_type="study_path_generation_failure",
                user_email=path.user_email,
                message="Falha ao gerar trilha de estudos.",
                metadata={"study_path_id": path_id},
            )
        finally:
            db.close()


@router.get("", response_model=list[StudyPathResponse])
def list_study_paths(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> list[StudyPathResponse]:
    paths = (
        db.query(StudyPath)
        .filter(StudyPath.user_email == current_user.email)
        .order_by(StudyPath.created_at.desc())
        .limit(50)
        .all()
    )
    return [_response(path) for path in paths]


@router.post("", response_model=StudyPathResponse, status_code=status.HTTP_202_ACCEPTED)
def create_study_path(
    body: CreateStudyPathRequest,
    background_tasks: BackgroundTasks,
    current_user: Annotated[User, Depends(get_current_user)],
    adapter: Annotated[StudyPathAdapter, Depends(_get_adapter)],
    db: Session = Depends(get_db),
) -> StudyPathResponse:
    active = db.query(StudyPath).filter(
        StudyPath.user_email == current_user.email,
        StudyPath.status.in_(("queued", "processing")),
    ).first()
    if active:
        raise HTTPException(
            status_code=409,
            detail={"code": "STUDY_PATH_ALREADY_PROCESSING", "message": "Já existe uma trilha sendo gerada."},
        )

    reservation = reserve_ai_usage(current_user.email, db, usage_type=AIUsageType.STUDY_PATH)
    try:
        path = StudyPath(
            user_email=current_user.email,
            objective=body.objective,
            target_date=body.target_date,
            weeks_count=body.weeks_count,
            hours_per_week=body.hours_per_week,
            status="queued",
        )
        db.add(path)
        db.commit()
        db.refresh(path)
    except Exception:
        db.rollback()
        refund_ai_usage(reservation, db)
        raise

    factory = sessionmaker(
        bind=db.get_bind(),
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
    )
    background_tasks.add_task(_process_study_path, str(path.id), adapter, factory)
    record_system_event(
        db,
        level="info",
        event_type="study_path_generation_queued",
        user_email=current_user.email,
        message="Trilha de estudos adicionada à fila.",
        metadata={"study_path_id": str(path.id), "weeks_count": path.weeks_count},
    )
    return _response(path)


@router.get("/{path_id}", response_model=StudyPathResponse)
def get_study_path(
    path_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> StudyPathResponse:
    path = db.query(StudyPath).filter(
        StudyPath.id == path_id,
        StudyPath.user_email == current_user.email,
    ).first()
    if not path:
        raise HTTPException(status_code=404, detail="Trilha de estudos não encontrada.")
    return _response(path)


@router.patch("/{path_id}/progress", response_model=StudyPathResponse)
def update_study_path_progress(
    path_id: str,
    body: UpdateStudyPathProgressRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> StudyPathResponse:
    path = db.query(StudyPath).filter(
        StudyPath.id == path_id,
        StudyPath.user_email == current_user.email,
    ).first()
    if not path:
        raise HTTPException(status_code=404, detail="Trilha de estudos não encontrada.")
    if path.status != "completed":
        raise HTTPException(status_code=409, detail="A trilha ainda não está pronta.")

    valid_ids = {
        f"{week.get('number')}:{index}"
        for week in (path.weeks or [])
        for index, _ in enumerate(week.get("milestones", []))
    }
    completed = list(dict.fromkeys(body.completed_milestones))
    if any(item not in valid_ids for item in completed):
        raise HTTPException(status_code=422, detail="A lista contém um marco inválido.")
    path.completed_milestones = completed
    path.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(path)
    return _response(path)


@router.delete("/{path_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_study_path(
    path_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> Response:
    path = db.query(StudyPath).filter(
        StudyPath.id == path_id,
        StudyPath.user_email == current_user.email,
    ).first()
    if not path:
        raise HTTPException(status_code=404, detail="Trilha de estudos não encontrada.")
    if path.status in {"queued", "processing"}:
        raise HTTPException(status_code=409, detail="Aguarde a geração terminar antes de excluir a trilha.")
    db.delete(path)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
