"""
Rotas FastAPI — Módulo NLP (Resumo + Questões MCQ via Gemini 2.0 Flash).

Endpoints:
  POST /api/nlp/analisar-documento → PDF → resumo + questões MCQ estruturadas
  POST /api/nlp/analisar           → texto → resumo + questões MCQ estruturadas
"""

import logging
import os
import urllib.parse
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from infrastructure.database.connection import get_db

from api.dependencies import get_current_user
from api.schemas.resumo import (
    AnalisarDocumentoRequest,
    AnalisarDocumentoResponse,
    AnalisarTextoRequest,
    AnalisarTextoResponse,
)
from core.config.settings import settings
from domain.use_cases.analise_nlp import ServicoAnaliseNLP, criar_servico_analise_nlp
from infrastructure.ai.pdf_extractor import extrair_texto_pdf
from infrastructure.database.models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/nlp", tags=["nlp"])


def _get_servico() -> ServicoAnaliseNLP:
    try:
        return criar_servico_analise_nlp()
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


def _file_url_to_path(file_url: str) -> str:
    import tempfile
    import httpx

    try:
        r = httpx.get(file_url, follow_redirects=True, timeout=30)
    except Exception as exc:
        raise FileNotFoundError(f"Erro ao baixar arquivo: {exc}")

    if r.status_code != 200:
        raise FileNotFoundError(f"Arquivo não encontrado na URL (status {r.status_code})")

    ext = os.path.splitext(urllib.parse.urlparse(file_url).path)[1] or ".pdf"
    tmp = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
    tmp.write(r.content)
    tmp.close()
    return tmp.name


@router.post(
    "/analisar-documento",
    # response_model removido: o FastAPI infere pelo "-> AnalisarDocumentoResponse"
    summary="PDF → Resumo + Questões MCQ",
    description="Extrai texto do PDF e gera resumo + questões de múltipla escolha via Gemini 2.0 Flash.",
    # Respostas de erro documentadas no Swagger UI (SonarLint S8415)
    responses={
        404: {"description": "Arquivo PDF não encontrado."},
        422: {"description": "Erro na extração do texto ou retorno inválido da IA."},
        500: {"description": "Erro interno do servidor ao processar a requisição."},
    },
)
async def analisar_documento(
    body: AnalisarDocumentoRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    servico: Annotated[ServicoAnaliseNLP, Depends(_get_servico)],
    db: Session = Depends(get_db),
) -> AnalisarDocumentoResponse:
    # FASE DE TESTES: limite de gerações desabilitado temporariamente
    # from domain.use_cases.limits import check_and_consume
    # check_and_consume(current_user.email, db)

    logger.info("POST /api/nlp/analisar-documento — url: %s", body.file_url)

    try:
        filepath = _file_url_to_path(body.file_url)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=f"Não foi possível acessar o arquivo PDF. Verifique se o upload foi concluído. Detalhe: {exc}",
        )

    try:
        texto = extrair_texto_pdf(filepath)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=422, detail=f"Erro ao ler o PDF: {exc}")
    finally:
        try:
            os.unlink(filepath)
        except Exception:
            pass

    try:
        resultado = await servico.analisar(texto, question_type=body.question_type)
        return AnalisarDocumentoResponse(**resultado.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except RuntimeError as exc:
        logger.error("Falha na geração de conteúdo IA: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        logger.exception("Erro inesperado em /api/nlp/analisar-documento")
        raise HTTPException(status_code=500, detail=f"Erro inesperado ao processar documento: {exc}")


@router.post(
    "/analisar",
    # response_model removido
    summary="Texto → Resumo + Questões MCQ",
    description="Gera resumo e questões de múltipla escolha a partir de texto puro.",
    # Documentação de erros
    responses={
        422: {"description": "Conteúdo textual inválido ou retorno mal formatado da IA."},
        500: {"description": "Erro interno no servidor ao se comunicar com o OpenRouter."},
    },
)
async def analisar(
    body: AnalisarTextoRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    servico: Annotated[ServicoAnaliseNLP, Depends(_get_servico)],
    db: Session = Depends(get_db),
) -> AnalisarTextoResponse:
    # FASE DE TESTES: limite de gerações desabilitado temporariamente
    # from domain.use_cases.limits import check_and_consume
    # check_and_consume(current_user.email, db)

    logger.info("POST /api/nlp/analisar — texto com %d chars.", len(body.texto))
    try:
        resultado = await servico.analisar(body.texto, question_type=body.question_type)
        return AnalisarTextoResponse(**resultado.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        logger.exception("Erro inesperado em /api/nlp/analisar")
        raise HTTPException(status_code=500, detail=f"Erro interno: {exc}")