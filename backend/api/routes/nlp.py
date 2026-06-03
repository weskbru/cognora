"""
Rotas FastAPI - Modulo NLP (Resumo + Questoes MCQ).

Endpoints:
  POST /api/nlp/analisar-documento -> PDF -> resumo + questoes MCQ estruturadas
  POST /api/nlp/analisar           -> texto -> resumo + questoes MCQ estruturadas
"""

import logging
import os
import urllib.parse
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

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
from infrastructure.database.connection import get_db
from infrastructure.database.models import User
from infrastructure.observability import record_system_event

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

    parsed = urllib.parse.urlparse(file_url)
    if parsed.path.startswith("/uploads/"):
        filename = os.path.basename(urllib.parse.unquote(parsed.path))
        local_path = os.path.join(settings.upload_dir, filename)
        if not os.path.isfile(local_path):
            raise FileNotFoundError(f"Arquivo local nao encontrado: {filename}")
        ext = os.path.splitext(local_path)[1] or ".pdf"
        tmp = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
        with open(local_path, "rb") as source:
            tmp.write(source.read())
        tmp.close()
        return tmp.name

    try:
        r = httpx.get(file_url, follow_redirects=True, timeout=30)
    except Exception as exc:
        raise FileNotFoundError(f"Erro ao baixar arquivo: {exc}")

    if r.status_code != 200:
        raise FileNotFoundError(f"Arquivo nao encontrado na URL (status {r.status_code})")

    ext = os.path.splitext(parsed.path)[1] or ".pdf"
    tmp = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
    tmp.write(r.content)
    tmp.close()
    return tmp.name


def _record_limit_event(db: Session, user_email: str, exc: HTTPException, source: str) -> None:
    record_system_event(
        db,
        level="warning",
        event_type="nlp_generation_limit_reached",
        user_email=user_email,
        message="Geracao bloqueada por limite do plano.",
        metadata={"status_code": exc.status_code, "detail": exc.detail, "source": source},
    )


@router.post(
    "/analisar-documento",
    summary="PDF -> Resumo + Questoes MCQ",
    description="Extrai texto do PDF e gera resumo + questoes de multipla escolha via IA.",
    responses={
        404: {"description": "Arquivo PDF nao encontrado."},
        422: {"description": "Erro na extracao do texto ou retorno invalido da IA."},
        500: {"description": "Erro interno do servidor ao processar a requisicao."},
    },
)
async def analisar_documento(
    body: AnalisarDocumentoRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    servico: Annotated[ServicoAnaliseNLP, Depends(_get_servico)],
    db: Session = Depends(get_db),
) -> AnalisarDocumentoResponse:
    from domain.use_cases.limits import check_and_consume

    try:
        check_and_consume(current_user.email, db)
    except HTTPException as exc:
        _record_limit_event(db, current_user.email, exc, "document")
        raise

    logger.info("POST /api/nlp/analisar-documento - url: %s", body.file_url)

    try:
        filepath = _file_url_to_path(body.file_url)
    except FileNotFoundError as exc:
        record_system_event(
            db,
            level="warning",
            event_type="nlp_document_file_not_found",
            user_email=current_user.email,
            message="Arquivo do documento nao foi encontrado.",
            metadata={"file_url": body.file_url, "error": str(exc)},
        )
        raise HTTPException(
            status_code=404,
            detail=f"Nao foi possivel acessar o arquivo PDF. Verifique se o upload foi concluido. Detalhe: {exc}",
        )

    try:
        texto = extrair_texto_pdf(filepath)
    except ValueError as exc:
        record_system_event(
            db,
            level="warning",
            event_type="nlp_pdf_extract_failed",
            user_email=current_user.email,
            message="Falha ao extrair texto do PDF.",
            metadata={"reason": str(exc), "source": "document"},
        )
        raise HTTPException(status_code=422, detail=str(exc))
    except RuntimeError as exc:
        record_system_event(
            db,
            level="error",
            event_type="nlp_pdf_extract_failed",
            user_email=current_user.email,
            message="Erro ao ler o PDF.",
            metadata={"reason": str(exc), "source": "document"},
        )
        raise HTTPException(status_code=422, detail=f"Erro ao ler o PDF: {exc}")
    finally:
        try:
            os.unlink(filepath)
        except Exception:
            pass

    try:
        resultado = await servico.analisar(texto, question_type=body.question_type)
        record_system_event(
            db,
            level="info",
            event_type="nlp_document_analysis_success",
            user_email=current_user.email,
            message="Documento analisado com sucesso.",
            metadata={"question_type": body.question_type, "text_length": len(texto)},
        )
        return AnalisarDocumentoResponse(**resultado.model_dump())
    except ValueError as exc:
        record_system_event(
            db,
            level="warning",
            event_type="ai_response_invalid",
            user_email=current_user.email,
            message="Resposta da IA invalida para documento.",
            metadata={"reason": str(exc), "question_type": body.question_type},
        )
        raise HTTPException(status_code=422, detail=str(exc))
    except RuntimeError as exc:
        logger.error("Falha na geracao de conteudo IA: %s", exc)
        record_system_event(
            db,
            level="error",
            event_type="ai_generation_failed",
            user_email=current_user.email,
            message="Falha na geracao de conteudo por IA.",
            metadata={"reason": str(exc), "source": "document", "question_type": body.question_type},
        )
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        logger.exception("Erro inesperado em /api/nlp/analisar-documento")
        record_system_event(
            db,
            level="error",
            event_type="nlp_document_unexpected_error",
            user_email=current_user.email,
            message="Erro inesperado ao processar documento.",
            metadata={"reason": str(exc), "question_type": body.question_type},
        )
        raise HTTPException(status_code=500, detail=f"Erro inesperado ao processar documento: {exc}")


