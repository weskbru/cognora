from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel

from infrastructure.database.connection import get_db
from infrastructure.database.models import UserProgress
from api.dependencies import get_current_user
from infrastructure.database.models import User
from core.config.settings import settings

router = APIRouter(prefix="/api/subscriptions", tags=["subscriptions"])


class CheckoutPayload(BaseModel):
    plan: str  # "pro" | "unlimited"


def _get_stripe():
    import stripe
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Pagamentos não configurados neste ambiente.")
    stripe.api_key = settings.stripe_secret_key
    return stripe


def _get_or_create_progress(email: str, db: Session) -> UserProgress:
    p = db.query(UserProgress).filter(UserProgress.user_email == email).first()
    if not p:
        p = UserProgress(user_email=email)
        db.add(p)
        db.commit()
        db.refresh(p)
    return p


@router.post("/checkout")
def create_checkout(
    payload: CheckoutPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stripe = _get_stripe()

    price_id = (
        settings.stripe_price_id_pro
        if payload.plan == "pro"
        else settings.stripe_price_id_unlimited
    )
    if not price_id:
        raise HTTPException(status_code=503, detail="Plano não configurado.")

    p = _get_or_create_progress(current_user.email, db)

    # Reusa customer existente se já tiver
    customer_id = p.stripe_customer_id or None

    session = stripe.checkout.Session.create(
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        customer=customer_id,
        customer_email=None if customer_id else current_user.email,
        success_url=f"{settings.app_url}/pricing?success=true",
        cancel_url=f"{settings.app_url}/pricing?canceled=true",
        metadata={"plan": payload.plan, "user_email": current_user.email},
        allow_promotion_codes=True,
    )
    return {"checkout_url": session.url}


@router.post("/portal")
def customer_portal(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stripe = _get_stripe()
    p = _get_or_create_progress(current_user.email, db)
    if not p.stripe_customer_id:
        raise HTTPException(status_code=400, detail="Nenhuma assinatura ativa encontrada.")

    session = stripe.billing_portal.Session.create(
        customer=p.stripe_customer_id,
        return_url=f"{settings.app_url}/pricing",
    )
    return {"portal_url": session.url}


@router.get("/status")
def subscription_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = _get_or_create_progress(current_user.email, db)
    return {
        "plan": p.plan or "free",
        "stripe_customer_id": p.stripe_customer_id,
        "stripe_subscription_id": p.stripe_subscription_id,
    }


# ── Webhook (sem autenticação — verificado pela assinatura Stripe) ─────────────

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")

    if not settings.stripe_webhook_secret or not settings.stripe_secret_key:
        return {"received": True}

    import stripe
    stripe.api_key = settings.stripe_secret_key

    try:
        event = stripe.Webhook.construct_event(payload, sig, settings.stripe_webhook_secret)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    etype = event["type"]
    data = event["data"]["object"]

    if etype == "checkout.session.completed":
        _on_checkout_completed(data, db)
    elif etype in ("customer.subscription.updated", "customer.subscription.deleted"):
        _on_subscription_changed(data, db, deleted=(etype == "customer.subscription.deleted"))

    return {"received": True}


def _on_checkout_completed(session: dict, db: Session):
    email = (
        session.get("customer_email")
        or (session.get("customer_details") or {}).get("email")
        or session.get("metadata", {}).get("user_email")
    )
    if not email:
        return
    p = db.query(UserProgress).filter(UserProgress.user_email == email).first()
    if not p:
        return
    plan = session.get("metadata", {}).get("plan", "pro")
    p.plan = plan
    p.stripe_customer_id = session.get("customer")
    p.stripe_subscription_id = session.get("subscription")
    db.commit()


def _on_subscription_changed(subscription: dict, db: Session, deleted: bool = False):
    customer_id = subscription.get("customer")
    p = db.query(UserProgress).filter(UserProgress.stripe_customer_id == customer_id).first()
    if not p:
        return

    if deleted or subscription.get("status") in ("canceled", "unpaid", "incomplete_expired"):
        p.plan = "free"
        p.stripe_subscription_id = None
    elif subscription.get("status") == "active":
        items = (subscription.get("items") or {}).get("data", [])
        if items:
            price_id = (items[0].get("price") or {}).get("id")
            if price_id == settings.stripe_price_id_unlimited:
                p.plan = "unlimited"
            elif price_id == settings.stripe_price_id_pro:
                p.plan = "pro"
    db.commit()
