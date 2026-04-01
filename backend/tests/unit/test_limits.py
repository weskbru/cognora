"""
Testes unitários — Regras de negócio do plano Freemium.
Cobre: get_status, check_and_consume, apply_daily_bonus,
       check_subject_limit, check_document_limit
"""
import uuid
from datetime import date, timedelta

import pytest
from fastapi import HTTPException

from domain.use_cases.limits import (
    FREE_DAILY_LIMIT,
    FREE_DOCS_PER_SUBJECT,
    FREE_SUBJECT_LIMIT,
    apply_daily_bonus,
    check_and_consume,
    check_document_limit,
    check_subject_limit,
    get_status,
)
from infrastructure.database.models import Document, Subject, UserProgress


def _email() -> str:
    return f"limits_{uuid.uuid4().hex[:8]}@cognora.com"


class TestGetStatus:
    def test_novo_usuario_tem_valores_padrao(self, db):
        status = get_status(_email(), db)
        assert status["used"] == 0
        assert status["limit"] == FREE_DAILY_LIMIT
        assert status["remaining"] == FREE_DAILY_LIMIT
        assert status["can_generate"] is True
        assert status["plan"] == "free"

    def test_limites_de_materias_e_docs_presentes(self, db):
        status = get_status(_email(), db)
        assert status["subject_limit"] == FREE_SUBJECT_LIMIT
        assert status["docs_per_subject_limit"] == FREE_DOCS_PER_SUBJECT

    def test_remaining_diminui_conforme_uso(self, db):
        email = _email()
        progress = UserProgress(
            user_email=email,
            daily_generations_used=2,
            last_generation_date=date.today(),
        )
        db.add(progress)
        db.commit()

        status = get_status(email, db)
        assert status["used"] == 2
        assert status["remaining"] == FREE_DAILY_LIMIT - 2

    def test_remaining_nao_e_negativo(self, db):
        email = _email()
        progress = UserProgress(
            user_email=email,
            daily_generations_used=FREE_DAILY_LIMIT + 5,
            last_generation_date=date.today(),
        )
        db.add(progress)
        db.commit()

        status = get_status(email, db)
        assert status["remaining"] == 0

    def test_contador_zerado_em_novo_dia(self, db):
        email = _email()
        progress = UserProgress(
            user_email=email,
            daily_generations_used=FREE_DAILY_LIMIT,
            last_generation_date=date.today() - timedelta(days=1),
        )
        db.add(progress)
        db.commit()

        status = get_status(email, db)
        assert status["used"] == 0
        assert status["remaining"] == FREE_DAILY_LIMIT

    def test_usuario_premium_sem_limite(self, db):
        email = _email()
        progress = UserProgress(
            user_email=email,
            plan="premium",
            daily_generations_used=0,
            last_generation_date=date.today(),
        )
        db.add(progress)
        db.commit()

        status = get_status(email, db)
        assert status["limit"] == 9999
        assert status["subject_limit"] is None
        assert status["docs_per_subject_limit"] is None

    def test_bonus_diario_reflete_em_has_daily_bonus(self, db):
        email = _email()
        progress = UserProgress(
            user_email=email,
            last_active_date=date.today(),
        )
        db.add(progress)
        db.commit()

        status = get_status(email, db)
        assert status["has_daily_bonus"] is True

    def test_sem_bonus_quando_nao_logou_hoje(self, db):
        email = _email()
        progress = UserProgress(
            user_email=email,
            last_active_date=date.today() - timedelta(days=1),
        )
        db.add(progress)
        db.commit()

        status = get_status(email, db)
        assert status["has_daily_bonus"] is False


class TestCheckAndConsume:
    def test_incrementa_contador(self, db):
        email = _email()
        check_and_consume(email, db)
        status = get_status(email, db)
        assert status["used"] == 1

    def test_multiplas_chamadas_incrementam_corretamente(self, db):
        email = _email()
        check_and_consume(email, db)
        check_and_consume(email, db)
        status = get_status(email, db)
        assert status["used"] == 2

    def test_levanta_429_ao_atingir_limite(self, db):
        email = _email()
        progress = UserProgress(
            user_email=email,
            daily_generations_used=FREE_DAILY_LIMIT,
            last_generation_date=date.today(),
        )
        db.add(progress)
        db.commit()

        with pytest.raises(HTTPException) as exc_info:
            check_and_consume(email, db)

        assert exc_info.value.status_code == 429
        assert exc_info.value.detail["code"] == "GENERATION_LIMIT_REACHED"
        assert exc_info.value.detail["remaining"] == 0

    def test_usuario_premium_nao_bloqueado(self, db):
        email = _email()
        progress = UserProgress(
            user_email=email,
            plan="premium",
            daily_generations_used=100,
            last_generation_date=date.today(),
        )
        db.add(progress)
        db.commit()

        # Não deve levantar exceção
        check_and_consume(email, db)

    def test_com_bonus_diario_limite_e_base_mais_1(self, db):
        email = _email()
        progress = UserProgress(
            user_email=email,
            daily_generations_used=FREE_DAILY_LIMIT,
            last_generation_date=date.today(),
            last_active_date=date.today(),  # bonus ativo
        )
        db.add(progress)
        db.commit()

        # Com bônus, limite é FREE_DAILY_LIMIT + 1, então não deve bloquear
        check_and_consume(email, db)  # usa a geração extra do bônus


