import os
import tempfile
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from api.dependencies import get_current_user
from core.config.settings import settings
from infrastructure.database.connection import get_db
from infrastructure.database.models import Subject, User
from infrastructure.observability import record_system_event

router = APIRouter(prefix="/api", tags=["upload"])

ALLOWED_UPLOAD_EXTENSIONS = {
    ".pdf": {"application/pdf", "application/octet-stream"},
    ".png": {"image/png"},
    ".jpg": {"image/jpeg"},
    ".jpeg": {"image/jpeg"},
    ".webp": {"image/webp"},
}
MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024


def _validated_extension(filename: str, content_type: str | None) -> str:
    extension = os.path.splitext(filename)[1].lower()
    if not extension:
        # Mantem compatibilidade com o fluxo legado de documentos sem extensao.
        extension = ".pdf"
    allowed_types = ALLOWED_UPLOAD_EXTENSIONS.get(extension)
    if not allowed_types or (content_type and content_type not in allowed_types):
        raise HTTPException(
            status_code=415,
            detail={
                "code": "UNSUPPORTED_FILE_TYPE",
                "message": "Envie um arquivo PDF, PNG, JPG ou WEBP.",
            },
        )
    return extension


def _write_upload_atomically(source, filename: str, max_bytes: int, too_large_detail: dict) -> int:
    os.makedirs(settings.upload_dir, exist_ok=True)
    destination = os.path.join(settings.upload_dir, filename)
    descriptor, temporary_path = tempfile.mkstemp(dir=settings.upload_dir, prefix=".upload-")
    total_bytes = 0
    try:
        with os.fdopen(descriptor, "wb") as output:
            while chunk := source.read(1024 * 1024):
                total_bytes += len(chunk)
                if total_bytes > max_bytes:
                    raise HTTPException(status_code=413, detail=too_large_detail)
                output.write(chunk)
        os.replace(temporary_path, destination)
    except Exception:
        try:
            os.unlink(temporary_path)
        except FileNotFoundError:
            pass
        raise
    return total_bytes


def _public_upload_url(request: Request, filename: str) -> str:
    base_url = str(request.base_url).rstrip("/")
    return f"{base_url}/uploads/{filename}"


@router.post("/upload")
def upload_file(
    request: Request,
    file: UploadFile = File(...),
    subject_id: str | None = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from domain.use_cases.limits import check_document_limit

    original_name = file.filename or "arquivo.pdf"
    try:
        ext = _validated_extension(original_name, file.content_type)
        is_pdf = ext == ".pdf"
        if is_pdf:
            if not subject_id:
                raise HTTPException(status_code=400, detail={
                    "code": "SUBJECT_REQUIRED",
                    "message": "Selecione uma matéria para enviar o documento.",
                })
            subject = db.query(Subject).filter(
                Subject.id == subject_id,
                Subject.owner_email == current_user.email,
            ).first()
            if not subject:
                raise HTTPException(status_code=404, detail={
                    "code": "SUBJECT_NOT_FOUND",
                    "message": "Matéria não encontrada.",
                })
            limits = check_document_limit(subject_id, current_user.email, db)
            limit_mb = limits.maxUploadSizeMb
            max_bytes = limit_mb * 1024 * 1024
            too_large_detail = {
                "code": "FILE_TOO_LARGE",
                "message": f"Seu plano permite uploads de at\u00e9 {limit_mb} MB.",
                "limit_mb": limit_mb,
            }
        else:
            max_bytes = MAX_IMAGE_UPLOAD_BYTES
            too_large_detail = {
                "code": "FILE_TOO_LARGE",
                "message": "A imagem deve ter no maximo 5 MB.",
                "limit_mb": 5,
            }

        filename = f"{uuid.uuid4()}{ext}"
        size_bytes = _write_upload_atomically(file.file, filename, max_bytes, too_large_detail)

        record_system_event(
            db,
            level="info",
            event_type="upload_success",
            user_email=current_user.email,
            message="Upload concluido com sucesso.",
            metadata={"filename": original_name, "size_bytes": size_bytes, "content_type": file.content_type},
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
    finally:
        file.file.close()
