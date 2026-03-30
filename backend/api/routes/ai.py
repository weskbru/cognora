from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from api.dependencies import get_current_user
from infrastructure.database.models import User
from domain.use_cases.ai import AIUseCases
from core.config.settings import settings

router = APIRouter(prefix="/api/ai", tags=["ai"])


class InvokeLLMRequest(BaseModel):
    prompt: str
    file_urls: list[str]
    response_json_schema: Optional[dict] = None


def _use_cases() -> AIUseCases:
    return AIUseCases(settings.gemini_api_key, settings.upload_dir)


@router.post("/invoke")
def invoke_llm(
    body: InvokeLLMRequest,
    _: User = Depends(get_current_user),
    uc: AIUseCases = Depends(_use_cases),
):
    try:
        result = uc.invoke_llm(
            prompt=body.prompt,
            file_urls=body.file_urls,
            response_json_schema=body.response_json_schema or {},
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na geração: {str(e)}")