class TestApplyDailyBonus:
    def test_primeiro_login_define_last_active_date(self, db):
        email = _email()
        result = apply_daily_bonus(email, db)
        assert result is True

        progress = db.query(UserProgress).filter(UserProgress.user_email == email).first()
        assert progress.last_active_date == date.today()

    def test_segundo_login_no_mesmo_dia_retorna_false(self, db):
        email = _email()
        apply_daily_bonus(email, db)
        result = apply_daily_bonus(email, db)
        assert result is False

    def test_dia_consecutivo_incrementa_streak(self, db):
        email = _email()
        progress = UserProgress(
            user_email=email,
            last_active_date=date.today() - timedelta(days=1),
            streak_days=3,
        )
        db.add(progress)
        db.commit()

        apply_daily_bonus(email, db)
        db.refresh(progress)
        assert progress.streak_days == 4

    def test_dia_pulado_reseta_streak_para_1(self, db):
        email = _email()
        progress = UserProgress(
            user_email=email,
            last_active_date=date.today() - timedelta(days=2),
            streak_days=10,
        )
        db.add(progress)
        db.commit()

        apply_daily_bonus(email, db)
        db.refresh(progress)
        assert progress.streak_days == 1

    def test_primeiro_login_define_streak_1(self, db):
        email = _email()
        apply_daily_bonus(email, db)

        progress = db.query(UserProgress).filter(UserProgress.user_email == email).first()
        assert progress.streak_days == 1


class TestCheckSubjectLimit:
    def test_permite_abaixo_do_limite(self, db):
        email = _email()
        # Não deve levantar exceção
        check_subject_limit(email, db)

    def test_levanta_403_ao_atingir_limite(self, db):
        email = _email()
        for _ in range(FREE_SUBJECT_LIMIT):
            db.add(Subject(name="Matéria", owner_email=email))
        db.commit()

        with pytest.raises(HTTPException) as exc_info:
            check_subject_limit(email, db)

        assert exc_info.value.status_code == 403
        assert exc_info.value.detail["code"] == "SUBJECT_LIMIT_REACHED"
        assert exc_info.value.detail["limit"] == FREE_SUBJECT_LIMIT

    def test_usuario_premium_nao_bloqueado(self, db):
        email = _email()
        progress = UserProgress(user_email=email, plan="premium")
        db.add(progress)
        for _ in range(FREE_SUBJECT_LIMIT + 5):
            db.add(Subject(name="Matéria Premium", owner_email=email))
        db.commit()

        # Não deve levantar exceção
        check_subject_limit(email, db)


class TestCheckDocumentLimit:
    def _criar_subject(self, db, email):
        subject = Subject(name="Sub", owner_email=email)
        db.add(subject)
        db.commit()
        db.refresh(subject)
        return subject

    def test_permite_abaixo_do_limite(self, db):
        email = _email()
        subject = self._criar_subject(db, email)
        # Não deve levantar exceção
        check_document_limit(str(subject.id), email, db)

    def test_levanta_403_ao_atingir_limite(self, db):
        email = _email()
        subject = self._criar_subject(db, email)
        doc = Document(name="doc.pdf", subject_id=subject.id)
        db.add(doc)
        db.commit()

        with pytest.raises(HTTPException) as exc_info:
            check_document_limit(str(subject.id), email, db)

        assert exc_info.value.status_code == 403
        assert exc_info.value.detail["code"] == "DOCUMENT_LIMIT_REACHED"
        assert exc_info.value.detail["limit"] == FREE_DOCS_PER_SUBJECT

    def test_usuario_premium_nao_bloqueado(self, db):
        email = _email()
        progress = UserProgress(user_email=email, plan="premium")
        db.add(progress)
        subject = self._criar_subject(db, email)
        for _ in range(FREE_DOCS_PER_SUBJECT + 2):
            db.add(Document(name="doc.pdf", subject_id=subject.id))
        db.commit()

        # Não deve levantar exceção
        check_document_limit(str(subject.id), email, db)
