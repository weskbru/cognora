import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, DateTime, Date, JSON, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from infrastructure.database.connection import Base


class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    username = Column(String, unique=True, nullable=True, index=True)
    hashed_password = Column(String, nullable=True)   # nullable para login Google sem senha
    google_id = Column(String, unique=True, nullable=True, index=True)
    role = Column(String, default="user", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_email = Column(String, nullable=False, index=True)
    token = Column(String, nullable=False, unique=True, index=True)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)


class Subject(Base):
    __tablename__ = "subjects"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    description = Column(Text)
    owner_email = Column(String, nullable=True, index=True)
    created_date = Column(DateTime, default=datetime.utcnow)


class Document(Base):
    __tablename__ = "documents"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    file_url = Column(String)
    status = Column(String, default="pending")
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True)
    created_date = Column(DateTime, default=datetime.utcnow)


class AIGenerationJob(Base):
    __tablename__ = "ai_generation_jobs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_email = Column(String, nullable=False, index=True)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    operation = Column(String, nullable=False, index=True)
    status = Column(String, nullable=False, default="queued", index=True)
    question_type = Column(String, nullable=False, default="multiple_choice")
    question_count = Column(Integer, nullable=False, default=5)
    result = Column(JSON, default=dict)
    error_code = Column(String, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)


class StudyPath(Base):
    __tablename__ = "study_paths"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_email = Column(String, nullable=False, index=True)
    objective = Column(Text, nullable=False)
    target_date = Column(Date, nullable=True)
    weeks_count = Column(Integer, nullable=False)
    hours_per_week = Column(Integer, nullable=False)
    title = Column(String, nullable=True)
    overview = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="queued", index=True)
    weeks = Column(JSON, default=list)
    completed_milestones = Column(JSON, default=list)
    error_code = Column(String, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


class Question(Base):
    __tablename__ = "questions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    statement = Column(Text, nullable=False)
    type = Column(String)
    difficulty = Column(String)
    alternatives = Column(JSON)   # [{text, correct}]
    correct_answer = Column(Text)
    explanation = Column(Text)
    owner_email = Column(String, nullable=True, index=True)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True, index=True)
    created_date = Column(DateTime, default=datetime.utcnow)


class Summary(Base):
    __tablename__ = "summaries"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content = Column(Text)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=True, index=True)
    created_date = Column(DateTime, default=datetime.utcnow)


class Competition(Base):
    __tablename__ = "competitions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    mode = Column(String)
    status = Column(String, default="waiting")
    host_email = Column(String, index=True)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True)
    participants = Column(JSON, default=list)
    questions_data = Column(JSON, default=list)
    question_ids = Column(JSON, default=list)
    question_count = Column(Integer, default=5)
    time_limit_seconds = Column(Integer)
    invite_code = Column(String, unique=True)
    winner_email = Column(String, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    week_start = Column(Date, nullable=True)
    week_end = Column(Date, nullable=True)
    created_date = Column(DateTime, default=datetime.utcnow)


class Flashcard(Base):
    __tablename__ = "flashcards"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    front = Column(Text, nullable=False)
    back = Column(Text, nullable=False)
    owner_email = Column(String, nullable=True, index=True)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=True, index=True)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True)
    created_date = Column(DateTime, default=datetime.utcnow)


class QuestionAttempt(Base):
    __tablename__ = "question_attempts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id = Column(String, nullable=False)
    user_email = Column(String, nullable=False, index=True)
    is_correct = Column(Boolean, nullable=False)
    created_date = Column(DateTime, default=datetime.utcnow)


class StudySession(Base):
    __tablename__ = "study_sessions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_email = Column(String, nullable=False, index=True)
    status = Column(String, default="IN_PROGRESS", nullable=False, index=True)
    subjects = Column(JSON, default=list)
    questions_planned = Column(JSON, default=list)
    questions_answered = Column(JSON, default=list)
    reviews_planned = Column(JSON, default=list)
    reviews_completed = Column(JSON, default=list)
    xp_awarded = Column(Integer, default=0)
    started_at = Column(DateTime, default=datetime.utcnow, index=True)
    completed_at = Column(DateTime, nullable=True)
    abandoned_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class SubjectProgress(Base):
    __tablename__ = "subject_progress"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_email = Column(String, nullable=False, index=True)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    last_studied_at = Column(DateTime, nullable=True)
    next_review_at = Column(DateTime, nullable=True, index=True)
    review_stage = Column(Integer, default=1)
    completed_reviews_count = Column(Integer, default=0)
    accuracy_rate = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class UserProgress(Base):
    __tablename__ = "user_progress"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_email = Column(String, unique=True, nullable=False, index=True)
    xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    streak_days = Column(Integer, default=0)
    last_active_date = Column(Date)
    total_questions_answered = Column(Integer, default=0)
    total_correct_answers = Column(Integer, default=0)
    total_summaries_generated = Column(Integer, default=0)
    total_documents_uploaded = Column(Integer, default=0)
    xp_history = Column(JSON, default=list)
    # Profile
    display_name = Column(String, nullable=True)
    avatar_emoji = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    # Freemium / Subscription
    plan = Column(String, default="free")
    subscription_status = Column(String, default="inactive")
    plan_started_at = Column(DateTime, nullable=True)
    plan_expires_at = Column(DateTime, nullable=True)
    daily_generations_used = Column(Integer, default=0)
    last_generation_date = Column(Date, nullable=True)
    summaries_used_month = Column(Integer, default=0)
    questions_used_month = Column(Integer, default=0)
    flashcards_used_month = Column(Integer, default=0)
    study_paths_used_month = Column(Integer, default=0)
    usage_month = Column(Date, nullable=True)
    stripe_customer_id = Column(String, nullable=True, unique=True)
    stripe_subscription_id = Column(String, nullable=True)


class PixPaymentRequest(Base):
    __tablename__ = "pix_payment_requests"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    user_email = Column(String, nullable=False, index=True)
    user_name = Column(String, nullable=True)
    plan = Column(String, nullable=False)
    amount_cents = Column(Integer, nullable=False)
    pix_reference = Column(String, nullable=False, unique=True, index=True)
    pix_payload = Column(Text, nullable=False)
    status = Column(String, default="pending", nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    paid_at = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    approved_by_admin_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    rejected_at = Column(DateTime, nullable=True)
    admin_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    admin_email = Column(String, nullable=False, index=True)
    action = Column(String, nullable=False, index=True)
    target_user_email = Column(String, nullable=True, index=True)
    target_type = Column(String, nullable=False)
    target_id = Column(String, nullable=False)
    metadata_json = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)


class SystemEvent(Base):
    __tablename__ = "system_events"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    level = Column(String, nullable=False, index=True)
    event_type = Column(String, nullable=False, index=True)
    user_email = Column(String, nullable=True, index=True)
    request_id = Column(String, nullable=True, index=True)
    message = Column(Text, nullable=False)
    metadata_json = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class ObservabilityAlertState(Base):
    __tablename__ = "observability_alert_states"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alert_key = Column(String, nullable=False, unique=True, index=True)
    last_sent_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
