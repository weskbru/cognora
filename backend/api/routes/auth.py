from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.dependencies import get_current_user
from api.dependencies import is_admin_user
from api.schemas.auth import (
    ForgotPasswordPayload,
    GoogleAuthPayload,
    LoginPayload,
    RegisterPayload,
    ResetPasswordPayload,
)
from domain.use_cases.auth import AuthUseCases
from domain.use_cases.limits import apply_daily_bonus, get_status
from infrastructure.database.connection import get_db
from infrastructure.database.models import User
from infrastructure.observability import record_system_event
from infrastructure.repositories.user import UserRepository

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _use_cases(db: Session = Depends(get_db)) -> AuthUseCases:
    return AuthUseCases(UserRepository(db))


@router.post("/register", status_code=201)
def register(payload: RegisterPayload, uc: AuthUseCases = Depends(_use_cases), db: Session = Depends(get_db)):
    result, error = uc.register(payload.email, payload.username, payload.password)
    if error:
        record_system_event(
            db,
            level="warning",
            event_type="auth_register_failed",
            user_email=payload.email,
            message="Falha no cadastro de usuario.",
            metadata={"reason": error, "username": payload.username},
        )
        raise HTTPException(status_code=400, detail=error)
    apply_daily_bonus(payload.email, db)
    status = get_status(payload.email, db)
    result["generations_remaining"] = status["remaining"]
    record_system_event(
        db,
        level="info",
        event_type="auth_register_success",
        user_email=payload.email,
        message="Usuario cadastrado com sucesso.",
        metadata={"username": payload.username},
    )
    return result


@router.post("/login")
def login(payload: LoginPayload, uc: AuthUseCases = Depends(_use_cases), db: Session = Depends(get_db)):
    result, error = uc.login(payload.identifier, payload.password)
    if error:
        record_system_event(
            db,
            level="warning",
            event_type="auth_login_failed",
            user_email=payload.identifier if "@" in payload.identifier else None,
            message="Falha de login.",
            metadata={"identifier": payload.identifier, "reason": error},
        )
        raise HTTPException(status_code=401, detail=error)
    apply_daily_bonus(result["email"], db)
    status = get_status(result["email"], db)
    result["generations_remaining"] = status["remaining"]
    result["has_daily_bonus"] = status["has_daily_bonus"]
    record_system_event(
        db,
        level="info",
        event_type="auth_login_success",
        user_email=result["email"],
        message="Login realizado com sucesso.",
    )
    return result


@router.post("/google")
def google_login(payload: GoogleAuthPayload, uc: AuthUseCases = Depends(_use_cases), db: Session = Depends(get_db)):
    result, error = uc.google_login(payload.credential)
    if error:
        record_system_event(
            db,
            level="warning",
            event_type="auth_google_login_failed",
            message="Falha de login com Google.",
            metadata={"reason": error},
        )
        raise HTTPException(status_code=401, detail=error)
    apply_daily_bonus(result["email"], db)
    status = get_status(result["email"], db)
    result["generations_remaining"] = status["remaining"]
    result["has_daily_bonus"] = status["has_daily_bonus"]
    record_system_event(
        db,
        level="info",
        event_type="auth_google_login_success",
        user_email=result["email"],
        message="Login com Google realizado com sucesso.",
    )
    return result


@router.post("/forgot-password")
def forgot_password(
    payload: ForgotPasswordPayload,
    uc: AuthUseCases = Depends(_use_cases),
    db: Session = Depends(get_db),
):
    uc.forgot_password(payload.email)
    record_system_event(
        db,
        level="info",
        event_type="auth_password_reset_requested",
        user_email=payload.email,
        message="Solicitacao de redefinicao de senha recebida.",
    )
    return {"message": "Se o email existir, voce recebera um link para redefinir sua senha."}


@router.post("/reset-password")
def reset_password(
    payload: ResetPasswordPayload,
    uc: AuthUseCases = Depends(_use_cases),
    db: Session = Depends(get_db),
):
    result, error = uc.reset_password(payload.token, payload.new_password)
    if error:
        record_system_event(
            db,
            level="warning",
            event_type="auth_password_reset_failed",
            message="Falha ao redefinir senha.",
            metadata={"reason": error},
        )
        raise HTTPException(status_code=400, detail=error)
    record_system_event(
        db,
        level="info",
        event_type="auth_password_reset_success",
        user_email=result.get("email") if isinstance(result, dict) else None,
        message="Senha redefinida com sucesso.",
    )
    return {"message": "Senha redefinida com sucesso."}


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "username": current_user.username,
        "role": "admin" if is_admin_user(current_user) else "user",
    }
