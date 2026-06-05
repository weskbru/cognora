from datetime import datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from api.dependencies import get_current_admin_user
from core.config.settings import settings
from core.security.password import hash_password
from domain.use_cases.limits import normalize_plan, sync_plan_expiration
from infrastructure.database.connection import get_db
from infrastructure.database.models import (
    AdminAuditLog,
    PasswordResetToken,
    PixPaymentRequest,
    QuestionAttempt,
    StudySession,
    Subject,
    SystemEvent,
    User,
    UserProgress,
)
from infrastructure.observability import cleanup_old_system_events
from infrastructure.repositories.base import row_to_dict

router = APIRouter(prefix="/api/admin", tags=["admin"])


class GrantPlanPayload(BaseModel):
    plan: Literal["pro", "premium"]
    days: int = Field(default=30, ge=1, le=366)
    starts_at: datetime | None = None
    note: str | None = None


class RevokePlanPayload(BaseModel):
    note: str | None = None


class ResetUserPasswordPayload(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)
    note: str | None = None


class DeleteUserPayload(BaseModel):
    confirm_email: str
    note: str | None = None


class CleanupSystemEventsPayload(BaseModel):
    retention_days: int | None = Field(default=None, ge=1, le=365)


def _get_or_create_progress(email: str, db: Session) -> UserProgress:
    progress = db.query(UserProgress).filter(UserProgress.user_email == email).first()
    if not progress:
        progress = UserProgress(user_email=email)
        db.add(progress)
        db.flush()
    return progress


def _sync_expired_subscriptions(db: Session) -> None:
    rows = (
        db.query(UserProgress)
        .filter(
            UserProgress.plan != "free",
            UserProgress.plan_expires_at.isnot(None),
            UserProgress.plan_expires_at <= datetime.utcnow(),
        )
        .all()
    )
    for progress in rows:
        sync_plan_expiration(progress, db)


def _audit(
    db: Session,
    admin: User,
    action: str,
    target_user_email: str | None,
    target_type: str,
    target_id: str,
    metadata: dict,
) -> None:
    db.add(AdminAuditLog(
        admin_user_id=admin.id,
        admin_email=admin.email,
        action=action,
        target_user_email=target_user_email,
        target_type=target_type,
        target_id=target_id,
        metadata_json=metadata,
    ))


def _progress_payload(progress: UserProgress | None) -> dict:
    if not progress:
        return {
            "plan": "free",
            "subscription_status": "inactive",
            "plan_started_at": None,
            "plan_expires_at": None,
            "xp": 0,
            "level": 1,
            "daily_generations_used": 0,
        }
    return {
        "plan": normalize_plan(progress.plan).value,
        "subscription_status": progress.subscription_status or "inactive",
        "plan_started_at": progress.plan_started_at.isoformat() if progress.plan_started_at else None,
        "plan_expires_at": progress.plan_expires_at.isoformat() if progress.plan_expires_at else None,
        "xp": progress.xp or 0,
        "level": progress.level or 1,
        "daily_generations_used": progress.daily_generations_used or 0,
    }


def _payment_payload(payment: PixPaymentRequest) -> dict:
    data = row_to_dict(payment)
    data["plan"] = normalize_plan(payment.plan).value
    return data


def _get_user_or_404(user_id: str, db: Session) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado.")
    return user


@router.get("/overview")
def admin_overview(
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    _sync_expired_subscriptions(db)
    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1)
    expiring_until = now + timedelta(days=7)

    total_users = db.query(User).count()
    active_pro_users = (
        db.query(UserProgress)
        .filter(
            UserProgress.plan.in_(["pro", "premium", "unlimited"]),
            UserProgress.subscription_status == "active",
            or_(UserProgress.plan_expires_at.is_(None), UserProgress.plan_expires_at > now),
        )
        .count()
    )
    pending_pix = db.query(PixPaymentRequest).filter(PixPaymentRequest.status == "pending").count()
    approved_this_month = (
        db.query(PixPaymentRequest)
        .filter(PixPaymentRequest.status == "approved", PixPaymentRequest.approved_at >= month_start)
        .count()
    )
    revenue_cents = (
        db.query(func.coalesce(func.sum(PixPaymentRequest.amount_cents), 0))
        .filter(PixPaymentRequest.status == "approved", PixPaymentRequest.approved_at >= month_start)
        .scalar()
        or 0
    )
    expiring_soon = (
        db.query(UserProgress)
        .filter(
            UserProgress.plan.in_(["pro", "premium", "unlimited"]),
            UserProgress.subscription_status == "active",
            UserProgress.plan_expires_at > now,
            UserProgress.plan_expires_at <= expiring_until,
        )
        .count()
    )

    recent_audit = (
        db.query(AdminAuditLog)
        .order_by(AdminAuditLog.created_at.desc())
        .limit(8)
        .all()
    )
    recent_payments = (
        db.query(PixPaymentRequest)
        .order_by(PixPaymentRequest.created_at.desc())
        .limit(8)
        .all()
    )

    return {
        "total_users": total_users,
        "active_pro_users": active_pro_users,
        "pending_pix": pending_pix,
        "approved_this_month": approved_this_month,
        "revenue_cents_this_month": revenue_cents,
        "expiring_soon": expiring_soon,
        "recent_audit_logs": [row_to_dict(row) for row in recent_audit],
        "recent_payment_requests": [_payment_payload(row) for row in recent_payments],
    }


