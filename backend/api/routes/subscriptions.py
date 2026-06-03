import base64
import io
import re
import secrets
from datetime import datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from api.dependencies import get_current_admin_user, get_current_user
from core.config.settings import settings
from domain.use_cases.limits import sync_plan_expiration
from infrastructure.database.connection import get_db
from infrastructure.database.models import AdminAuditLog, PixPaymentRequest, User, UserProgress
from infrastructure.repositories.base import row_to_dict

router = APIRouter(prefix="/api/subscriptions", tags=["subscriptions"])

PAYMENT_REQUEST_TTL_HOURS = 24
SUBSCRIPTION_DAYS = 30


class PixPaymentPayload(BaseModel):
    plan: Literal["pro", "unlimited"]


class AdminDecisionPayload(BaseModel):
    paid_at: datetime | None = None
    admin_note: str | None = None


def _get_plan_price_cents(plan: str) -> int:
    if plan == "pro":
        return settings.pix_plan_price_cents_pro
    if plan == "unlimited":
        return settings.pix_plan_price_cents_unlimited
    raise HTTPException(status_code=400, detail="Plano inválido.")


def _get_or_create_progress(email: str, db: Session) -> UserProgress:
    progress = db.query(UserProgress).filter(UserProgress.user_email == email).first()
    if not progress:
        progress = UserProgress(user_email=email)
        db.add(progress)
        db.commit()
        db.refresh(progress)
    return progress


def _emv_field(identifier: str, value: str) -> str:
    return f"{identifier}{len(value):02d}{value}"


def _crc16(payload: str) -> str:
    crc = 0xFFFF
    for byte in payload.encode("utf-8"):
        crc ^= byte << 8
        for _ in range(8):
            if crc & 0x8000:
                crc = (crc << 1) ^ 0x1021
            else:
                crc <<= 1
            crc &= 0xFFFF
    return f"{crc:04X}"


def _sanitize_pix_text(value: str, max_len: int) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9 .,@+\-_]", "", value).strip()
    return cleaned[:max_len] or "COGNORA"


def _generate_pix_payload(plan: str, amount_cents: int, reference: str) -> str:
    if not settings.pix_key:
        raise HTTPException(status_code=503, detail="Chave Pix não configurada.")

    merchant_account = (
        _emv_field("00", "br.gov.bcb.pix")
        + _emv_field("01", settings.pix_key)
        + _emv_field("02", _sanitize_pix_text(f"Cognora {plan} {reference}", 72))
    )
    additional_data = _emv_field("05", _sanitize_pix_text(reference, 25))
    amount = f"{amount_cents / 100:.2f}"
    payload_without_crc = (
        _emv_field("00", "01")
        + _emv_field("26", merchant_account)
        + _emv_field("52", "0000")
        + _emv_field("53", "986")
        + _emv_field("54", amount)
        + _emv_field("58", "BR")
        + _emv_field("59", _sanitize_pix_text(settings.pix_merchant_name, 25))
        + _emv_field("60", _sanitize_pix_text(settings.pix_merchant_city, 15))
        + _emv_field("62", additional_data)
        + "6304"
    )
    return payload_without_crc + _crc16(payload_without_crc)


def _generate_qr_data_url(payload: str) -> str:
    try:
        import qrcode
    except ImportError as exc:
        raise HTTPException(status_code=503, detail="Gerador de QR Code não instalado.") from exc

    image = qrcode.make(payload)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def _payment_response(payment: PixPaymentRequest) -> dict:
    data = row_to_dict(payment)
    data["qr_code_data_url"] = _generate_qr_data_url(payment.pix_payload)
    return data


def _expire_pending_requests(db: Session) -> None:
    now = datetime.utcnow()
    expired = (
        db.query(PixPaymentRequest)
        .filter(PixPaymentRequest.status == "pending", PixPaymentRequest.expires_at <= now)
        .all()
    )
    if not expired:
        return
    for payment in expired:
        payment.status = "expired"
    db.commit()


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


