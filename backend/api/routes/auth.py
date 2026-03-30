from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from infrastructure.database.connection import get_db
from infrastructure.repositories.user import UserRepository
from domain.use_cases.auth import AuthUseCases
from domain.use_cases.limits import apply_daily_bonus, get_status
from api.schemas.auth import AuthPayload
from api.dependencies import get_current_user
from infrastructure.database.models import User

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _use_cases(db: Session = Depends(get_db)) -> AuthUseCases:
    return AuthUseCases(UserRepository(db))


@router.post("/register", status_code=201)
def register(payload: AuthPayload, uc: AuthUseCases = Depends(_use_cases), db: Session = Depends(get_db)):
    result, error = uc.register(payload.email, payload.password)
    if error:
        raise HTTPException(status_code=400, detail=error)
    apply_daily_bonus(payload.email, db)
    status = get_status(payload.email, db)
    result["generations_remaining"] = status["remaining"]
    return result


@router.post("/login")
def login(payload: AuthPayload, uc: AuthUseCases = Depends(_use_cases), db: Session = Depends(get_db)):
    result, error = uc.login(payload.email, payload.password)
    if error:
        raise HTTPException(status_code=401, detail=error)
    apply_daily_bonus(payload.email, db)
    status = get_status(payload.email, db)
    result["generations_remaining"] = status["remaining"]
    result["has_daily_bonus"] = status["has_daily_bonus"]
    return result


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {"id": str(current_user.id), "email": current_user.email}
