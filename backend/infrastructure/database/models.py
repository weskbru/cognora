import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, DateTime, Date, JSON, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from infrastructure.database.connection import Base


class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


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
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    created_date = Column(DateTime, default=datetime.utcnow)


class Question(Base):
    __tablename__ = "questions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    statement = Column(Text, nullable=False)
    type = Column(String)
    difficulty = Column(String)
    alternatives = Column(JSON)   # [{text, correct}]
    correct_answer = Column(Text)
    explanation = Column(Text)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    created_date = Column(DateTime, default=datetime.utcnow)


class Summary(Base):
    __tablename__ = "summaries"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content = Column(Text)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=True)
    created_date = Column(DateTime, default=datetime.utcnow)


class Competition(Base):
    __tablename__ = "competitions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    mode = Column(String)
    status = Column(String, default="waiting")
    host_email = Column(String)
    participants = Column(JSON, default=list)
    question_count = Column(Integer, default=5)
    time_limit_seconds = Column(Integer)
    invite_code = Column(String, unique=True)
    created_date = Column(DateTime, default=datetime.utcnow)


class Flashcard(Base):
    __tablename__ = "flashcards"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    front = Column(Text, nullable=False)
    back = Column(Text, nullable=False)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=True)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    created_date = Column(DateTime, default=datetime.utcnow)


class QuestionAttempt(Base):
    __tablename__ = "question_attempts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id = Column(String, nullable=False)
    user_email = Column(String, nullable=False, index=True)
    is_correct = Column(Boolean, nullable=False)
    created_date = Column(DateTime, default=datetime.utcnow)


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
    # Freemium
    plan = Column(String, default="free")
    daily_generations_used = Column(Integer, default=0)
    last_generation_date = Column(Date, nullable=True)
