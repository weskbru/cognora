import os
import uuid

from fastapi import APIRouter, Depends, File, Request, UploadFile
from sqlalchemy.orm import Session

from api.dependencies import get_current_user
from core.config.settings import settings
from infrastructure.database.connection import get_db
from infrastructure.database.models import User

router = APIRouter(prefix="/api", tags=["upload"])


def _public_upload_url(request: Request, filename: str) -> str:
    base_url = str(request.base_url).rstrip("/")
    return f"{base_url}/uploads/{filename}"


@router.post("/upload")
def upload_file(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from domain.use_cases.limits import check_upload_size

    data = file.file.read()
    check_upload_size(current_user.email, len(data), db)

    ext = os.path.splitext(file.filename or "")[1] or ".pdf"
    filename = f"{uuid.uuid4()}{ext}"

    os.makedirs(settings.upload_dir, exist_ok=True)
    path = os.path.join(settings.upload_dir, filename)
    with open(path, "wb") as output:
        output.write(data)

    return {"file_url": _public_upload_url(request, filename)}
