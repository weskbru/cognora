"""Regras centralizadas de planos e limites do Cognora."""
from __future__ import annotations

import logging
from dataclasses import asdict, dataclass
from datetime import date, datetime
from enum import Enum

from fastapi import HTTPException
from sqlalchemy.orm import Session

from infrastructure.database.models import Competition, Document, Flashcard, Question, Subject, Summary, UserProgress

logger = logging.getLogger(__name__)


class PlanType(str, Enum):
    FREE = "free"
    PRO = "pro"
    PREMIUM = "premium"


class AIUsageType(str, Enum):
    SUMMARY = "summary"
    QUESTIONS = "questions"
    FLASHCARDS = "flashcards"
    STUDY_PATH = "study_path"


AIAction = AIUsageType

USAGE_COUNTER_FIELDS: dict[AIUsageType, str] = {
    AIUsageType.SUMMARY: "summaries_used_month",
    AIUsageType.QUESTIONS: "questions_used_month",
    AIUsageType.FLASHCARDS: "flashcards_used_month",
    AIUsageType.STUDY_PATH: "study_paths_used_month",
}


@dataclass(frozen=True)
class PlanLimits:
    maxSubjects: int
    maxPdfsPerSubject: int
    maxTotalPdfs: int
    maxUploadSizeMb: int
    maxMonthlySummaries: int
    maxMonthlyQuestions: int
    maxMonthlyFlashcards: int
    maxMonthlyStudyPaths: int
    maxActiveCompetitions: int


PLAN_LIMITS: dict[PlanType, PlanLimits] = {
    PlanType.FREE: PlanLimits(
        maxSubjects=3,
        maxPdfsPerSubject=1,
        maxTotalPdfs=3,
        maxUploadSizeMb=5,
        maxMonthlySummaries=5,
        maxMonthlyQuestions=5,
        maxMonthlyFlashcards=5,
        maxMonthlyStudyPaths=2,
        maxActiveCompetitions=1,
    ),
    PlanType.PRO: PlanLimits(
        maxSubjects=10,
        maxPdfsPerSubject=2,
        maxTotalPdfs=20,
        maxUploadSizeMb=25,
        maxMonthlySummaries=30,
        maxMonthlyQuestions=30,
        maxMonthlyFlashcards=30,
        maxMonthlyStudyPaths=10,
        maxActiveCompetitions=5,
    ),
    PlanType.PREMIUM: PlanLimits(
        maxSubjects=30,
        maxPdfsPerSubject=5,
        maxTotalPdfs=100,
        maxUploadSizeMb=50,
        maxMonthlySummaries=100,
        maxMonthlyQuestions=100,
        maxMonthlyFlashcards=100,
        maxMonthlyStudyPaths=30,
        maxActiveCompetitions=20,
    ),
}

LEGACY_PLAN_ALIASES = {"unlimited": PlanType.PREMIUM}

FREE_SUBJECT_LIMIT = PLAN_LIMITS[PlanType.FREE].maxSubjects
FREE_DOCS_PER_SUBJECT = PLAN_LIMITS[PlanType.FREE].maxPdfsPerSubject
FREE_TOTAL_DOCS = PLAN_LIMITS[PlanType.FREE].maxTotalPdfs
FREE_UPLOAD_MB = PLAN_LIMITS[PlanType.FREE].maxUploadSizeMb
FREE_ACTIVE_COMPETITIONS = PLAN_LIMITS[PlanType.FREE].maxActiveCompetitions
FREE_MONTHLY_SUMMARIES = PLAN_LIMITS[PlanType.FREE].maxMonthlySummaries
FREE_MONTHLY_QUESTIONS = PLAN_LIMITS[PlanType.FREE].maxMonthlyQuestions
FREE_MONTHLY_FLASHCARDS = PLAN_LIMITS[PlanType.FREE].maxMonthlyFlashcards
FREE_MONTHLY_STUDY_PATHS = PLAN_LIMITS[PlanType.FREE].maxMonthlyStudyPaths

# Compatibilidade com testes/telas antigas que ainda importam esse nome.
FREE_DAILY_LIMIT = FREE_MONTHLY_SUMMARIES
FREE_MONTHLY_AI_CREDITS = (
    FREE_MONTHLY_SUMMARIES + FREE_MONTHLY_QUESTIONS + FREE_MONTHLY_FLASHCARDS + FREE_MONTHLY_STUDY_PATHS
)


@dataclass(frozen=True)
class AIUsageReservation:
    email: str
    usage_type: AIUsageType
    amount: int = 1


def _limit_error(status_code: int, code: str, message: str, **extra) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"code": code, "message": message, **extra})


