"""
Schemas Pydantic para o módulo de NLP (resumo + perguntas estruturadas).
"""

from pydantic import BaseModel, Field


# ── Schemas de entrada ────────────────────────────────────────────────────────

class AnalisarTextoRequest(BaseModel):
    texto: str = Field(..., min_length=50, description="Texto extraído do documento para análise.")
    question_type: str = Field(default="multiple_choice", description="'multiple_choice' ou 'true_false'")
    operation: str = Field(default="summary", description="'summary', 'questions' ou 'flashcards'")
    question_count: int = Field(default=5, description="Quantidade de questões: 3, 5 ou 10")


class AnalisarDocumentoRequest(BaseModel):
    file_url: str = Field(..., description="URL do arquivo PDF já enviado ao servidor.")
    question_type: str = Field(default="multiple_choice", description="'multiple_choice' ou 'true_false'")
    document_id: str | None = Field(default=None, description="ID do documento associado ao PDF.")
    operation: str = Field(default="summary", description="'summary', 'questions' ou 'flashcards'")
    question_count: int = Field(default=5, description="Quantidade de questões: 3, 5 ou 10")


# ── Schemas de saída ──────────────────────────────────────────────────────────

class CriarGeracaoDocumentoRequest(BaseModel):
    document_id: str = Field(..., description="ID do documento pertencente ao usuario.")
    operation: str = Field(default="summary", description="'summary', 'questions' ou 'flashcards'")
    question_type: str = Field(default="multiple_choice", description="'multiple_choice' ou 'true_false'")
    question_count: int = Field(default=5, ge=1, le=10)


class GeracaoDocumentoJobResponse(BaseModel):
    id: str
    document_id: str
    operation: str
    status: str
    result: dict = Field(default_factory=dict)
    error_code: str | None = None
    error_message: str | None = None
    plan: str | None = None
    subscription_status: str | None = None


class AlternativaSchema(BaseModel):
    text: str
    correct: bool


class PerguntaGeradaSchema(BaseModel):
    statement: str
    type: str = Field(description="'multiple_choice' ou 'true_false'")
    alternatives: list[AlternativaSchema]
    difficulty: str = Field(description="'easy', 'medium' ou 'hard'")
    explanation: str


class FlashcardSchema(BaseModel):
    front: str
    back: str


class AnalisarTextoResponse(BaseModel):
    resumo: str
    perguntas: list[PerguntaGeradaSchema]
    flashcards: list[FlashcardSchema] = Field(default_factory=list)


class AnalisarDocumentoResponse(BaseModel):
    resumo: str
    perguntas: list[PerguntaGeradaSchema]
    flashcards: list[FlashcardSchema] = Field(default_factory=list)
