from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from infrastructure.database.connection import get_db
from infrastructure.repositories.user import UserRepository
from domain.use_cases.auth import AuthUseCases
from domain.use_cases.limits import apply_daily_bonus, get_status
from api.schemas.auth import RegisterPayload, LoginPayload, ForgotPasswordPayload, ResetPasswordPayload, GoogleAuthPayload
from api.dependencies import get_current_user
from api.dependencies import is_admin_user
from infrastructure.database.models import User

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _use_cases(db: Session = Depends(get_db)) -> AuthUseCases:
    return AuthUseCases(UserRepository(db))


@router.post("/register", status_code=201)
def register(payload: RegisterPayload, uc: AuthUseCases = Depends(_use_cases), db: Session = Depends(get_db)):
    result, error = uc.register(payload.email, payload.username, payload.password)
    if error:
        raise HTTPException(status_code=400, detail=error)
    apply_daily_bonus(payload.email, db)
    status = get_status(payload.email, db)
    result["generations_remaining"] = status["remaining"]
    return result


@router.post("/login")
def login(payload: LoginPayload, uc: AuthUseCases = Depends(_use_cases), db: Session = Depends(get_db)):
    result, error = uc.login(payload.identifier, payload.password)
    if error:
        raise HTTPException(status_code=401, detail=error)
    apply_daily_bonus(result["email"], db)
    status = get_status(result["email"], db)
    result["generations_remaining"] = status["remaining"]
    result["has_daily_bonus"] = status["has_daily_bonus"]
    return result


@router.post("/google")
def google_login(payload: GoogleAuthPayload, uc: AuthUseCases = Depends(_use_cases), db: Session = Depends(get_db)):
    result, error = uc.google_login(payload.credential)
    if error:
        raise HTTPException(status_code=401, detail=error)
    apply_daily_bonus(result["email"], db)
    status = get_status(result["email"], db)
    result["generations_remaining"] = status["remaining"]
    result["has_daily_bonus"] = status["has_daily_bonus"]
    return result


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordPayload, uc: AuthUseCases = Depends(_use_cases)):
    uc.forgot_password(payload.email)
    return {"message": "Se o email existir, você receberá um link para redefinir sua senha."}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordPayload, uc: AuthUseCases = Depends(_use_cases)):
    result, error = uc.reset_password(payload.token, payload.new_password)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return {"message": "Senha redefinida com sucesso."}


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "username": current_user.username,
        "role": "admin" if is_admin_user(current_user) else "user",
    }