def _month_start(today: date | None = None) -> date:
    current = today or date.today()
    return current.replace(day=1)


def normalize_plan(plan: str | None) -> PlanType:
    raw_plan = (plan or PlanType.FREE.value).lower()
    if raw_plan in LEGACY_PLAN_ALIASES:
        return LEGACY_PLAN_ALIASES[raw_plan]
    try:
        return PlanType(raw_plan)
    except ValueError:
        return PlanType.FREE


def get_plan_limits(plan: str | PlanType | None) -> PlanLimits:
    if isinstance(plan, PlanType):
        return PLAN_LIMITS[plan]
    return PLAN_LIMITS[normalize_plan(plan)]


def _get_or_create_progress(email: str, db: Session, *, for_update: bool = False) -> UserProgress:
    query = db.query(UserProgress).filter(UserProgress.user_email == email)
    if for_update:
        query = query.with_for_update()
    progress = query.first()
    if not progress:
        progress = UserProgress(user_email=email)
        db.add(progress)
        db.commit()
    return progress


def _ensure_monthly_reset(progress: UserProgress, db: Session) -> UserProgress:
    current_month = _month_start()
    if progress.usage_month != current_month:
        progress.summaries_used_month = 0
        progress.questions_used_month = 0
        progress.flashcards_used_month = 0
        progress.study_paths_used_month = 0
        progress.usage_month = current_month
        db.commit()
    return progress


def sync_plan_expiration(progress: UserProgress, db: Session) -> UserProgress:
    if (
        normalize_plan(progress.plan) != PlanType.FREE
        and progress.plan_expires_at
        and progress.plan_expires_at <= datetime.utcnow()
    ):
        progress.plan = PlanType.FREE.value
        progress.subscription_status = "expired"
        db.commit()
    return progress


def _progress_for_limits(email: str, db: Session, *, for_update: bool = False) -> UserProgress:
    progress = _get_or_create_progress(email, db, for_update=for_update)
    progress = sync_plan_expiration(progress, db)
    return _ensure_monthly_reset(progress, db)


def _progress_for_plan_limits(email: str, db: Session) -> UserProgress:
    """Carrega apenas o plano; limites estruturais não dependem do contador mensal."""
    return sync_plan_expiration(_get_or_create_progress(email, db), db)


def _document_for_user(document_id: str, email: str, db: Session) -> Document:
    document = (
        db.query(Document)
        .join(Subject, Subject.id == Document.subject_id)
        .filter(Document.id == document_id, Subject.owner_email == email)
        .first()
    )
    if not document:
        raise _limit_error(404, "DOCUMENT_NOT_FOUND", "Documento não encontrado.")
    return document


def ensure_document_belongs_to_user(document_id: str, email: str, db: Session) -> Document:
    return _document_for_user(document_id, email, db)


def _user_subject_ids(email: str, db: Session) -> list[str]:
    return [str(subject.id) for subject in db.query(Subject).filter(Subject.owner_email == email).all()]


def _ai_usage_state(progress: UserProgress, limits: PlanLimits) -> dict:
    summaries_used = progress.summaries_used_month or 0
    questions_used = progress.questions_used_month or 0
    flashcards_used = progress.flashcards_used_month or 0
    study_paths_used = progress.study_paths_used_month or 0
    return {
        "summaries": {
            "used": summaries_used,
            "limit": limits.maxMonthlySummaries,
            "remaining": max(0, limits.maxMonthlySummaries - summaries_used),
        },
        "questions": {
            "used": questions_used,
            "limit": limits.maxMonthlyQuestions,
            "remaining": max(0, limits.maxMonthlyQuestions - questions_used),
        },
        "flashcards": {
            "used": flashcards_used,
            "limit": limits.maxMonthlyFlashcards,
            "remaining": max(0, limits.maxMonthlyFlashcards - flashcards_used),
        },
        "study_paths": {
            "used": study_paths_used,
            "limit": limits.maxMonthlyStudyPaths,
            "remaining": max(0, limits.maxMonthlyStudyPaths - study_paths_used),
        },
    }


