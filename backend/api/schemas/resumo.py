"""
Schemas Pydantic para o módulo de NLP (resumo + perguntas estruturadas).
"""

from pydantic import BaseModel, Field


# ── Schemas de entrada ────────────────────────────────────────────────────────

class AnalisarTextoRequest(BaseModel):
    texto: str = Field(..., min_length=50, description="Texto extraído do documento para análise.")
    question_type: str = Field(default="multiple_choice", description="'multiple_choice' ou 'true_false'")


class AnalisarDocumentoRequest(BaseModel):
    file_url: str = Field(..., description="URL do arquivo PDF já enviado ao servidor.")
    question_type: str = Field(default="multiple_choice", description="'multiple_choice' ou 'true_false'")


# ── Schemas de saída ──────────────────────────────────────────────────────────

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
