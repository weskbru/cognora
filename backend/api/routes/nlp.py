"""
Rotas FastAPI - Modulo NLP (Resumo + Questoes MCQ).

Endpoints:
  POST /api/nlp/analisar-documento -> PDF -> resumo + questoes MCQ estruturadas
  POST /api/nlp/analisar           -> texto -> resumo + questoes MCQ estruturadas
"""

import asyncio
import logging
import os
import shutil
import tempfile
import urllib.parse
from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session, sessionmaker

from api.dependencies import get_current_user
from api.schemas.resumo import (
    AnalisarDocumentoRequest,
    AnalisarDocumentoResponse,
    AnalisarTextoRequest,
    AnalisarTextoResponse,
    CriarGeracaoDocumentoRequest,
    GeracaoDocumentoJobResponse,
)
from core.config.settings import settings
from domain.use_cases.analise_nlp import ServicoAnaliseNLP, criar_servico_analise_nlp
from infrastructure.ai.pdf_extractor import extrair_texto_pdf
from infrastructure.database.connection import get_db
from infrastructure.database.models import AIGenerationJob, Document, Flashcard, Question, Summary, User, UserProgress
from infrastructure.observability import record_system_event

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/nlp", tags=["nlp"])
_generation_semaphore = asyncio.Semaphore(max(1, settings.ai_generation_max_concurrency))


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


def _job_response(job: AIGenerationJob, db: Session) -> GeracaoDocumentoJobResponse:
    from domain.use_cases.limits import normalize_plan

    progress = db.query(UserProgress).filter(UserProgress.user_email == job.user_email).first()
    return GeracaoDocumentoJobResponse(
        id=str(job.id),
        document_id=str(job.document_id),
        operation=job.operation,
        status=job.status,
        result=job.result or {},
        error_code=job.error_code,
        error_message=job.error_message,
        plan=normalize_plan(progress.plan).value if progress else "free",
        subscription_status=(progress.subscription_status or "inactive") if progress else "inactive",
    )


def _persist_generated_content(
    db: Session,
    job: AIGenerationJob,
    document: Document,
    resultado,
) -> dict:
    if job.operation == "summary":
        summary = db.query(Summary).filter(Summary.document_id == document.id).first()
        if summary:
            summary.content = resultado.resumo
        else:
            db.add(Summary(content=resultado.resumo, document_id=document.id))
        document.status = "completed"
        return {"created_count": 1}

    if job.operation == "questions":
        rows = [
            Question(
                statement=item.statement,
                type=item.type,
                difficulty=item.difficulty,
                alternatives=[alternative.model_dump() for alternative in item.alternatives],
                explanation=item.explanation,
                owner_email=job.user_email,
                subject_id=document.subject_id,
                document_id=document.id,
            )
            for item in resultado.perguntas
        ]
        db.add_all(rows)
        return {"created_count": len(rows)}

    rows = [
        Flashcard(
            front=item.front,
            back=item.back,
            owner_email=job.user_email,
            subject_id=document.subject_id,
            document_id=document.id,
        )
        for item in resultado.flashcards
    ]
    db.add_all(rows)
    return {"created_count": len(rows)}


def _mark_job_failed(
    db: Session,
    job_id: str,
    *,
    user_email: str,
    operation: str,
    code: str,
    message: str,
    reason: str,
) -> None:
    from domain.use_cases.limits import AIUsageReservation, AIUsageType, refund_ai_usage

    db.rollback()
    refund_ai_usage(
        AIUsageReservation(email=user_email, usage_type=AIUsageType(operation)),
        db,
    )
    job = db.query(AIGenerationJob).filter(AIGenerationJob.id == job_id).first()
    if not job:
        return
    job.status = "failed"
    job.error_code = code
    job.error_message = message
    job.completed_at = datetime.utcnow()
    if operation == "summary":
        document = db.query(Document).filter(Document.id == job.document_id).first()
        if document:
            document.status = "error"
    db.commit()
    record_system_event(
        db,
        level="error",
        event_type="ai_generation_job_failed",
        user_email=user_email,
        message="Falha no processamento assincrono de IA.",
        metadata={"job_id": job_id, "operation": operation, "error_code": code, "reason": reason},
    )


def _job_is_stale(job: AIGenerationJob) -> bool:
    reference = job.started_at or job.created_at
    if not reference:
        return False
    return reference <= datetime.utcnow() - timedelta(minutes=max(1, settings.ai_job_stale_minutes))


