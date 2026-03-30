"""
Entidades de domínio — objetos Python puros, sem dependência de ORM ou framework.
Representam os conceitos centrais do negócio.
"""
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime


@dataclass
class UserEntity:
    id: str
    email: str
    created_at: datetime


@dataclass
class SubjectEntity:
    id: str
    name: str
    description: Optional[str]
    created_date: datetime


@dataclass
class DocumentEntity:
    id: str
    name: str
    file_url: Optional[str]
    status: str  # pending | processing | completed | error
    subject_id: Optional[str]
    created_date: datetime


@dataclass
class QuestionEntity:
    id: str
    text: str
    type: Optional[str]       # multiple_choice | true_false | essay
    difficulty: Optional[str]  # easy | medium | hard
    options: Optional[list]
    correct_answer: Optional[str]
    subject_id: Optional[str]
    document_id: Optional[str]
    created_date: datetime


@dataclass
class SummaryEntity:
    id: str
    content: Optional[str]
    document_id: Optional[str]
    created_date: datetime


@dataclass
class UserProgressEntity:
    id: str
    user_email: str
    xp: int = 0
    level: int = 1
    streak_days: int = 0
    total_questions_answered: int = 0
    total_correct_answers: int = 0
    total_summaries_generated: int = 0
    total_documents_uploaded: int = 0
    xp_history: list = field(default_factory=list)
