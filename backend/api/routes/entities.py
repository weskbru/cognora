from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, func, or_
from typing import Optional
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import uuid
from core.config.settings import settings
from infrastructure.database.connection import get_db
from infrastructure.database.models import Subject, Document, Question, Summary, Competition, UserProgress, Flashcard, QuestionAttempt, StudySession, SubjectProgress
from infrastructure.repositories.base import BaseRepository, row_to_dict
from api.dependencies import get_current_user, is_admin_user
from infrastructure.database.models import User

router = APIRouter(prefix="/api", tags=["entities"])

ENTITY_MAP = {
    "subjects": Subject,
    "documents": Document,
    "questions": Question,
    "summaries": Summary,
    "competitions": Competition,
    "user_progress": UserProgress,
    "flashcards": Flashcard,
    "question_attempts": QuestionAttempt,
    "study_sessions": StudySession,
    "subject_progress": SubjectProgress,
}

USER_PROGRESS_PROTECTED_FIELDS = {
    "plan",
    "subscription_status",
    "plan_started_at",
    "plan_expires_at",
    "stripe_customer_id",
    "stripe_subscription_id",
}

STUDY_SESSION_ALLOWED_STATUSES = {"IN_PROGRESS", "COMPLETED", "ABANDONED"}
COMPETITION_ALLOWED_MODES = {"duel", "time_attack", "weekly_league"}
COMPETITION_ALLOWED_STATUSES = {"waiting", "active", "finished"}
COMPETITION_LIST_FIELDS = {"participants", "questions_data", "question_ids"}
STUDY_SESSION_PROTECTED_FIELDS = {
    "user_email",
    "xp_awarded",
    "started_at",
    "completed_at",
    "created_at",
    "updated_at",
}

SUBJECT_PROGRESS_PROTECTED_FIELDS = {
    "user_email",
    "created_at",
    "updated_at",
}

SESSION_XP_PER_QUESTION = 10
PRODUCT_TIMEZONE = ZoneInfo("America/Sao_Paulo")


def _strip_user_progress_protected_fields(data: dict) -> dict:
    return {key: value for key, value in data.items() if key not in USER_PROGRESS_PROTECTED_FIELDS}


def _unique_values(values) -> list:
    if not isinstance(values, list):
        return []
    seen = set()
    unique = []
    for value in values:
        key = str(value)
        if key in seen:
            continue
        seen.add(key)
        unique.append(value)
    return unique


def _normalize_study_session_data(
    data: dict,
    *,
    user_email: str | None = None,
    existing_session: StudySession | None = None,
) -> dict:
    if existing_session and existing_session.status == "COMPLETED":
        raise HTTPException(status_code=409, detail="Sessão concluída não pode ser alterada.")

    normalized = {key: value for key, value in data.items() if key not in STUDY_SESSION_PROTECTED_FIELDS}
    if user_email:
        normalized["user_email"] = user_email
    status = normalized.get("status")
    if status is not None and status not in STUDY_SESSION_ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail="Status de sessão inválido.")
    if "questions_answered" in normalized:
        normalized["questions_answered"] = _unique_values(normalized["questions_answered"])
    if status == "COMPLETED":
        normalized["completed_at"] = datetime.utcnow()
    return normalized


def _normalize_subject_progress_data(data: dict, *, user_email: str | None = None) -> dict:
    normalized = {key: value for key, value in data.items() if key not in SUBJECT_PROGRESS_PROTECTED_FIELDS}
    if user_email:
        normalized["user_email"] = user_email
    return normalized


def _normalize_competition_data(data: dict) -> dict:
    normalized = dict(data)
    if "mode" in normalized and normalized["mode"] not in COMPETITION_ALLOWED_MODES:
        raise HTTPException(status_code=400, detail="Modo de competição inválido.")
    if "status" in normalized and normalized["status"] not in COMPETITION_ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail="Status de competição inválido.")
    for field in COMPETITION_LIST_FIELDS:
        if field in normalized and not isinstance(normalized[field], list):
            raise HTTPException(status_code=400, detail=f"O campo '{field}' deve ser uma lista.")
    if "question_count" in normalized:
        try:
            normalized["question_count"] = int(normalized["question_count"])
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Quantidade de questões inválida.")
        if not 1 <= normalized["question_count"] <= 100:
            raise HTTPException(status_code=400, detail="A quantidade de questões deve ficar entre 1 e 100.")
    if isinstance(normalized.get("finished_at"), str):
        try:
            normalized["finished_at"] = datetime.fromisoformat(normalized["finished_at"])
        except ValueError:
            raise HTTPException(status_code=400, detail="Data de encerramento inválida.")
    for field in ("week_start", "week_end"):
        if isinstance(normalized.get(field), str):
            try:
                normalized[field] = datetime.fromisoformat(normalized[field]).date()
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Data inválida no campo '{field}'.")
    return normalized


