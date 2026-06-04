import uuid
from datetime import date

import pytest
from fastapi import HTTPException

from domain.use_cases.limits import (
    AIUsageType,
    PLAN_LIMITS,
    PlanType,
    check_competition_limit,
    check_document_limit,
    check_pdf_generation_limit,
    check_subject_limit,
    check_upload_size,
    get_status,
    normalize_plan,
    refund_ai_usage,
    reserve_ai_usage,
)
from infrastructure.database.models import Competition, Document, Flashcard, Question, Subject, Summary, UserProgress


def _email() -> str:
    return f"limits_{uuid.uuid4().hex[:8]}@cognora.com"


def _progress(db, email: str, plan: str = "free", **extra) -> UserProgress:
    progress = UserProgress(user_email=email, plan=plan, **extra)
    db.add(progress)
    db.commit()
    db.refresh(progress)
    return progress


def _subject(db, email: str) -> Subject:
    subject = Subject(name="Materia", owner_email=email)
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


def _document(db, subject: Subject, name: str = "doc.pdf") -> Document:
    document = Document(name=name, subject_id=subject.id)
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


class TestPlanStatus:
    def test_novo_usuario_free_tem_limites_finais(self, db):
        status = get_status(_email(), db)

        assert status["plan"] == "free"
        assert status["limits"]["maxSubjects"] == 3
        assert status["limits"]["maxPdfsPerSubject"] == 1
        assert status["limits"]["maxTotalPdfs"] == 3
        assert status["limits"]["maxUploadSizeMb"] == 5
        assert status["monthly_summaries"]["limit"] == 5
        assert status["monthly_questions"]["limit"] == 5
        assert status["monthly_flashcards"]["limit"] == 5

    @pytest.mark.parametrize(
        ("plan", "expected"),
        [
            ("free", PlanType.FREE),
            ("pro", PlanType.PRO),
            ("premium", PlanType.PREMIUM),
            ("unlimited", PlanType.PREMIUM),
            ("desconhecido", PlanType.FREE),
        ],
    )
    def test_normaliza_planos(self, plan, expected):
        assert normalize_plan(plan) == expected

    def test_reset_mensal_dos_usos_por_tipo(self, db):
        email = _email()
        _progress(
            db,
            email,
            summaries_used_month=5,
            questions_used_month=5,
            flashcards_used_month=5,
            usage_month=date(2026, 5, 1),
        )

        status = get_status(email, db)

        assert status["monthly_summaries"]["used"] == 0
        assert status["monthly_questions"]["used"] == 0
        assert status["monthly_flashcards"]["used"] == 0


class TestTableLimits:
    @pytest.mark.parametrize(
        ("plan", "subject_limit", "per_subject", "total_docs", "upload_mb", "competitions"),
        [
            ("free", 3, 1, 3, 5, 1),
            ("pro", 10, 2, 20, 25, 5),
            ("premium", 30, 5, 100, 50, 20),
            ("unlimited", 30, 5, 100, 50, 20),
        ],
    )
    def test_tabela_de_limites_por_plano(self, plan, subject_limit, per_subject, total_docs, upload_mb, competitions):
        limits = PLAN_LIMITS[normalize_plan(plan)]

        assert limits.maxSubjects == subject_limit
        assert limits.maxPdfsPerSubject == per_subject
        assert limits.maxTotalPdfs == total_docs
        assert limits.maxUploadSizeMb == upload_mb
        assert limits.maxActiveCompetitions == competitions

    @pytest.mark.parametrize("plan", ["free", "pro", "premium"])
    def test_permite_criar_materia_dentro_do_limite(self, db, plan):
        email = _email()
        _progress(db, email, plan=plan)

        check_subject_limit(email, db)

    @pytest.mark.parametrize(("plan", "limit"), [("free", 3), ("pro", 10), ("premium", 30)])
    def test_bloqueia_materia_acima_do_limite(self, db, plan, limit):
        email = _email()
        _progress(db, email, plan=plan)
        for _ in range(limit):
            db.add(Subject(name="Materia", owner_email=email))
        db.commit()

        with pytest.raises(HTTPException) as exc_info:
            check_subject_limit(email, db)

        assert exc_info.value.status_code == 403
        assert exc_info.value.detail["message"] == "Você atingiu o limite de matérias do seu plano."

    @pytest.mark.parametrize(("plan", "upload_mb"), [("free", 5), ("pro", 25), ("premium", 50)])
    def test_bloqueia_upload_acima_do_limite_do_plano(self, db, plan, upload_mb):
        email = _email()
        _progress(db, email, plan=plan)

        with pytest.raises(HTTPException) as exc_info:
            check_upload_size(email, (upload_mb * 1024 * 1024) + 1, db)

        assert exc_info.value.status_code == 413
        assert exc_info.value.detail["message"] == f"Seu plano permite uploads de até {upload_mb} MB."