async def _process_generation_job(
    job_id: str,
    servico: ServicoAnaliseNLP,
    session_factory,
) -> None:
    db = session_factory()
    filepath: str | None = None
    job = db.query(AIGenerationJob).filter(AIGenerationJob.id == job_id).first()
    if not job or job.status != "queued":
        db.close()
        return

    user_email = job.user_email
    operation = job.operation
    try:
        job.status = "processing"
        job.started_at = datetime.utcnow()
        job.updated_at = datetime.utcnow()
        db.commit()

        document = db.query(Document).filter(Document.id == job.document_id).first()
        if not document or not document.file_url:
            raise FileNotFoundError("Documento ou arquivo PDF nao encontrado.")

        filepath = _file_url_to_path(document.file_url)
        texto = await asyncio.to_thread(extrair_texto_pdf, filepath)
        async with _generation_semaphore:
            resultado = await asyncio.wait_for(
                servico.analisar(
                    texto,
                    n_perguntas=job.question_count,
                    question_type=job.question_type,
                ),
                timeout=max(30, settings.ai_generation_timeout_seconds),
            )

        job.result = _persist_generated_content(db, job, document, resultado)
        job.status = "completed"
        job.error_code = None
        job.error_message = None
        job.completed_at = datetime.utcnow()
        job.updated_at = datetime.utcnow()
        db.commit()
        record_system_event(
            db,
            level="info",
            event_type="ai_generation_job_success",
            user_email=user_email,
            message="Geracao de IA concluida e persistida.",
            metadata={"job_id": job_id, "operation": operation, **(job.result or {})},
        )
    except asyncio.TimeoutError as exc:
        _mark_job_failed(
            db,
            job_id,
            user_email=user_email,
            operation=operation,
            code="AI_GENERATION_TIMEOUT",
            message="A geracao demorou mais que o esperado. Seu uso foi estornado; tente novamente.",
            reason=str(exc) or "overall timeout",
        )
    except (FileNotFoundError, ValueError) as exc:
        _mark_job_failed(
            db,
            job_id,
            user_email=user_email,
            operation=operation,
            code="DOCUMENT_PROCESSING_FAILED",
            message="Nao foi possivel ler este PDF. Verifique o arquivo e tente novamente.",
            reason=str(exc),
        )
    except Exception as exc:
        logger.exception("Falha no job de IA %s", job_id)
        _mark_job_failed(
            db,
            job_id,
            user_email=user_email,
            operation=operation,
            code="AI_GENERATION_FAILED",
            message="O servico de IA esta temporariamente indisponivel. Seu uso foi estornado; tente novamente.",
            reason=str(exc),
        )
    finally:
        if filepath:
            try:
                os.unlink(filepath)
            except FileNotFoundError:
                pass
        db.close()


@router.post(
    "/jobs",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=GeracaoDocumentoJobResponse,
)
async def criar_job_geracao_documento(
    request: Request,
    body: CriarGeracaoDocumentoRequest,
    background_tasks: BackgroundTasks,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> GeracaoDocumentoJobResponse:
    from domain.use_cases.limits import (
        check_pdf_generation_limit,
        ensure_document_belongs_to_user,
        refund_ai_usage,
        reserve_ai_usage,
    )

    operation = _normalize_operation(body.operation)
    document = ensure_document_belongs_to_user(body.document_id, current_user.email, db)
    if not document.file_url:
        raise HTTPException(status_code=400, detail="Este documento nao possui um PDF para processar.")

    active_job = (
        db.query(AIGenerationJob)
        .filter(
            AIGenerationJob.user_email == current_user.email,
            AIGenerationJob.document_id == document.id,
            AIGenerationJob.operation == operation,
            AIGenerationJob.status.in_(("queued", "processing")),
        )
        .order_by(AIGenerationJob.created_at.desc())
        .first()
    )
    if active_job:
        if not _job_is_stale(active_job):
            return _job_response(active_job, db)
        _mark_job_failed(
            db,
            str(active_job.id),
            user_email=current_user.email,
            operation=active_job.operation,
            code="AI_JOB_INTERRUPTED",
            message="A geracao anterior foi interrompida. Seu uso foi estornado; tente novamente.",
            reason="stale active job",
        )

    servico = _resolve_servico(request)
    reservation = None
    try:
        check_pdf_generation_limit(
            current_user.email,
            db,
            document_id=body.document_id,
            action=operation,
        )
        reservation = reserve_ai_usage(current_user.email, db, usage_type=operation)
        job = AIGenerationJob(
            user_email=current_user.email,
            document_id=document.id,
            operation=operation,
            status="queued",
            question_type=body.question_type,
            question_count=body.question_count,
        )
        db.add(job)
        if operation == "summary":
            document.status = "processing"
        db.commit()
        db.refresh(job)
    except HTTPException as exc:
        _record_limit_event(db, current_user.email, exc, "document_job")
        raise
    except Exception:
        db.rollback()
        refund_ai_usage(reservation, db)
        raise

    factory = sessionmaker(
        bind=db.get_bind(),
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
    )
    background_tasks.add_task(_process_generation_job, str(job.id), servico, factory)
    record_system_event(
        db,
        level="info",
        event_type="ai_generation_job_queued",
        user_email=current_user.email,
        message="Geracao de IA adicionada a fila.",
        metadata={"job_id": str(job.id), "document_id": body.document_id, "operation": operation},
    )
    return _job_response(job, db)


@router.get("/jobs/{job_id}", response_model=GeracaoDocumentoJobResponse)
def obter_job_geracao_documento(
    job_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> GeracaoDocumentoJobResponse:
    job = (
        db.query(AIGenerationJob)
        .filter(AIGenerationJob.id == job_id, AIGenerationJob.user_email == current_user.email)
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Geracao nao encontrada.")
    if job.status in {"queued", "processing"} and _job_is_stale(job):
        _mark_job_failed(
            db,
            str(job.id),
            user_email=current_user.email,
            operation=job.operation,
            code="AI_JOB_INTERRUPTED",
            message="A geracao foi interrompida. Seu uso foi estornado; tente novamente.",
            reason="stale job polled by user",
        )
        db.refresh(job)
    return _job_response(job, db)


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