@router.post("/pix")
def create_pix_payment_request(
    payload: PixPaymentPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _expire_pending_requests(db)
    progress = sync_plan_expiration(_get_or_create_progress(current_user.email, db), db)
    if progress.plan == payload.plan and progress.subscription_status == "active":
        raise HTTPException(status_code=409, detail="Você já está nesse plano.")

    now = datetime.utcnow()
    existing = (
        db.query(PixPaymentRequest)
        .filter(
            PixPaymentRequest.user_id == current_user.id,
            PixPaymentRequest.plan == payload.plan,
            PixPaymentRequest.status == "pending",
            PixPaymentRequest.expires_at > now,
        )
        .order_by(PixPaymentRequest.created_at.desc())
        .first()
    )
    if existing:
        return _payment_response(existing)

    amount_cents = _get_plan_price_cents(payload.plan)
    reference = f"COG-{str(current_user.id)[:8].upper()}-{secrets.token_hex(3).upper()}"
    pix_payload = _generate_pix_payload(payload.plan, amount_cents, reference)
    payment = PixPaymentRequest(
        user_id=current_user.id,
        user_email=current_user.email,
        user_name=current_user.username,
        plan=payload.plan,
        amount_cents=amount_cents,
        pix_reference=reference,
        pix_payload=pix_payload,
        expires_at=now + timedelta(hours=PAYMENT_REQUEST_TTL_HOURS),
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return _payment_response(payment)


@router.get("/status")
def subscription_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _expire_pending_requests(db)
    progress = sync_plan_expiration(_get_or_create_progress(current_user.email, db), db)
    pending_payment = (
        db.query(PixPaymentRequest)
        .filter(
            PixPaymentRequest.user_id == current_user.id,
            PixPaymentRequest.status == "pending",
            PixPaymentRequest.expires_at > datetime.utcnow(),
        )
        .order_by(PixPaymentRequest.created_at.desc())
        .first()
    )
    return {
        "plan": progress.plan or "free",
        "subscription_status": progress.subscription_status or "inactive",
        "plan_started_at": progress.plan_started_at.isoformat() if progress.plan_started_at else None,
        "plan_expires_at": progress.plan_expires_at.isoformat() if progress.plan_expires_at else None,
        "pending_payment": row_to_dict(pending_payment) if pending_payment else None,
    }


@router.get("/admin/payment-requests")
def admin_list_payment_requests(
    q: str | None = Query(None),
    status: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    _expire_pending_requests(db)
    query = db.query(PixPaymentRequest)
    if status and status != "all":
        query = query.filter(PixPaymentRequest.status == status)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(or_(
            PixPaymentRequest.user_email.ilike(like),
            PixPaymentRequest.user_name.ilike(like),
            PixPaymentRequest.pix_reference.ilike(like),
        ))
    rows = query.order_by(PixPaymentRequest.created_at.desc()).limit(limit).all()
    return [row_to_dict(row) for row in rows]


@router.post("/admin/payment-requests/{payment_id}/approve")
def admin_approve_payment_request(
    payment_id: str,
    payload: AdminDecisionPayload,
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    payment = db.query(PixPaymentRequest).filter(PixPaymentRequest.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Pedido Pix não encontrado.")
    if payment.status != "pending":
        raise HTTPException(status_code=409, detail="Esse pedido não está pendente.")

    paid_at = payload.paid_at or datetime.utcnow()
    ends_at = paid_at + timedelta(days=SUBSCRIPTION_DAYS)
    progress = _get_or_create_progress(payment.user_email, db)
    progress.plan = payment.plan
    progress.subscription_status = "active"
    progress.plan_started_at = paid_at
    progress.plan_expires_at = ends_at

    payment.status = "approved"
    payment.paid_at = paid_at
    payment.approved_at = datetime.utcnow()
    payment.approved_by_admin_id = admin.id
    payment.admin_note = payload.admin_note

    _audit(db, admin, "pix_payment_approved", payment.user_email, "pix_payment_request", str(payment.id), {
        "plan": payment.plan,
        "amount_cents": payment.amount_cents,
        "pix_reference": payment.pix_reference,
        "plan_started_at": paid_at.isoformat(),
        "plan_expires_at": ends_at.isoformat(),
    })
    db.commit()
    db.refresh(payment)
    return row_to_dict(payment)


@router.post("/admin/payment-requests/{payment_id}/reject")
def admin_reject_payment_request(
    payment_id: str,
    payload: AdminDecisionPayload,
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    payment = db.query(PixPaymentRequest).filter(PixPaymentRequest.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Pedido Pix não encontrado.")
    if payment.status != "pending":
        raise HTTPException(status_code=409, detail="Esse pedido não está pendente.")

    payment.status = "rejected"
    payment.rejected_at = datetime.utcnow()
    payment.admin_note = payload.admin_note
    _audit(db, admin, "pix_payment_rejected", payment.user_email, "pix_payment_request", str(payment.id), {
        "plan": payment.plan,
        "amount_cents": payment.amount_cents,
        "pix_reference": payment.pix_reference,
    })
    db.commit()
    db.refresh(payment)
    return row_to_dict(payment)
