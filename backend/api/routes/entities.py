from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, func, or_
from typing import Optional
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import uuid
import hmac
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


def _owned_entity_query(entity: str, db: Session, user_email: str):
    """Retorna uma consulta já limitada aos dados privados do usuário."""
    model = ENTITY_MAP[entity]
    query = db.query(model)
    owned_subject_ids = db.query(Subject.id).filter(Subject.owner_email == user_email)
    owned_document_ids = db.query(Document.id).filter(Document.subject_id.in_(owned_subject_ids))

    if entity == "subjects":
        return query.filter(Subject.owner_email == user_email)
    if entity == "documents":
        return query.filter(Document.subject_id.in_(owned_subject_ids))
    if entity in ("questions", "flashcards"):
        return query.filter(
            or_(
                model.owner_email == user_email,
                model.subject_id.in_(owned_subject_ids),
                model.document_id.in_(owned_document_ids),
            )
        )
    if entity == "summaries":
        return query.filter(Summary.document_id.in_(owned_document_ids))
    if entity in ("question_attempts", "study_sessions", "subject_progress"):
        return query.filter(model.user_email == user_email)
    if entity == "user_progress":
        return query.filter(UserProgress.user_email == user_email)
    return query


def _apply_query_options(query, model, filters: dict, sort: str | None, limit: int | None):
    for field, value in filters.items():
        if hasattr(model, field):
            query = query.filter(getattr(model, field) == value)
    if sort and hasattr(model, sort.lstrip("-")):
        column = getattr(model, sort.lstrip("-"))
        query = query.order_by(desc(column) if sort.startswith("-") else asc(column))
    if limit:
        query = query.limit(limit)
    return query


def _authorized_row(entity: str, item_id: str, db: Session, current_user: User):
    if entity not in ENTITY_MAP:
        _repo(entity, db)
    if is_admin_user(current_user) or entity == "competitions":
        return _repo(entity, db).get_by_id(item_id)
    if entity in ("user_progress", "study_sessions", "subject_progress"):
        row = _repo(entity, db).get_by_id(item_id)
        if row and row.user_email != current_user.email:
            raise HTTPException(status_code=403, detail="Acesso negado.")
        return row
    return _owned_entity_query(entity, db, current_user.email).filter(ENTITY_MAP[entity].id == item_id).first()


def _public_progress_dict(progress: UserProgress) -> dict:
    return {
        "id": str(progress.id),
        "user_email": progress.user_email,
        "xp": progress.xp or 0,
        "level": progress.level or 1,
        "streak_days": progress.streak_days or 0,
        "display_name": progress.display_name,
        "avatar_emoji": progress.avatar_emoji,
        "avatar_url": progress.avatar_url,
    }


def _validate_parent_ownership(entity: str, data: dict, db: Session, user_email: str) -> None:
    if entity not in ("documents", "questions", "summaries", "flashcards"):
        return
    subject_id = data.get("subject_id")
    document_id = data.get("document_id")
    if subject_id:
        subject_exists = db.query(Subject.id).filter(
            Subject.id == subject_id,
            Subject.owner_email == user_email,
        ).first()
        if not subject_exists:
            raise HTTPException(status_code=404, detail="Subject not found")
    if document_id:
        document_exists = (
            db.query(Document.id)
            .join(Subject, Subject.id == Document.subject_id)
            .filter(Document.id == document_id, Subject.owner_email == user_email)
            .first()
        )
        if not document_exists:
            raise HTTPException(status_code=404, detail="Document not found")


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
        filters["owner_email"] = current_user.email
    elif entity in ("question_attempts", "study_sessions", "subject_progress"):
        filters["user_email"] = current_user.email
    if entity == "user_progress":
        rows = repo.list(sort=sort, limit=limit, **filters)
        return [_public_progress_dict(row) for row in rows]
    if entity != "competitions":
        model = ENTITY_MAP[entity]
        query = _apply_query_options(
            _owned_entity_query(entity, db, current_user.email),
            model,
            filters,
            sort,
            limit,
        )
        return [row_to_dict(row) for row in query.all()]
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
    if not document_id:
        validated_subject_ids = set()
        for item in items:
            subject_id = item.get("subject_id")
            if subject_id and subject_id not in validated_subject_ids:
                _validate_parent_ownership(entity, item, db, current_user.email)
                validated_subject_ids.add(subject_id)

    model = ENTITY_MAP.get(entity)
    if not model:
        raise HTTPException(status_code=404, detail=f"Entity '{entity}' not found")
    valid = {c.name for c in model.__table__.columns} - {"id", "created_date", "created_at"}
    rows = [
        model(**{
            **{key: value for key, value in item.items() if key in valid},
            "owner_email": current_user.email,
        })
        for item in items
    ]
    db.add_all(rows)
    db.commit()
    return [row_to_dict(row) for row in rows]


