import os
import uuid
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from api.dependencies import get_current_user
from infrastructure.database.models import User
from core.config.settings import settings
from supabase import create_client

router = APIRouter(prefix="/api", tags=["upload"])

_BUCKET = "documents"


def _get_supabase():
    if not settings.supabase_url or not settings.supabase_key:
        raise HTTPException(status_code=500, detail="Supabase não configurado no servidor.")
    return create_client(settings.supabase_url, settings.supabase_key)


@router.post("/upload")
def upload_file(
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
):
    ext = os.path.splitext(file.filename or "")[1] or ".pdf"
    filename = f"{uuid.uuid4()}{ext}"
    data = file.file.read()

    supabase = _get_supabase()
    supabase.storage.from_(_BUCKET).upload(
        filename,
        data,
        {"content-type": file.content_type or "application/pdf"},
    )
    url = supabase.storage.from_(_BUCKET).get_public_url(filename)
    return {"file_url": url}
