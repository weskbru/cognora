from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from typing import Optional
from infrastructure.database.connection import get_db
from infrastructure.database.models import Subject, Document, Question, Summary, Competition, UserProgress, Flashcard, QuestionAttempt
from infrastructure.repositories.base import BaseRepository, row_to_dict
from api.dependencies import get_current_user
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


def _repo(entity: str, db: Session) -> BaseRepository:
    model = ENTITY_MAP.get(entity)
    if not model:
        raise HTTPException(status_code=404, detail=f"Entity '{entity}' not found")
    return BaseRepository(model, db)


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
    elif entity in ("user_progress", "question_attempts"):
        filters.setdefault("user_email", current_user.email)
    elif entity in ("documents", "questions", "summaries", "flashcards") and "subject_id" not in filters:
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
    _: User = Depends(get_current_user),
):
    row = _repo(entity, db).get_by_id(item_id)
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
    # FASE DE TESTES: limites de plano desabilitados temporariamente
    # from domain.use_cases.limits import check_subject_limit, check_document_limit
    # if entity == "subjects":
    #     check_subject_limit(current_user.email, db)
    # elif entity == "documents" and "subject_id" in data:
    #     check_document_limit(data["subject_id"], current_user.email, db)
    if entity == "subjects":
        data = {**data, "owner_email": current_user.email}
    return row_to_dict(_repo(entity, db).create(data))


@router.put("/{entity}/{item_id}")
def update_entity(
    entity: str,
    item_id: str,
    data: dict,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    row = _repo(entity, db).update(item_id, data)
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    return row_to_dict(row)


@router.delete("/{entity}/{item_id}", status_code=204)
def delete_entity(
    entity: str,
    item_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if not _repo(entity, db).delete(item_id):
        raise HTTPException(status_code=404, detail="Not found")