def get_status(email: str, db: Session) -> dict:
    progress = _progress_for_limits(email, db)
    plan = normalize_plan(progress.plan)
    limits = PLAN_LIMITS[plan]
    ai_usage = _ai_usage_state(progress, limits)
    total_remaining = sum(item["remaining"] for item in ai_usage.values())
    total_limit = (
        limits.maxMonthlySummaries
        + limits.maxMonthlyQuestions
        + limits.maxMonthlyFlashcards
        + limits.maxMonthlyStudyPaths
    )
    total_used = (
        ai_usage["summaries"]["used"]
        + ai_usage["questions"]["used"]
        + ai_usage["flashcards"]["used"]
        + ai_usage["study_paths"]["used"]
    )

    return {
        "used": total_used,
        "limit": total_limit,
        "remaining": total_remaining,
        "can_generate": total_remaining > 0,
        "plan": plan.value,
        "has_daily_bonus": False,
        "limits": asdict(limits),
        "subject_limit": limits.maxSubjects,
        "docs_per_subject_limit": limits.maxPdfsPerSubject,
        "docs_total_limit": limits.maxTotalPdfs,
        "upload_mb_limit": limits.maxUploadSizeMb,
        "active_competitions_limit": limits.maxActiveCompetitions,
        "monthly_summaries": ai_usage["summaries"],
        "monthly_questions": ai_usage["questions"],
        "monthly_flashcards": ai_usage["flashcards"],
        "monthly_study_paths": ai_usage["study_paths"],
        # Compatibilidade com nomes antigos do widget de créditos.
        "monthly_ai_credits": total_limit,
        "ai_credits_used": total_used,
        "ai_credits_remaining": total_remaining,
    }


def _normalize_usage_type(usage_type: AIUsageType | str) -> AIUsageType:
    if isinstance(usage_type, str) and usage_type.strip().lower() == "generic":
        return AIUsageType.SUMMARY
    try:
        return AIUsageType(usage_type)
    except ValueError:
        raise _limit_error(
            400,
            "INVALID_AI_OPERATION",
            "Operação de IA inválida.",
            allowed_operations=[item.value for item in AIUsageType],
        )


def _usage_limit_and_value(progress: UserProgress, limits: PlanLimits, usage_type: AIUsageType) -> tuple[int, int]:
    limits_by_type = {
        AIUsageType.SUMMARY: limits.maxMonthlySummaries,
        AIUsageType.QUESTIONS: limits.maxMonthlyQuestions,
        AIUsageType.FLASHCARDS: limits.maxMonthlyFlashcards,
        AIUsageType.STUDY_PATH: limits.maxMonthlyStudyPaths,
    }
    return limits_by_type[usage_type], getattr(progress, USAGE_COUNTER_FIELDS[usage_type]) or 0


def _set_usage_value(progress: UserProgress, usage_type: AIUsageType, value: int) -> None:
    setattr(progress, USAGE_COUNTER_FIELDS[usage_type], value)


def _usage_message(usage_type: AIUsageType) -> str:
    messages = {
        AIUsageType.SUMMARY: "Você atingiu o limite mensal de resumos do seu plano.",
        AIUsageType.QUESTIONS: "Você atingiu o limite mensal de questões do seu plano.",
        AIUsageType.FLASHCARDS: "Você atingiu o limite mensal de flashcards do seu plano.",
        AIUsageType.STUDY_PATH: "Você atingiu o limite mensal de trilhas de estudos do seu plano.",
    }
    return messages[usage_type]


def check_pdf_generation_limit(
    email: str,
    db: Session,
    *,
    document_id: str,
    action: AIUsageType | str,
) -> None:
    """Bloqueia reprocessamento por PDF apenas no plano gratuito."""
    usage_type = _normalize_usage_type(action)
    document = _document_for_user(document_id, email, db)
    progress = _progress_for_limits(email, db)
    if normalize_plan(progress.plan) != PlanType.FREE:
        return

    if usage_type == AIUsageType.SUMMARY:
        exists = db.query(Summary).filter(Summary.document_id == document.id).first()
    elif usage_type == AIUsageType.QUESTIONS:
        exists = db.query(Question).filter(Question.document_id == document.id).first()
    else:
        exists = db.query(Flashcard).filter(Flashcard.document_id == document.id).first()

    if exists:
        logger.info(
            "Bloqueando IA por limite free por PDF: email=%s document_id=%s usage_type=%s",
            email,
            document_id,
            usage_type.value,
        )
        raise _limit_error(
            403,
            "PDF_GENERATION_ALREADY_EXISTS",
            "No plano gratuito, este PDF já possui essa geração. Faça upgrade para gerar novamente.",
        )


def reserve_ai_usage(
    email: str,
    db: Session,
    *,
    usage_type: AIUsageType | str,
) -> AIUsageReservation:
    usage_type = _normalize_usage_type(usage_type)
    progress = _progress_for_limits(email, db, for_update=True)
    limits = get_plan_limits(progress.plan)
    limit, used = _usage_limit_and_value(progress, limits, usage_type)
    if used >= limit:
        logger.info(
            "Bloqueando IA por limite mensal: email=%s usage_type=%s used=%s limit=%s",
            email,
            usage_type.value,
            used,
            limit,
        )
        raise _limit_error(
            403,
            f"{usage_type.value.upper()}_MONTHLY_LIMIT_REACHED",
            _usage_message(usage_type),
            limit=limit,
            used=used,
        )

    _set_usage_value(progress, usage_type, used + 1)
    db.commit()
    logger.info("Uso mensal de IA reservado: email=%s usage_type=%s", email, usage_type.value)
    return AIUsageReservation(email=email, usage_type=usage_type)


