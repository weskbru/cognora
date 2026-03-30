import json
import logging
from openai import AsyncOpenAI
from pydantic import BaseModel, Field
from core.config.settings import settings

logger = logging.getLogger(__name__)

_PROMPT_TEMPLATE = """
Você é um especialista em educação. Analise o texto abaixo e responda SOMENTE com um JSON válido, sem markdown, sem explicações.

O JSON deve ter exatamente esta estrutura:
{{
  "resumo": "resumo detalhado aqui",
  "perguntas": [
    {{
      "statement": "pergunta aqui",
      "alternatives": [
        {{"text": "opção A", "correct": true}},
        {{"text": "opção B", "correct": false}},
        {{"text": "opção C", "correct": false}},
        {{"text": "opção D", "correct": false}}
      ],
      "explanation": "explicação da resposta correta"
    }}
  ],
  "flashcards": [
    {{"front": "conceito ou pergunta", "back": "definição ou resposta completa"}}
  ]
}}

Para o campo "resumo": mínimo de 5 parágrafos, cubra todos os tópicos principais, use linguagem didática em português.

Para "perguntas": gere exatamente {n_perguntas} questões de múltipla escolha.

Para "flashcards": gere exatamente 10 flashcards com os conceitos mais importantes do texto.

TEXTO:
{texto}
"""


class FlashcardGerado(BaseModel):
    front: str
    back: str


class AlternativaGerada(BaseModel):
    text: str
    correct: bool


class PerguntaGerada(BaseModel):
    statement: str
    type: str = "multiple_choice"
    alternatives: list[AlternativaGerada]
    difficulty: str = "medium"
    explanation: str = ""


class ResultadoGeminiNLP(BaseModel):
    resumo: str
    perguntas: list[PerguntaGerada] = Field(default_factory=list)
    flashcards: list[FlashcardGerado] = Field(default_factory=list)


class GeminiNLPAdapter:
    def __init__(self) -> None:
        if not settings.openrouter_api_key:
            raise ValueError("OPENROUTER_API_KEY não configurada.")

        self.client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.openrouter_api_key,
        )

    async def analisar(self, texto: str, n_perguntas: int = 5) -> ResultadoGeminiNLP:
        if not texto or not texto.strip():
            raise ValueError("Texto vazio.")

        prompt = _PROMPT_TEMPLATE.format(
            n_perguntas=n_perguntas,
            texto=texto[:30_000],
        )

        _MODELS = [
            "google/gemma-3-27b-it:free",    # Google AI Studio
            "google/gemma-3-12b-it:free",    # Google AI Studio
            "google/gemma-3-4b-it:free",     # Google AI Studio
            "nvidia/nemotron-3-super-120b-a12b:free",  # NVIDIA
            "minimax/minimax-m2.5:free",     # MiniMax
            "stepfun/step-3.5-flash:free",   # StepFun
            "z-ai/glm-4.5-air:free",         # ZhipuAI
            "meta-llama/llama-3.3-70b-instruct:free",  # Venice (fallback)
        ]

        last_exc: Exception = RuntimeError("Nenhum modelo disponível.")
        for model in _MODELS:
            try:
                logger.info("Tentando modelo: %s", model)
                response = await self.client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                )

                raw = response.choices[0].message.content.strip()

                if raw.startswith("```"):
                    raw = raw.split("```")[1]
                    if raw.lower().startswith("json"):
                        raw = raw[4:]
                    raw = raw.strip()

                data = json.loads(raw)
                logger.info("Sucesso com modelo: %s", model)
                return ResultadoGeminiNLP.model_validate(data)

            except json.JSONDecodeError as exc:
                logger.error("JSON inválido do modelo %s: %s", model, exc)
                raise RuntimeError(f"Resposta da IA não é JSON válido: {exc}") from exc
            except Exception as exc:
                logger.warning("Modelo %s falhou (%s), tentando próximo...", model, exc)
                last_exc = exc
                continue

        raise RuntimeError(f"Todos os modelos falharam. Último erro: {last_exc}") from last_exc
