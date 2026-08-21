"""
Rotas FastAPI - Modulo NLP (Resumo + Questoes MCQ).

Endpoints:
  POST /api/nlp/analisar-documento -> PDF -> resumo + questoes MCQ estruturadas
  POST /api/nlp/analisar           -> texto -> resumo + questoes MCQ estruturadas
"""

import logging
import os
import shutil
import tempfile
import urllib.parse
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
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


def _resolve_servico(request: Request) -> ServicoAnaliseNLP:
    override = request.app.dependency_overrides.get(_get_servico)
    if override:
        return override()
    return _get_servico()


def _file_url_to_path(file_url: str) -> str:
    parsed = urllib.parse.urlparse(file_url)
    if parsed.scheme not in {"", "http", "https"} or not parsed.path.startswith("/uploads/"):
        raise ValueError("Apenas arquivos enviados pelo Cognora podem ser processados.")

    filename = os.path.basename(urllib.parse.unquote(parsed.path))
    if not filename.lower().endswith(".pdf"):
        raise ValueError("O arquivo informado precisa ser um PDF.")

    upload_root = os.path.realpath(settings.upload_dir)
    local_path = os.path.realpath(os.path.join(upload_root, filename))
    if os.path.commonpath((upload_root, local_path)) != upload_root:
        raise ValueError("Caminho de arquivo invalido.")
    if not os.path.isfile(local_path):
        raise FileNotFoundError(f"Arquivo local nao encontrado: {filename}")

    descriptor, temporary_path = tempfile.mkstemp(suffix=".pdf")
    os.close(descriptor)
    shutil.copyfile(local_path, temporary_path)
    return temporary_path


def _record_limit_event(db: Session, user_email: str, exc: HTTPException, source: str) -> None:
    record_system_event(
        db,
        level="warning",
        event_type="nlp_generation_limit_reached",
        user_email=user_email,
        message="Geracao bloqueada por limite do plano.",
        metadata={"status_code": exc.status_code, "detail": exc.detail, "source": source},
    )


def _normalize_operation(operation: str) -> str:
    operation = (operation or "summary").strip().lower()
    if operation not in {"summary", "questions", "flashcards"}:
        raise HTTPException(status_code=400, detail="Operação de IA inválida.")
    return operation


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
    request: Request,
    body: AnalisarDocumentoRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> AnalisarDocumentoResponse:
    from domain.use_cases.limits import check_pdf_generation_limit, refund_ai_usage, reserve_ai_usage

    reservation = None
    operation = _normalize_operation(body.operation)
    try:
        if body.document_id:
            check_pdf_generation_limit(
                current_user.email,
                db,
                document_id=body.document_id,
                action=operation,
            )
        reservation = reserve_ai_usage(
            current_user.email,
            db,
            usage_type=operation,
        )
    except HTTPException as exc:
        _record_limit_event(db, current_user.email, exc, "document")
        raise

    logger.info("POST /api/nlp/analisar-documento - url: %s", body.file_url)

    try:
        filepath = _file_url_to_path(body.file_url)
    except ValueError as exc:
        refund_ai_usage(reservation, db)
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError as exc:
        refund_ai_usage(reservation, db)
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
        refund_ai_usage(reservation, db)
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
        refund_ai_usage(reservation, db)
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
        except FileNotFoundError:
            logger.debug("Arquivo temporario ja removido: %s", filepath)

    try:
        servico = _resolve_servico(request)
        resultado = await servico.analisar(
            texto,
            n_perguntas=body.question_count,
            question_type=body.question_type,
        )
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
        refund_ai_usage(reservation, db)
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
        refund_ai_usage(reservation, db)
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
    except HTTPException:
        refund_ai_usage(reservation, db)
        raise
    except Exception as exc:
        refund_ai_usage(reservation, db)
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
    request: Request,
    body: AnalisarTextoRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> AnalisarTextoResponse:
    from domain.use_cases.limits import refund_ai_usage, reserve_ai_usage

    reservation = None
    operation = _normalize_operation(body.operation)
    try:
        reservation = reserve_ai_usage(
            current_user.email,
            db,
            usage_type=operation,
        )
    except HTTPException as exc:
        _record_limit_event(db, current_user.email, exc, "text")
        raise

    logger.info("POST /api/nlp/analisar - texto com %d chars.", len(body.texto))
    try:
        servico = _resolve_servico(request)
        resultado = await servico.analisar(
            body.texto,
            n_perguntas=body.question_count,
            question_type=body.question_type,
        )
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
        refund_ai_usage(reservation, db)
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
        refund_ai_usage(reservation, db)
        record_system_event(
            db,
            level="error",
            event_type="ai_generation_failed",
            user_email=current_user.email,
            message="Falha na geracao de conteudo por IA.",
            metadata={"reason": str(exc), "source": "text", "question_type": body.question_type},
        )
        raise HTTPException(status_code=500, detail=str(exc))
    except HTTPException:
        refund_ai_usage(reservation, db)
        raise
    except Exception as exc:
        refund_ai_usage(reservation, db)
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