@router.post("/competitions/{item_id}/join")
def join_competition(
    item_id: str,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    competition = db.query(Competition).filter(Competition.id == item_id).with_for_update().first()
    if not competition:
        raise HTTPException(status_code=404, detail="Not found")
    supplied_code = str(data.get("invite_code") or "").strip().upper()
    expected_code = str(competition.invite_code or "").strip().upper()
    if not expected_code or not hmac.compare_digest(supplied_code, expected_code):
        raise HTTPException(status_code=403, detail="Código de convite inválido.")
    if competition.status == "finished":
        raise HTTPException(status_code=409, detail="A competição já foi encerrada.")

    participants = list(competition.participants or [])
    if not any(item.get("email") == current_user.email for item in participants):
        participants.append({
            "email": current_user.email,
            "display_name": current_user.username or current_user.email.split("@")[0],
            "status": "joined",
            "score": 0,
            "correct": 0,
            "wrong": 0,
            "time_spent_seconds": 0,
        })
        competition.participants = participants
        db.commit()
    return row_to_dict(competition)


@router.get("/{entity}/{item_id}")
def get_entity(
    entity: str,
    item_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = _authorized_row(entity, item_id, db, current_user)
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
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
    _validate_parent_ownership(entity, data, db, current_user.email)
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
        data = {**data, "owner_email": current_user.email}
        document_id = data.get("document_id")
        if document_id:
            check_pdf_generation_limit(current_user.email, db, document_id=document_id, action=AIUsageType.QUESTIONS)
    elif entity == "flashcards":
        data = {**data, "owner_email": current_user.email}
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
    row = _authorized_row(entity, item_id, db, current_user)
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    if entity in ("subjects", "questions", "flashcards"):
        data.pop("owner_email", None)
    _validate_parent_ownership(entity, data, db, current_user.email)
    if entity in ("user_progress", "study_sessions", "subject_progress"):
        if entity == "user_progress":
            data = _strip_user_progress_protected_fields(data)
        elif entity == "study_sessions":
            should_update_subject_progress = row.status != "COMPLETED" and data.get("status") == "COMPLETED"
            data = _normalize_study_session_data(data, existing_session=row)
        elif entity == "subject_progress":
            data = _normalize_subject_progress_data(data)
    elif entity == "competitions":
        participants = row.participants or []
        is_member = any(item.get("email") == current_user.email for item in participants)
        if row.host_email != current_user.email and not is_member and not is_admin_user(current_user):
            raise HTTPException(status_code=403, detail="Entre na competição antes de alterá-la.")
        data.pop("host_email", None)
        data = _normalize_competition_data(data)
    row = _repo(entity, db).update(item_id, data, row=row)
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
    row = _authorized_row(entity, item_id, db, current_user)
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    if (
        entity == "competitions"
        and row.host_email != current_user.email
        and not is_admin_user(current_user)
    ):
        raise HTTPException(status_code=403, detail="Apenas o criador pode excluir a competição.")
    _repo(entity, db).delete(item_id, row=row)
