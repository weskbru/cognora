import os
import uuid
import logging
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from sqlalchemy.orm import Session
from api.dependencies import get_current_user
from infrastructure.database.connection import get_db
from infrastructure.database.models import User
from core.config.settings import settings
from supabase import create_client

router = APIRouter(prefix="/api", tags=["upload"])

_BUCKET = "cognora-storage"
logger = logging.getLogger(__name__)


def _get_supabase():
    if not settings.supabase_url or not settings.supabase_key:
        raise HTTPException(status_code=503, detail="Supabase não configurado no servidor.")
    return create_client(settings.supabase_url, settings.supabase_key)


@router.post("/upload")
def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from domain.use_cases.limits import check_upload_size
    data = file.file.read()
    check_upload_size(current_user.email, len(data), db)

    ext = os.path.splitext(file.filename or "")[1] or ".pdf"
    filename = f"{uuid.uuid4()}{ext}"

    try:
        supabase = _get_supabase()
        bucket = supabase.storage.from_(_BUCKET)
        bucket.upload(
            filename,
            data,
            {"content-type": file.content_type or "application/pdf"},
        )
        url = bucket.get_public_url(filename)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Falha ao enviar arquivo para o Supabase Storage")
        raise HTTPException(
            status_code=502,
            detail="Falha ao armazenar arquivo. Verifique a configuração do Supabase Storage.",
        )
    return {"file_url": url}