@router.post(
    "/analisar",
    summary="Texto -> Resumo + Questoes MCQ",
    description="Gera resumo e questoes de multipla escolha a partir de texto puro.",
    responses={
        422: {"description": "Conteudo textual invalido ou retorno mal formatado da IA."},
        500: {"description": "Erro interno no servidor ao se comunicar com o provedor de IA."},
    },
)
async def analisar(
    body: AnalisarTextoRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    servico: Annotated[ServicoAnaliseNLP, Depends(_get_servico)],
    db: Session = Depends(get_db),
) -> AnalisarTextoResponse:
    from domain.use_cases.limits import check_and_consume

    try:
        check_and_consume(current_user.email, db)
    except HTTPException as exc:
        _record_limit_event(db, current_user.email, exc, "text")
        raise

    logger.info("POST /api/nlp/analisar - texto com %d chars.", len(body.texto))
    try:
        resultado = await servico.analisar(body.texto, question_type=body.question_type)
        record_system_event(
            db,
            level="info",
            event_type="nlp_text_analysis_success",
            user_email=current_user.email,
            message="Texto analisado com sucesso.",
            metadata={"question_type": body.question_type, "text_length": len(body.texto)},
        )
        return AnalisarTextoResponse(**resultado.model_dump())
    except ValueError as exc:
        record_system_event(
            db,
            level="warning",
            event_type="ai_response_invalid",
            user_email=current_user.email,
            message="Resposta da IA invalida para texto.",
            metadata={"reason": str(exc), "question_type": body.question_type},
        )
        raise HTTPException(status_code=422, detail=str(exc))
    except RuntimeError as exc:
        record_system_event(
            db,
            level="error",
            event_type="ai_generation_failed",
            user_email=current_user.email,
            message="Falha na geracao de conteudo por IA.",
            metadata={"reason": str(exc), "source": "text", "question_type": body.question_type},
        )
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        logger.exception("Erro inesperado em /api/nlp/analisar")
        record_system_event(
            db,
            level="error",
            event_type="nlp_text_unexpected_error",
            user_email=current_user.email,
            message="Erro inesperado ao processar texto.",
            metadata={"reason": str(exc), "question_type": body.question_type},
        )
        raise HTTPException(status_code=500, detail=f"Erro interno: {exc}")
