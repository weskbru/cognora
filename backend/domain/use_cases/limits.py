"""
Regras de negócio do plano Freemium.

Plano Free:
  - até 2 matérias por usuário
  - 1 documento por matéria
  - 3 gerações por dia (global)
  - +1 geração de bônus ao fazer login no dia
"""
from datetime import date, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException

from infrastructure.database.models import UserProgress, Subject, Document

FREE_DAILY_LIMIT = 3
FREE_SUBJECT_LIMIT = 2
FREE_DOCS_PER_SUBJECT = 1


def _get_or_create_progress(email: str, db: Session) -> UserProgress:
    p = db.query(UserProgress).filter(UserProgress.user_email == email).first()
    if not p:
        p = UserProgress(user_email=email)
        db.add(p)
        db.commit()
        db.refresh(p)
    return p


def _ensure_daily_reset(p: UserProgress, db: Session) -> UserProgress:
    """Zera contador de gerações se for um novo dia."""
    today = date.today()
    if p.last_generation_date != today:
        p.daily_generations_used = 0
        p.last_generation_date = today
        db.commit()
        db.refresh(p)
    return p


def get_status(email: str, db: Session) -> dict:
    """Retorna o status atual de gerações do usuário."""
    p = _get_or_create_progress(email, db)
    p = _ensure_daily_reset(p, db)
    today = date.today()
    plan = p.plan or "free"
    base = FREE_DAILY_LIMIT if plan == "free" else 9999
    has_bonus = p.last_active_date == today
    effective_limit = base + (1 if has_bonus else 0)
    used = p.daily_generations_used or 0
    return {
        "used": used,
        "limit": effective_limit,
        "remaining": max(0, effective_limit - used),
        "can_generate": used < effective_limit,
        "plan": plan,
        "has_daily_bonus": has_bonus,
        "subject_limit": FREE_SUBJECT_LIMIT if plan == "free" else None,
        "docs_per_subject_limit": FREE_DOCS_PER_SUBJECT if plan == "free" else None,
    }


def check_and_consume(email: str, db: Session):
    """Verifica o limite de gerações e incrementa o contador. Lança 429 se atingido."""
    status = get_status(email, db)
    if not status["can_generate"]:
        raise HTTPException(
            status_code=429,
            detail={
                "code": "GENERATION_LIMIT_REACHED",
                "message": (
                    "Você atingiu o limite diário de gerações. "
                    "Faça login amanhã para renovar, ou atualize seu plano."
                ),
                "remaining": 0,
                "limit": status["limit"],
                "plan": status["plan"],
            },
        )
    p = _get_or_create_progress(email, db)
    p.daily_generations_used = (p.daily_generations_used or 0) + 1
    db.commit()


def apply_daily_bonus(email: str, db: Session) -> bool:
    """
    Registra login do dia — concede bônus de +1 geração se for novo dia.
    Retorna True se o bônus foi aplicado (primeiro login do dia).
    """
    p = _get_or_create_progress(email, db)
    today = date.today()
    last = p.last_active_date
    if last == today:
        return False  # já logou hoje
    # Atualiza streak
    if last and last == today - timedelta(days=1):
        p.streak_days = (p.streak_days or 0) + 1
    else:
        p.streak_days = 1
    p.last_active_date = today
    db.commit()
    return True


def check_subject_limit(email: str, db: Session):
    """Lança 403 se o usuário free já tiver atingido o limite de matérias."""
    p = _get_or_create_progress(email, db)
    if (p.plan or "free") == "free":
        count = db.query(Subject).filter(Subject.owner_email == email).count()
        if count >= FREE_SUBJECT_LIMIT:
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "SUBJECT_LIMIT_REACHED",
                    "message": f"Plano Free permite até {FREE_SUBJECT_LIMIT} matérias. Faça upgrade para criar mais.",
                    "limit": FREE_SUBJECT_LIMIT,
                },
            )


def check_document_limit(subject_id: str, email: str, db: Session):
    """Lança 403 se a matéria já tiver o número máximo de documentos (plano free)."""
    p = _get_or_create_progress(email, db)
    if (p.plan or "free") == "free":
        count = db.query(Document).filter(Document.subject_id == subject_id).count()
        if count >= FREE_DOCS_PER_SUBJECT:
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "DOCUMENT_LIMIT_REACHED",
                    "message": (
                        f"Plano Free permite {FREE_DOCS_PER_SUBJECT} documento por matéria. "
                        "Faça upgrade para adicionar mais."
                    ),
                    "limit": FREE_DOCS_PER_SUBJECT,
                },
            )
