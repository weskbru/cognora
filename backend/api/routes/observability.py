from typing import Any, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from api.dependencies import get_current_user
from infrastructure.database.connection import get_db
from infrastructure.database.models import User
from infrastructure.observability import record_system_event

router = APIRouter(prefix="/api/observability", tags=["observability"])


class FrontendEventPayload(BaseModel):
    level: Literal["warning", "error"] = "error"
    event_type: Literal[
        "frontend_error",
        "frontend_unhandled_rejection",
        "frontend_api_failure",
    ]
    message: str = Field(min_length=1, max_length=500)
    request_id: str | None = Field(default=None, max_length=80)
    metadata: dict[str, Any] = Field(default_factory=dict)


@router.post("/frontend-events", status_code=201)
def record_frontend_event(
    payload: FrontendEventPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record_system_event(
        db,
        level=payload.level,
        event_type=payload.event_type,
        user_email=current_user.email,
        request_id=payload.request_id,
        message=payload.message,
        metadata={"source": "frontend", **payload.metadata},
    )
    return {"recorded": True}