class TestDocumentLimits:
    def test_bloqueia_segundo_pdf_na_mesma_materia_free(self, db):
        email = _email()
        _progress(db, email, plan="free")
        subject = _subject(db, email)
        _document(db, subject)

        with pytest.raises(HTTPException) as exc_info:
            check_document_limit(str(subject.id), email, db)

        assert exc_info.value.status_code == 403
        assert exc_info.value.detail["message"] == "Você atingiu o limite de PDFs desta matéria."

    def test_bloqueia_quarto_pdf_total_free(self, db):
        email = _email()
        _progress(db, email, plan="free")
        for index in range(3):
            _document(db, _subject(db, email), f"doc{index}.pdf")
        extra_subject = _subject(db, email)

        with pytest.raises(HTTPException) as exc_info:
            check_document_limit(str(extra_subject.id), email, db)

        assert exc_info.value.status_code == 403
        assert exc_info.value.detail["message"] == "Você atingiu o limite total de PDFs do seu plano."

    def test_pro_permite_segundo_pdf_na_materia_mas_bloqueia_terceiro(self, db):
        email = _email()
        _progress(db, email, plan="pro")
        subject = _subject(db, email)
        _document(db, subject, "doc1.pdf")

        check_document_limit(str(subject.id), email, db)
        _document(db, subject, "doc2.pdf")

        with pytest.raises(HTTPException):
            check_document_limit(str(subject.id), email, db)


class TestAIUsageLimits:
    @pytest.mark.parametrize(
        ("usage_type", "field", "limit", "message"),
        [
            (AIUsageType.SUMMARY, "monthly_summaries", 5, "Você atingiu o limite mensal de resumos do seu plano."),
            (AIUsageType.QUESTIONS, "monthly_questions", 5, "Você atingiu o limite mensal de questões do seu plano."),
            (AIUsageType.FLASHCARDS, "monthly_flashcards", 5, "Você atingiu o limite mensal de flashcards do seu plano."),
        ],
    )
    def test_reserva_um_uso_mensal_por_tipo(self, db, usage_type, field, limit, message):
        email = _email()

        reserve_ai_usage(email, db, usage_type=usage_type)

        status = get_status(email, db)
        assert status[field]["used"] == 1
        assert status[field]["remaining"] == limit - 1

        progress = db.query(UserProgress).filter(UserProgress.user_email == email).first()
        if usage_type == AIUsageType.SUMMARY:
            progress.summaries_used_month = limit
        elif usage_type == AIUsageType.QUESTIONS:
            progress.questions_used_month = limit
        else:
            progress.flashcards_used_month = limit
        db.commit()

        with pytest.raises(HTTPException) as exc_info:
            reserve_ai_usage(email, db, usage_type=usage_type)

        assert exc_info.value.status_code == 403
        assert exc_info.value.detail["message"] == message

    def test_estorna_uso_mensal_quando_operacao_falha(self, db):
        email = _email()
        reservation = reserve_ai_usage(email, db, usage_type=AIUsageType.SUMMARY)

        refund_ai_usage(reservation, db)

        assert get_status(email, db)["monthly_summaries"]["used"] == 0


class TestPdfGenerationLimits:
    @pytest.mark.parametrize(
        ("usage_type", "model", "payload"),
        [
            (AIUsageType.SUMMARY, Summary, {"content": "Resumo"}),
            (AIUsageType.QUESTIONS, Question, {"statement": "Q?"}),
            (AIUsageType.FLASHCARDS, Flashcard, {"front": "F", "back": "B"}),
        ],
    )
    def test_free_bloqueia_segunda_geracao_no_mesmo_pdf(self, db, usage_type, model, payload):
        email = _email()
        _progress(db, email, plan="free")
        document = _document(db, _subject(db, email))
        db.add(model(**payload, document_id=document.id))
        db.commit()

        with pytest.raises(HTTPException) as exc_info:
            check_pdf_generation_limit(email, db, document_id=str(document.id), action=usage_type)

        assert exc_info.value.status_code == 403
        assert exc_info.value.detail["message"] == "No plano gratuito, este PDF já possui essa geração. Faça upgrade para gerar novamente."

    @pytest.mark.parametrize("plan", ["pro", "premium", "unlimited"])
    def test_planos_pagos_nao_bloqueiam_repeticao_por_pdf(self, db, plan):
        email = _email()
        _progress(db, email, plan=plan)
        document = _document(db, _subject(db, email))
        db.add(Summary(content="Resumo", document_id=document.id))
        db.commit()

        check_pdf_generation_limit(email, db, document_id=str(document.id), action=AIUsageType.SUMMARY)


class TestCompetitionLimits:
    @pytest.mark.parametrize(("plan", "limit"), [("free", 1), ("pro", 5), ("premium", 20)])
    def test_bloqueia_competicao_ativa_acima_do_limite(self, db, plan, limit):
        email = _email()
        _progress(db, email, plan=plan)
        for index in range(limit):
            db.add(Competition(title=f"Ativa {index}", host_email=email, status="waiting"))
        db.commit()

        with pytest.raises(HTTPException) as exc_info:
            check_competition_limit(email, db)

        assert exc_info.value.status_code == 403
        assert exc_info.value.detail["message"] == "Você atingiu o limite de competições ativas do seu plano."