def refund_ai_usage(reservation: AIUsageReservation | None, db: Session) -> None:
    if not reservation:
        return
    progress = _get_or_create_progress(reservation.email, db, for_update=True)
    _, used = _usage_limit_and_value(progress, get_plan_limits(progress.plan), reservation.usage_type)
    _set_usage_value(progress, reservation.usage_type, max(0, used - reservation.amount))
    db.commit()
    logger.info("Uso mensal de IA estornado: email=%s usage_type=%s", reservation.email, reservation.usage_type.value)


def reserve_ai_credits(email: str, db: Session, *, action: AIUsageType | str, question_count: int | None = None):
    """Compatibilidade temporária com nome antigo: reserva 1 uso mensal do tipo informado."""
    return reserve_ai_usage(email, db, usage_type=action)


def refund_ai_credits(reservation: AIUsageReservation | None, db: Session) -> None:
    """Compatibilidade temporária com nome antigo."""
    refund_ai_usage(reservation, db)


def check_and_consume(email: str, db: Session):
    """Compatibilidade com chamadas antigas: consome uma geração de resumo."""
    return reserve_ai_usage(email, db, usage_type=AIUsageType.SUMMARY)


def apply_daily_bonus(email: str, db: Session) -> bool:
    progress = _get_or_create_progress(email, db)
    today = date.today()
    last = progress.last_active_date
    if last == today:
        return False
    if last and (today - last).days == 1:
        progress.streak_days = (progress.streak_days or 0) + 1
    else:
        progress.streak_days = 1
    progress.last_active_date = today
    db.commit()
    return True


def check_subject_limit(email: str, db: Session) -> None:
    progress = _progress_for_plan_limits(email, db)
    limit = get_plan_limits(progress.plan).maxSubjects
    count = db.query(Subject).filter(Subject.owner_email == email).count()
    if count >= limit:
        raise _limit_error(
            403,
            "SUBJECT_LIMIT_REACHED",
            "Você atingiu o limite de matérias do seu plano.",
            limit=limit,
        )


def check_document_limit(subject_id: str, email: str, db: Session) -> PlanLimits:
    progress = _progress_for_plan_limits(email, db)
    limits = get_plan_limits(progress.plan)
    total_count = (
        db.query(Document)
        .join(Subject, Subject.id == Document.subject_id)
        .filter(Subject.owner_email == email)
        .count()
    )
    if total_count >= limits.maxTotalPdfs:
        raise _limit_error(
            403,
            "DOCUMENT_TOTAL_LIMIT_REACHED",
            "Você atingiu o limite total de PDFs do seu plano.",
            limit=limits.maxTotalPdfs,
        )

    per_subject_count = db.query(Document).filter(Document.subject_id == subject_id).count()
    if per_subject_count >= limits.maxPdfsPerSubject:
        raise _limit_error(
            403,
            "DOCUMENT_PER_SUBJECT_LIMIT_REACHED",
            "Você atingiu o limite de PDFs desta matéria.",
            limit=limits.maxPdfsPerSubject,
        )
    return limits


def check_upload_size(email: str, file_size_bytes: int, db: Session) -> None:
    limit_bytes, limit_mb = get_upload_size_limit(email, db)
    if file_size_bytes > limit_bytes:
        raise _limit_error(
            413,
            "FILE_TOO_LARGE",
            f"Seu plano permite uploads de até {limit_mb} MB.",
            limit_mb=limit_mb,
        )


def get_upload_size_limit(email: str, db: Session) -> tuple[int, int]:
    progress = _progress_for_plan_limits(email, db)
    limit_mb = get_plan_limits(progress.plan).maxUploadSizeMb
    return limit_mb * 1024 * 1024, limit_mb


def check_competition_limit(email: str, db: Session) -> None:
    progress = _progress_for_plan_limits(email, db)
    limit = get_plan_limits(progress.plan).maxActiveCompetitions
    count = db.query(Competition).filter(
        Competition.host_email == email,
        Competition.status != "finished",
    ).count()
    if count >= limit:
        raise _limit_error(
            403,
            "COMPETITION_LIMIT_REACHED",
            "Você atingiu o limite de competições ativas do seu plano.",
            limit=limit,
        )