def _review_interval_for_stage(stage: int) -> timedelta:
    if stage <= 1:
        return timedelta(days=1)
    if stage == 2:
        return timedelta(days=7)
    if stage == 3:
        return timedelta(days=21)
    return timedelta(days=30)


def _subject_ids_from_session(session: StudySession) -> list[uuid.UUID]:
    subject_ids = []
    seen = set()
    for subject in session.subjects or []:
        if isinstance(subject, dict):
            subject_id = subject.get("id")
        else:
            subject_id = subject
        if not subject_id:
            continue
        try:
            normalized_id = uuid.UUID(str(subject_id))
        except (ValueError, TypeError):
            continue
        if normalized_id in seen:
            continue
        seen.add(normalized_id)
        subject_ids.append(normalized_id)
    return subject_ids


def _update_subject_progress_for_completed_session(db: Session, session: StudySession) -> None:
    completed_at = session.completed_at or datetime.utcnow()
    for subject_id in _subject_ids_from_session(session):
        progress = db.query(SubjectProgress).filter(
            SubjectProgress.user_email == session.user_email,
            SubjectProgress.subject_id == subject_id,
        ).first()

        if progress:
            next_stage = min((progress.review_stage or 1) + 1, 4)
            progress.review_stage = next_stage
            progress.completed_reviews_count = (progress.completed_reviews_count or 0) + 1
        else:
            next_stage = 1
            progress = SubjectProgress(
                user_email=session.user_email,
                subject_id=subject_id,
                review_stage=next_stage,
                completed_reviews_count=0,
            )
            db.add(progress)

        progress.last_studied_at = completed_at
        progress.next_review_at = completed_at + _review_interval_for_stage(next_stage)
        progress.updated_at = datetime.utcnow()

    db.commit()


def _local_product_date():
    return datetime.now(PRODUCT_TIMEZONE).date()


def _get_or_create_user_progress(db: Session, user_email: str) -> UserProgress:
    progress = db.query(UserProgress).filter(UserProgress.user_email == user_email).first()
    if progress:
        return progress
    progress = UserProgress(user_email=user_email)
    db.add(progress)
    db.flush()
    return progress


def _level_for_xp(xp: int) -> int:
    levels = [
        (10000, 10),
        (6000, 9),
        (4000, 8),
        (2500, 7),
        (1500, 6),
        (900, 5),
        (500, 4),
        (250, 3),
        (100, 2),
        (0, 1),
    ]
    for minimum, level in levels:
        if xp >= minimum:
            return level
    return 1


def _update_user_progress_for_completed_session(db: Session, session: StudySession) -> None:
    if (session.xp_awarded or 0) > 0:
        return

    answered_ids = _unique_values(session.questions_answered or [])
    xp_awarded = len(answered_ids) * SESSION_XP_PER_QUESTION
    if xp_awarded <= 0:
        return

    today = _local_product_date()
    yesterday = today - timedelta(days=1)
    progress = _get_or_create_user_progress(db, session.user_email)

    progress.xp = (progress.xp or 0) + xp_awarded
    progress.level = _level_for_xp(progress.xp or 0)
    progress.total_questions_answered = (progress.total_questions_answered or 0) + len(answered_ids)

    if progress.last_active_date == today:
        pass
    elif progress.last_active_date == yesterday:
        progress.streak_days = (progress.streak_days or 0) + 1
        progress.last_active_date = today
    else:
        progress.streak_days = 1
        progress.last_active_date = today

    progress.xp_history = [
        *(progress.xp_history or []),
        {
            "amount": xp_awarded,
            "reason": "Sessao de estudo concluida",
            "date": today.isoformat(),
            "study_session_id": str(session.id),
        },
    ][-50:]
    session.xp_awarded = xp_awarded
    db.commit()


def _repo(entity: str, db: Session) -> BaseRepository:
    model = ENTITY_MAP.get(entity)
    if not model:
        raise HTTPException(status_code=404, detail=f"Entity '{entity}' not found")
    return BaseRepository(model, db)


