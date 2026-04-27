"""
Regras de negócio dos planos Free / Pro / Ilimitado.

Free:      3 gerações/dia, 2 matérias, 1 doc/matéria, 5 MB upload, 1 competição ativa
Pro:       20 gerações/dia, ilimitado em tudo, 25 MB upload
Ilimitado: tudo ilimitado, 50 MB upload
"""
from datetime import date, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException

from infrastructure.database.models import UserProgress, Subject, Document, Competition

PLAN_LIMITS = {
    "free":      {"daily": 3,    "subjects": 2,    "docs_per_subject": 1,  "upload_mb": 5,  "competitions": 1},
    "pro":       {"daily": 20,   "subjects": None,  "docs_per_subject": None, "upload_mb": 25, "competitions": None},
    "unlimited": {"daily": None, "subjects": None,  "docs_per_subject": None, "upload_mb": 50, "competitions": None},
}


def _get_or_create_progress(email: str, db: Session) -> UserProgress:
    p = db.query(UserProgress).filter(UserProgress.user_email == email).first()
    if not p:
        p = UserProgress(user_email=email)
        db.add(p)
        db.commit()
        db.refresh(p)
    return p


def _ensure_daily_reset(p: UserProgress, db: Session) -> UserProgress:
    today = date.today()
    if p.last_generation_date != today:
        p.daily_generations_used = 0
        p.last_generation_date = today
        db.commit()
        db.refresh(p)
    return p


def get_status(email: str, db: Session) -> dict:
    p = _get_or_create_progress(email, db)
    p = _ensure_daily_reset(p, db)
    today = date.today()
    plan = p.plan or "free"
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])
    daily_limit = limits["daily"]  # None = ilimitado
    has_bonus = p.last_active_date == today
    used = p.daily_generations_used or 0

    if daily_limit is None:
        effective_limit = 9999
        remaining = 9999
        can_generate = True
    else:
        effective_limit = daily_limit + (1 if has_bonus else 0)
        remaining = max(0, effective_limit - used)
        can_generate = used < effective_limit

    return {
        "used": used,
        "limit": effective_limit,
        "remaining": remaining,
        "can_generate": can_generate,
        "plan": plan,
        "has_daily_bonus": has_bonus,
        "subject_limit": limits["subjects"],
        "docs_per_subject_limit": limits["docs_per_subject"],
    }


def check_and_consume(email: str, db: Session):
    status = get_status(email, db)
    if not status["can_generate"]:
        raise HTTPException(
            status_code=429,
            detail={
                "code": "GENERATION_LIMIT_REACHED",
                "message": "Você atingiu o limite diário de gerações. Faça upgrade para continuar.",
                "remaining": 0,
                "limit": status["limit"],
                "plan": status["plan"],
            },
        )
    p = _get_or_create_progress(email, db)
    p.daily_generations_used = (p.daily_generations_used or 0) + 1
    db.commit()


def apply_daily_bonus(email: str, db: Session) -> bool:
    p = _get_or_create_progress(email, db)
    today = date.today()
    last = p.last_active_date
    if last == today:
        return False
    if last and last == today - timedelta(days=1):
        p.streak_days = (p.streak_days or 0) + 1
    else:
        p.streak_days = 1
    p.last_active_date = today
    db.commit()
    return True


def check_subject_limit(email: str, db: Session):
    p = _get_or_create_progress(email, db)
    plan = p.plan or "free"
    limit = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])["subjects"]
    if limit is not None:
        count = db.query(Subject).filter(Subject.owner_email == email).count()
        if count >= limit:
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "SUBJECT_LIMIT_REACHED",
                    "message": f"Seu plano permite até {limit} matérias. Faça upgrade para criar mais.",
                    "limit": limit,
                },
            )


def check_document_limit(subject_id: str, email: str, db: Session):
    p = _get_or_create_progress(email, db)
    plan = p.plan or "free"
    limit = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])["docs_per_subject"]
    if limit is not None:
        count = db.query(Document).filter(Document.subject_id == subject_id).count()
        if count >= limit:
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "DOCUMENT_LIMIT_REACHED",
                    "message": f"Seu plano permite {limit} documento por matéria. Faça upgrade para adicionar mais.",
                    "limit": limit,
                },
            )


def check_upload_size(email: str, file_size_bytes: int, db: Session):
    p = _get_or_create_progress(email, db)
    plan = p.plan or "free"
    limit_mb = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])["upload_mb"]
    limit_bytes = limit_mb * 1024 * 1024
    if file_size_bytes > limit_bytes:
        raise HTTPException(
            status_code=413,
            detail={
                "code": "FILE_TOO_LARGE",
                "message": f"Arquivo muito grande. Seu plano permite até {limit_mb} MB por arquivo. Faça upgrade para enviar arquivos maiores.",
                "limit_mb": limit_mb,
            },
        )


def check_competition_limit(email: str, db: Session):
    p = _get_or_create_progress(email, db)
    plan = p.plan or "free"
    limit = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])["competitions"]
    if limit is not None:
        count = db.query(Competition).filter(
            Competition.host_email == email,
            Competition.status != "finished",
        ).count()
        if count >= limit:
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "COMPETITION_LIMIT_REACHED",
                    "message": f"Seu plano permite {limit} competição ativa por vez. Finalize a atual ou faça upgrade.",
                    "limit": limit,
                },
            )
