import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from api.dependencies import get_current_user
from core.config.settings import settings
from infrastructure.database.connection import get_db
from infrastructure.database.models import User
from infrastructure.observability import record_system_event

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

    original_name = file.filename or "arquivo.pdf"
    try:
        data = file.file.read()
        check_upload_size(current_user.email, len(data), db)

        ext = os.path.splitext(original_name)[1] or ".pdf"
        filename = f"{uuid.uuid4()}{ext}"

        os.makedirs(settings.upload_dir, exist_ok=True)
        path = os.path.join(settings.upload_dir, filename)
        with open(path, "wb") as output:
            output.write(data)

        record_system_event(
            db,
            level="info",
            event_type="upload_success",
            user_email=current_user.email,
            message="Upload concluido com sucesso.",
            metadata={"filename": original_name, "size_bytes": len(data), "content_type": file.content_type},
        )
        return {"file_url": _public_upload_url(request, filename)}
    except HTTPException as exc:
        record_system_event(
            db,
            level="warning" if exc.status_code < 500 else "error",
            event_type="upload_failed",
            user_email=current_user.email,
            message="Falha no upload.",
            metadata={
                "filename": original_name,
                "status_code": exc.status_code,
                "detail": exc.detail,
                "content_type": file.content_type,
            },
        )
        raise
    except Exception as exc:
        record_system_event(
            db,
            level="error",
            event_type="upload_failed",
            user_email=current_user.email,
            message="Erro inesperado no upload.",
            metadata={"filename": original_name, "error": str(exc), "content_type": file.content_type},
        )
        raise