@router.get("/leaderboard/public")
def public_leaderboard(
    limit: int = Query(2, ge=1, le=10),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(UserProgress, User.username)
        .outerjoin(User, User.email == UserProgress.user_email)
        .filter(or_(User.role.is_(None), User.role != "admin"))
        .filter(func.lower(UserProgress.user_email).notin_(settings.admin_emails or [""]))
        .order_by(desc(UserProgress.xp))
        .limit(limit)
        .all()
    )
    return [
        {
            "display_name": progress.display_name or username or "Estudante",
            "xp": progress.xp or 0,
        }
        for progress, username in rows
    ]


@router.get("/{entity}")
def list_entities(
    entity: str,
    sort: Optional[str] = Query(None),
    limit: Optional[int] = Query(None),
    id: Optional[str] = Query(None),
    subject_id: Optional[str] = Query(None),
    document_id: Optional[str] = Query(None),
    user_email: Optional[str] = Query(None),
    owner_email: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    host_email: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    invite_code: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = _repo(entity, db)
    filters = {k: v for k, v in {
        "id": id, "subject_id": subject_id, "document_id": document_id,
        "user_email": user_email, "owner_email": owner_email,
        "status": status, "host_email": host_email,
        "difficulty": difficulty, "type": type, "invite_code": invite_code,
    }.items() if v is not None}
    if entity == "subjects":
        filters.setdefault("owner_email", current_user.email)
    elif entity == "question_attempts":
        filters.setdefault("user_email", current_user.email)
    elif entity == "study_sessions":
        filters["user_email"] = current_user.email
    elif entity == "subject_progress":
        filters["user_email"] = current_user.email
    elif entity == "summaries" and "document_id" not in filters:
        user_subject_ids = [
            str(s.id)
            for s in db.query(Subject).filter(Subject.owner_email == current_user.email).all()
        ]
        if not user_subject_ids:
            return []
        user_doc_ids = [
            str(d.id)
            for d in db.query(Document).filter(Document.subject_id.in_(user_subject_ids)).all()
        ]
        if not user_doc_ids:
            return []
        query = db.query(Summary).filter(Summary.document_id.in_(user_doc_ids))
        for field, value in filters.items():
            if hasattr(Summary, field):
                query = query.filter(getattr(Summary, field) == value)
        if sort and hasattr(Summary, sort.lstrip("-")):
            col = getattr(Summary, sort.lstrip("-"))
            query = query.order_by(desc(col) if sort.startswith("-") else asc(col))
        if limit:
            query = query.limit(limit)
        return [row_to_dict(r) for r in query.all()]
    elif entity in ("documents", "questions", "flashcards") and "subject_id" not in filters:
        user_subject_ids = [
            str(s.id)
            for s in db.query(Subject).filter(Subject.owner_email == current_user.email).all()
        ]
        if not user_subject_ids:
            return []
        model = ENTITY_MAP[entity]
        query = db.query(model).filter(model.subject_id.in_(user_subject_ids))
        for field, value in filters.items():
            if hasattr(model, field):
                query = query.filter(getattr(model, field) == value)
        if sort and hasattr(model, sort.lstrip("-")):
            col = getattr(model, sort.lstrip("-"))
            query = query.order_by(desc(col) if sort.startswith("-") else asc(col))
        if limit:
            query = query.limit(limit)
        return [row_to_dict(r) for r in query.all()]
    return [row_to_dict(r) for r in repo.list(sort=sort, limit=limit, **filters)]


@router.post("/{entity}/bulk", status_code=201)
def bulk_create_entities(
    entity: str,
    items: list[dict],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from domain.use_cases.limits import AIUsageType, check_pdf_generation_limit

    if entity not in ("questions", "flashcards"):
        raise HTTPException(status_code=400, detail="Criação em lote não suportada para esta entidade.")
    if not items:
        raise HTTPException(status_code=400, detail="Nenhum item informado.")

    document_id = items[0].get("document_id")
    if document_id:
        action = AIUsageType.QUESTIONS if entity == "questions" else AIUsageType.FLASHCARDS
        check_pdf_generation_limit(current_user.email, db, document_id=document_id, action=action)
    if any(item.get("document_id") != document_id for item in items):
        raise HTTPException(status_code=400, detail="Todos os itens do lote devem pertencer ao mesmo documento.")

    model = ENTITY_MAP.get(entity)
    if not model:
        raise HTTPException(status_code=404, detail=f"Entity '{entity}' not found")
    valid = {c.name for c in model.__table__.columns} - {"id", "created_date", "created_at"}
    rows = [model(**{key: value for key, value in item.items() if key in valid}) for item in items]
    db.add_all(rows)
    db.commit()
    for row in rows:
        db.refresh(row)
    return [row_to_dict(row) for row in rows]


@router.get("/{entity}/{item_id}")
def get_entity(
    entity: str,
    item_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = _repo(entity, db).get_by_id(item_id)
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    if entity == "user_progress" and row.user_email != current_user.email and not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Acesso negado.")
    if entity == "study_sessions" and row.user_email != current_user.email and not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Acesso negado.")
    if entity == "subject_progress" and row.user_email != current_user.email and not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Acesso negado.")
    return row_to_dict(row)


@router.post("/{entity}", status_code=201)
def create_entity(
    entity: str,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from domain.use_cases.limits import (
        AIUsageType,
        check_competition_limit,
        check_document_limit,
        check_pdf_generation_limit,
        check_subject_limit,
    )
    if entity == "subjects":
        check_subject_limit(current_user.email, db)
        data = {**data, "owner_email": current_user.email}
    elif entity == "documents":
        subject_id = data.get("subject_id")
        if not subject_id:
            raise HTTPException(status_code=400, detail="Selecione uma matéria para enviar o documento.")
        subject = db.query(Subject).filter(
            Subject.id == subject_id,
            Subject.owner_email == current_user.email,
        ).first()
        if not subject:
            raise HTTPException(status_code=404, detail="Matéria não encontrada.")
        check_document_limit(subject_id, current_user.email, db)
    elif entity == "competitions":
        check_competition_limit(current_user.email, db)
        data = {**_normalize_competition_data(data), "host_email": current_user.email}
    elif entity == "summaries":
        document_id = data.get("document_id")
        if not document_id:
            raise HTTPException(status_code=400, detail="Informe o documento do resumo.")
        check_pdf_generation_limit(current_user.email, db, document_id=document_id, action=AIUsageType.SUMMARY)
    elif entity == "questions":
        document_id = data.get("document_id")
        if document_id:
            check_pdf_generation_limit(current_user.email, db, document_id=document_id, action=AIUsageType.QUESTIONS)
    elif entity == "flashcards":
        document_id = data.get("document_id")
        if document_id:
            check_pdf_generation_limit(current_user.email, db, document_id=document_id, action=AIUsageType.FLASHCARDS)
    elif entity == "user_progress":
        data = _strip_user_progress_protected_fields(data)
        data = {**data, "user_email": current_user.email}
    elif entity == "study_sessions":
        data = _normalize_study_session_data(data, user_email=current_user.email)
    elif entity == "subject_progress":
        data = _normalize_subject_progress_data(data, user_email=current_user.email)
    return row_to_dict(_repo(entity, db).create(data))


@router.put("/{entity}/{item_id}")
def update_entity(
    entity: str,
    item_id: str,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    should_update_subject_progress = False
    if entity in ("user_progress", "study_sessions", "subject_progress"):
        row = _repo(entity, db).get_by_id(item_id)
        if not row:
            raise HTTPException(status_code=404, detail="Not found")
        if row.user_email != current_user.email and not is_admin_user(current_user):
            raise HTTPException(status_code=403, detail="Acesso negado.")
        if entity == "user_progress":
            data = _strip_user_progress_protected_fields(data)
        elif entity == "study_sessions":
            should_update_subject_progress = row.status != "COMPLETED" and data.get("status") == "COMPLETED"
            data = _normalize_study_session_data(data, existing_session=row)
        elif entity == "subject_progress":
            data = _normalize_subject_progress_data(data)
    elif entity == "competitions":
        data.pop("host_email", None)
        data = _normalize_competition_data(data)
    row = _repo(entity, db).update(item_id, data)
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    if entity == "study_sessions" and should_update_subject_progress:
        _update_subject_progress_for_completed_session(db, row)
        _update_user_progress_for_completed_session(db, row)
        db.refresh(row)
    return row_to_dict(row)


@router.delete("/{entity}/{item_id}", status_code=204)
def delete_entity(
    entity: str,
    item_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if entity in ("user_progress", "study_sessions", "subject_progress"):
        row = _repo(entity, db).get_by_id(item_id)
        if not row:
            raise HTTPException(status_code=404, detail="Not found")
        if row.user_email != current_user.email and not is_admin_user(current_user):
            raise HTTPException(status_code=403, detail="Acesso negado.")
    if not _repo(entity, db).delete(item_id):
        raise HTTPException(status_code=404, detail="Not found")
