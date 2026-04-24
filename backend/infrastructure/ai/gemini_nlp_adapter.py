import json
import logging
import random
from openai import AsyncOpenAI
from pydantic import BaseModel, Field
from core.config.settings import settings

logger = logging.getLogger(__name__)

_PROMPT_TEMPLATE = """
Você é um especialista em educação para concursos públicos. Analise o texto abaixo e responda SOMENTE com um JSON válido, sem markdown, sem explicações adicionais.

O JSON deve ter exatamente esta estrutura:
{{
  "resumo": "resumo estruturado aqui",
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

━━━ REGRAS PARA O CAMPO "resumo" ━━━

O resumo deve ser formatado em Markdown estruturado em 3 níveis:

## 1. Visão Geral
- Uma linha descrevendo o tema central do texto
- Contexto e relevância do assunto

## 2. Tópicos Principais
Para cada tema identificado, use o formato:
### [Nome do Tema]
- **Conceito-chave**: definição objetiva (máx. 1 linha)
- **Ponto importante**: informação direta e concisa
(máximo 5 bullet points por subtópico, sem redundância)

## 3. Pontos-Chave para Memorização
- Liste os 5 a 8 fatos mais importantes para prova
- Use **negrito** nas palavras-chave
- Máx. 1 linha por item

---
**Resumo Ultra Curto (3–5 linhas)**
Síntese do conteúdo em linguagem direta, estilo revisão rápida.

━━━ REGRAS GERAIS ━━━
- Use bullet points, NUNCA parágrafos longos
- Destaque termos técnicos com **negrito**
- Linguagem direta, objetiva, sem introduções ou conclusões prolixas
- Sem repetição de informações entre seções
- Ideal para leitura rápida e revisão de véspera

━━━ REGRAS PARA "perguntas" ━━━
- Gere exatamente {n_perguntas} questões de múltipla escolha
- Questões objetivas, no estilo de concurso público

━━━ REGRAS PARA "flashcards" ━━━
- Gere exatamente 10 flashcards com os conceitos mais importantes
- "front": termo, conceito ou pergunta objetiva
- "back": definição ou resposta direta (máx. 2 linhas)

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
        if not settings.nvidia_api_key and not settings.gemini_api_key and not settings.openrouter_api_key:
            raise ValueError("Configure NVIDIA_API_KEY, GEMINI_API_KEY ou OPENROUTER_API_KEY.")

        # (client, model) — NVIDIA primeiro, Gemini segundo, OpenRouter fallback
        self._candidates: list[tuple[AsyncOpenAI, str]] = []

        if settings.nvidia_api_key:
            nvidia = AsyncOpenAI(
                base_url="https://integrate.api.nvidia.com/v1",
                api_key=settings.nvidia_api_key,
            )
            for model in (
                "meta/llama-3.3-70b-instruct",
                "nvidia/llama-3.1-nemotron-70b-instruct",
                "meta/llama-3.1-70b-instruct",
                "mistralai/mixtral-8x7b-instruct-v0.1",
            ):
                self._candidates.append((nvidia, model))

        if settings.gemini_api_key:
            gemini = AsyncOpenAI(
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                api_key=settings.gemini_api_key,
            )
            for model in ("gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b"):
                self._candidates.append((gemini, model))

        if settings.openrouter_api_key:
            openrouter = AsyncOpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=settings.openrouter_api_key,
            )
            for model in (
                "google/gemma-3-27b-it:free",
                "google/gemma-3-12b-it:free",
                "google/gemma-3-4b-it:free",
                "meta-llama/llama-3.3-70b-instruct:free",
                "nvidia/nemotron-3-super-120b-a12b:free",
                "z-ai/glm-4.5-air:free",
            ):
                self._candidates.append((openrouter, model))

    async def analisar(self, texto: str, n_perguntas: int = 5) -> ResultadoGeminiNLP:
        if not texto or not texto.strip():
            raise ValueError("Texto vazio.")

        prompt = _PROMPT_TEMPLATE.format(
            n_perguntas=n_perguntas,
            texto=texto[:30_000],
        )

        falhas: list[str] = []
        for client, model in self._candidates:
            try:
                logger.info("Tentando modelo: %s", model)
                response = await client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                )

                raw = (response.choices[0].message.content or "").strip()
                if not raw:
                    falhas.append(f"{model}: resposta vazia")
                    continue

                if raw.startswith("```"):
                    raw = raw.split("```")[1]
                    if raw.lower().startswith("json"):
                        raw = raw[4:]
                    raw = raw.strip()

                data = json.loads(raw)
                resultado = ResultadoGeminiNLP.model_validate(data)
                for pergunta in resultado.perguntas:
                    random.shuffle(pergunta.alternatives)
                logger.info("Sucesso com modelo: %s", model)
                return resultado

            except json.JSONDecodeError as exc:
                motivo = "resposta fora do formato JSON esperado"
                logger.warning("Modelo %s — %s: %s", model, motivo, exc)
                falhas.append(f"{model}: {motivo}")
                continue
            except Exception as exc:
                erro = str(exc)
                logger.warning("Modelo %s falhou — %s: %s", model, type(exc).__name__, erro)
                if "401" in erro or "authentication" in erro.lower():
                    motivo = "chave de API inválida ou sem permissão"
                elif "403" in erro or "permission" in erro.lower() or "forbidden" in erro.lower():
                    motivo = "acesso negado — verifique se a API está ativada no Google Cloud"
                elif "429" in erro or "rate" in erro.lower() or "quota" in erro.lower() or "exhausted" in erro.lower():
                    motivo = "limite de requisições atingido"
                elif "503" in erro or "unavailable" in erro.lower():
                    motivo = "modelo temporariamente indisponível"
                elif "404" in erro:
                    motivo = "modelo não encontrado"
                else:
                    motivo = erro
                falhas.append(f"{model}: {motivo}")
                continue

        resumo_falhas = "; ".join(falhas) if falhas else "motivo desconhecido"
        raise RuntimeError(
            f"Nenhum modelo de IA conseguiu processar o documento. "
            f"Detalhes: {resumo_falhas}"
        )