@router.get("/users")
def admin_list_users(
    q: str | None = Query(None),
    plan: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    _sync_expired_subscriptions(db)
    query = db.query(User, UserProgress).outerjoin(UserProgress, UserProgress.user_email == User.email)

    if q:
        like = f"%{q.strip()}%"
        query = query.filter(or_(User.email.ilike(like), User.username.ilike(like)))
    if plan and plan != "all":
        if plan == "free":
            query = query.filter(or_(UserProgress.plan.is_(None), UserProgress.plan == "free"))
        elif plan == "premium":
            query = query.filter(UserProgress.plan.in_(["premium", "unlimited"]))
        else:
            query = query.filter(UserProgress.plan == plan)

    rows = query.order_by(User.created_at.desc()).limit(limit).all()
    result = []
    for user, progress in rows:
        result.append({
            "id": str(user.id),
            "email": user.email,
            "username": user.username,
            "role": user.role or "user",
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "progress": _progress_payload(progress),
        })
    return result


@router.post("/users/{user_id}/grant-plan")
def admin_grant_plan(
    user_id: str,
    payload: GrantPlanPayload,
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    user = _get_user_or_404(user_id, db)

    starts_at = payload.starts_at or datetime.utcnow()
    ends_at = starts_at + timedelta(days=payload.days)
    progress = _get_or_create_progress(user.email, db)
    progress.plan = payload.plan
    progress.subscription_status = "active"
    progress.plan_started_at = starts_at
    progress.plan_expires_at = ends_at

    _audit(db, admin, "manual_plan_granted", user.email, "user", str(user.id), {
        "plan": payload.plan,
        "days": payload.days,
        "starts_at": starts_at.isoformat(),
        "ends_at": ends_at.isoformat(),
        "note": payload.note,
    })
    db.commit()
    db.refresh(progress)
    return {
        "user_id": str(user.id),
        "email": user.email,
        "progress": _progress_payload(progress),
    }


@router.post("/users/{user_id}/revoke-plan")
def admin_revoke_plan(
    user_id: str,
    payload: RevokePlanPayload,
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    user = _get_user_or_404(user_id, db)

    progress = _get_or_create_progress(user.email, db)
    previous = {
        "plan": progress.plan,
        "subscription_status": progress.subscription_status,
        "plan_expires_at": progress.plan_expires_at.isoformat() if progress.plan_expires_at else None,
    }
    progress.plan = "free"
    progress.subscription_status = "inactive"
    progress.plan_started_at = None
    progress.plan_expires_at = None

    _audit(db, admin, "manual_plan_revoked", user.email, "user", str(user.id), {
        "previous": previous,
        "note": payload.note,
    })
    db.commit()
    db.refresh(progress)
    return {
        "user_id": str(user.id),
        "email": user.email,
        "progress": _progress_payload(progress),
    }


@router.post("/users/{user_id}/reset-password")
def admin_reset_user_password(
    user_id: str,
    payload: ResetUserPasswordPayload,
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    user = _get_user_or_404(user_id, db)
    user.hashed_password = hash_password(payload.new_password)

    db.query(PasswordResetToken).filter(PasswordResetToken.user_email == user.email).update({"used": True})
    _audit(db, admin, "user_password_reset_by_admin", user.email, "user", str(user.id), {
        "note": payload.note,
        "password_length": len(payload.new_password),
    })
    db.commit()
    return {"user_id": str(user.id), "email": user.email, "password_reset": True}


@router.delete("/users/{user_id}")
def admin_delete_user(
    user_id: str,
    payload: DeleteUserPayload,
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    user = _get_user_or_404(user_id, db)
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="O admin nao pode excluir a propria conta.")
    if payload.confirm_email.strip().lower() != user.email.lower():
        raise HTTPException(status_code=400, detail="E-mail de confirmacao nao confere.")

    target_email = user.email
    target_id = str(user.id)
    deleted_counts = {
        "password_reset_tokens": db.query(PasswordResetToken).filter(PasswordResetToken.user_email == target_email).delete(),
        "question_attempts": db.query(QuestionAttempt).filter(QuestionAttempt.user_email == target_email).delete(),
        "study_sessions": db.query(StudySession).filter(StudySession.user_email == target_email).delete(),
        "subjects": db.query(Subject).filter(Subject.owner_email == target_email).delete(),
        "user_progress": db.query(UserProgress).filter(UserProgress.user_email == target_email).delete(),
        "pix_payment_requests": db.query(PixPaymentRequest).filter(PixPaymentRequest.user_id == user.id).delete(),
    }
    db.query(AdminAuditLog).filter(AdminAuditLog.admin_user_id == user.id).update({"admin_user_id": None})
    db.query(PixPaymentRequest).filter(PixPaymentRequest.approved_by_admin_id == user.id).update({"approved_by_admin_id": None})

    _audit(db, admin, "user_deleted_by_admin", target_email, "user", target_id, {
        "note": payload.note,
        "deleted_counts": deleted_counts,
        "username": user.username,
        "role": user.role,
    })
    db.delete(user)
    db.commit()
    return {"user_id": target_id, "email": target_email, "deleted": True}


@router.get("/audit-logs")
def admin_audit_logs(
    q: str | None = Query(None),
    action: str | None = Query(None),
    limit: int = Query(100, ge=1, le=300),
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    query = db.query(AdminAuditLog)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(or_(
            AdminAuditLog.admin_email.ilike(like),
            AdminAuditLog.target_user_email.ilike(like),
            AdminAuditLog.target_id.ilike(like),
        ))
    if action and action != "all":
        query = query.filter(AdminAuditLog.action == action)
    rows = query.order_by(AdminAuditLog.created_at.desc()).limit(limit).all()
    return [row_to_dict(row) for row in rows]


@router.get("/system-events")
def admin_system_events(
    q: str | None = Query(None),
    level: str | None = Query(None),
    event_type: str | None = Query(None),
    user_email: str | None = Query(None),
    request_id: str | None = Query(None),
    created_from: datetime | None = Query(None),
    created_to: datetime | None = Query(None),
    limit: int = Query(100, ge=1, le=300),
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    query = db.query(SystemEvent)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(or_(
            SystemEvent.message.ilike(like),
            SystemEvent.event_type.ilike(like),
            SystemEvent.user_email.ilike(like),
            SystemEvent.request_id.ilike(like),
        ))
    if level and level != "all":
        query = query.filter(SystemEvent.level == level)
    if event_type and event_type != "all":
        query = query.filter(SystemEvent.event_type == event_type)
    if user_email:
        query = query.filter(SystemEvent.user_email.ilike(f"%{user_email.strip()}%"))
    if request_id:
        query = query.filter(SystemEvent.request_id == request_id.strip())
    if created_from:
        query = query.filter(SystemEvent.created_at >= created_from)
    if created_to:
        query = query.filter(SystemEvent.created_at <= created_to)
    rows = query.order_by(SystemEvent.created_at.desc()).limit(limit).all()
    return [row_to_dict(row) for row in rows]


@router.post("/system-events/cleanup")
def admin_cleanup_system_events(
    payload: CleanupSystemEventsPayload,
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    retention_days = payload.retention_days
    deleted = cleanup_old_system_events(db, retention_days)
    effective_retention_days = retention_days or settings.observability_retention_days
    _audit(db, admin, "system_events_cleanup", None, "system_events", "retention", {
        "retention_days": effective_retention_days,
        "deleted": deleted,
    })
    db.commit()
    return {"deleted": deleted, "retention_days": effective_retention_days}


@router.get("/system-events/summary")
def admin_system_events_summary(
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    last_24h = now - timedelta(hours=24)
    last_7d = now - timedelta(days=7)

    by_level_24h = dict(
        db.query(SystemEvent.level, func.count(SystemEvent.id))
        .filter(SystemEvent.created_at >= last_24h)
        .group_by(SystemEvent.level)
        .all()
    )
    by_type_7d = dict(
        db.query(SystemEvent.event_type, func.count(SystemEvent.id))
        .filter(SystemEvent.created_at >= last_7d)
        .group_by(SystemEvent.event_type)
        .all()
    )
    total_7d = (
        db.query(func.count(SystemEvent.id))
        .filter(SystemEvent.created_at >= last_7d)
        .scalar()
        or 0
    )
    recent_errors = (
        db.query(SystemEvent)
        .filter(SystemEvent.level == "error")
        .order_by(SystemEvent.created_at.desc())
        .limit(5)
        .all()
    )

    return {
        "last_24h": {
            "info": by_level_24h.get("info", 0),
            "warning": by_level_24h.get("warning", 0),
            "error": by_level_24h.get("error", 0),
        },
        "total_7d": total_7d,
        "by_type_7d": by_type_7d,
        "recent_errors": [row_to_dict(row) for row in recent_errors],
        "config": {
            "retention_days": settings.observability_retention_days,
            "alert_email_enabled": bool(settings.resend_api_key and settings.observability_alert_emails),
            "alert_email_count": len(settings.observability_alert_emails),
            "alert_error_threshold": settings.observability_alert_error_threshold,
            "alert_window_minutes": settings.observability_alert_window_minutes,
            "alert_cooldown_minutes": settings.observability_alert_cooldown_minutes,
        },
    }
