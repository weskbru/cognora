from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, func, or_
from typing import Optional
from core.config.settings import settings
from infrastructure.database.connection import get_db
from infrastructure.database.models import Subject, Document, Question, Summary, Competition, UserProgress, Flashcard, QuestionAttempt
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
}

USER_PROGRESS_PROTECTED_FIELDS = {
    "plan",
    "subscription_status",
    "plan_started_at",
    "plan_expires_at",
    "stripe_customer_id",
    "stripe_subscription_id",
}


def _strip_user_progress_protected_fields(data: dict) -> dict:
    return {key: value for key, value in data.items() if key not in USER_PROGRESS_PROTECTED_FIELDS}


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
    return row_to_dict(row)


@router.post("/{entity}", status_code=201)
def create_entity(
    entity: str,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from domain.use_cases.limits import check_subject_limit, check_document_limit, check_competition_limit
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
    elif entity == "user_progress":
        data = _strip_user_progress_protected_fields(data)
        data = {**data, "user_email": current_user.email}
    return row_to_dict(_repo(entity, db).create(data))


@router.put("/{entity}/{item_id}")
def update_entity(
    entity: str,
    item_id: str,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if entity == "user_progress":
        row = _repo(entity, db).get_by_id(item_id)
        if not row:
            raise HTTPException(status_code=404, detail="Not found")
        if row.user_email != current_user.email and not is_admin_user(current_user):
            raise HTTPException(status_code=403, detail="Acesso negado.")
        data = _strip_user_progress_protected_fields(data)
    row = _repo(entity, db).update(item_id, data)
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    return row_to_dict(row)


@router.delete("/{entity}/{item_id}", status_code=204)
def delete_entity(
    entity: str,
    item_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if entity == "user_progress":
        row = _repo(entity, db).get_by_id(item_id)
        if not row:
            raise HTTPException(status_code=404, detail="Not found")
        if row.user_email != current_user.email and not is_admin_user(current_user):
            raise HTTPException(status_code=403, detail="Acesso negado.")
    if not _repo(entity, db).delete(item_id):
        raise HTTPException(status_code=404, detail="Not found")
