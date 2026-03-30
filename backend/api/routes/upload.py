import os
import shutil
import uuid
from fastapi import APIRouter, Depends, File, UploadFile, Request
from api.dependencies import get_current_user
from infrastructure.database.models import User
from core.config.settings import settings

router = APIRouter(prefix="/api", tags=["upload"])

os.makedirs(settings.upload_dir, exist_ok=True)


@router.post("/upload")
def upload_file(
    request: Request,
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
):
    ext = os.path.splitext(file.filename or "")[1] or ".pdf"
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(settings.upload_dir, filename)
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    base = str(request.base_url).rstrip("/")
    return {"file_url": f"{base}/uploads/{filename}"}
