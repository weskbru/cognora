from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from api.dependencies import get_current_user
from infrastructure.database.models import User
from domain.use_cases.ai import AIUseCases
from core.config.settings import settings
from infrastructure.database.connection import get_db
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/ai", tags=["ai"])


class InvokeLLMRequest(BaseModel):
    prompt: str
    file_urls: list[str]
    response_json_schema: Optional[dict] = None
    operation: str = "summary"
    question_count: int = 5


def _use_cases() -> AIUseCases:
    return AIUseCases(settings.gemini_api_key, settings.upload_dir)


@router.post("/invoke")
def invoke_llm(
    body: InvokeLLMRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    uc: AIUseCases = Depends(_use_cases),
):
    from domain.use_cases.limits import refund_ai_usage, reserve_ai_usage

    reservation = reserve_ai_usage(
        current_user.email,
        db,
        usage_type=body.operation,
    )
    try:
        result = uc.invoke_llm(
            prompt=body.prompt,
            file_urls=body.file_urls,
            response_json_schema=body.response_json_schema or {},
        )
        return result
    except FileNotFoundError as e:
        refund_ai_usage(reservation, db)
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        refund_ai_usage(reservation, db)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        refund_ai_usage(reservation, db)
        raise HTTPException(status_code=500, detail=f"Erro na geração: {str(e)}")
