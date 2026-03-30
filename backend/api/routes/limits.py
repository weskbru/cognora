from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from infrastructure.database.connection import get_db
from api.dependencies import get_current_user
from infrastructure.database.models import User
from domain.use_cases.limits import get_status

router = APIRouter(prefix="/api/limits", tags=["limits"])


@router.get("/status")
def limits_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna o status atual de limites do usuário (gerações, matérias, documentos)."""
    return get_status(current_user.email, db)
