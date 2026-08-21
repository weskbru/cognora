from fastapi import APIRouter, Depends, Response
from sqlalchemy import or_, text
from sqlalchemy.orm import Session

from api.dependencies import get_current_user
from api.routes.entities import row_to_dict
from domain.use_cases.limits import get_status
from infrastructure.database.connection import get_db
from infrastructure.database.models import (
    Document,
    Question,
    QuestionAttempt,
    StudySession,
    Subject,
    SubjectProgress,
    Summary,
    User,
    UserProgress,
)


router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


_POSTGRES_SNAPSHOT_SQL = text("""
WITH owned_subjects AS (
    SELECT * FROM subjects WHERE owner_email = :email
), owned_documents AS (
    SELECT d.* FROM documents d
    WHERE d.subject_id IN (SELECT id FROM owned_subjects)
), owned_questions AS (
    SELECT q.* FROM questions q
    WHERE q.owner_email = :email
       OR q.subject_id IN (SELECT id FROM owned_subjects)
       OR q.document_id IN (SELECT id FROM owned_documents)
)
SELECT
    COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.created_date DESC) FROM owned_subjects s), '[]'::jsonb) AS subjects,
    COALESCE((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.created_date DESC) FROM owned_documents d), '[]'::jsonb) AS documents,
    COALESCE((SELECT jsonb_agg(to_jsonb(q) ORDER BY q.created_date DESC) FROM owned_questions q), '[]'::jsonb) AS questions,
    COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.created_date DESC) FROM summaries s WHERE s.document_id IN (SELECT id FROM owned_documents)), '[]'::jsonb) AS summaries,
    COALESCE((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.created_date DESC) FROM question_attempts a WHERE a.user_email = :email), '[]'::jsonb) AS attempts,
    COALESCE((SELECT jsonb_agg(to_jsonb(sp) ORDER BY sp.created_at DESC) FROM subject_progress sp WHERE sp.user_email = :email), '[]'::jsonb) AS subject_progress,
    COALESCE((SELECT jsonb_agg(to_jsonb(ss) ORDER BY ss.created_at DESC) FROM study_sessions ss WHERE ss.user_email = :email AND ss.status = 'COMPLETED'), '[]'::jsonb) AS completed_sessions,
    (SELECT jsonb_build_object(
        'id', up.id,
        'user_email', up.user_email,
        'xp', COALESCE(up.xp, 0),
        'level', COALESCE(up.level, 1),
        'streak_days', COALESCE(up.streak_days, 0),
        'display_name', up.display_name,
        'avatar_emoji', up.avatar_emoji,
        'avatar_url', up.avatar_url
    ) FROM user_progress up WHERE up.user_email = :email LIMIT 1) AS user_progress
""")


def _postgres_snapshot(db: Session, email: str) -> dict:
    return dict(db.execute(_POSTGRES_SNAPSHOT_SQL, {"email": email}).mappings().one())


def _portable_snapshot(db: Session, email: str) -> dict:
    """Fallback usado pelos testes SQLite e por ambientes não PostgreSQL."""
    subject_ids = db.query(Subject.id).filter(Subject.owner_email == email)
    document_ids = db.query(Document.id).filter(Document.subject_id.in_(subject_ids))

    subjects = db.query(Subject).filter(Subject.owner_email == email).all()
    documents = db.query(Document).filter(Document.subject_id.in_(subject_ids)).order_by(Document.created_date.desc()).all()
    questions = (
        db.query(Question)
        .filter(or_(Question.owner_email == email, Question.subject_id.in_(subject_ids), Question.document_id.in_(document_ids)))
        .order_by(Question.created_date.desc())
        .all()
    )
    summaries = db.query(Summary).filter(Summary.document_id.in_(document_ids)).order_by(Summary.created_date.desc()).all()
    attempts = db.query(QuestionAttempt).filter(QuestionAttempt.user_email == email).all()
    subject_progress = db.query(SubjectProgress).filter(SubjectProgress.user_email == email).all()
    completed_sessions = db.query(StudySession).filter(StudySession.user_email == email, StudySession.status == "COMPLETED").all()
    progress = db.query(UserProgress).filter(UserProgress.user_email == email).first()
    return {
        "subjects": [row_to_dict(row) for row in subjects],
        "documents": [row_to_dict(row) for row in documents],
        "questions": [row_to_dict(row) for row in questions],
        "summaries": [row_to_dict(row) for row in summaries],
        "attempts": [row_to_dict(row) for row in attempts],
        "subject_progress": [row_to_dict(row) for row in subject_progress],
        "completed_sessions": [row_to_dict(row) for row in completed_sessions],
        "user_progress": {
            "id": str(progress.id),
            "user_email": progress.user_email,
            "xp": progress.xp or 0,
            "level": progress.level or 1,
            "streak_days": progress.streak_days or 0,
            "display_name": progress.display_name,
            "avatar_emoji": progress.avatar_emoji,
            "avatar_url": progress.avatar_url,
        } if progress else None,
    }


@router.get("")
def dashboard_snapshot(
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna em uma viagem os dados privados necessários ao dashboard."""
    email = current_user.email
    limits = get_status(email, db)
    snapshot = _postgres_snapshot(db, email) if db.bind and db.bind.dialect.name == "postgresql" else _portable_snapshot(db, email)

    # O navegador mantém o snapshot apenas na memória via React Query.
    response.headers["Cache-Control"] = "private, no-store"
    return {**snapshot, "limits": limits}
