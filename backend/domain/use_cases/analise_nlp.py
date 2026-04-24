"""
Caso de uso: Análise NLP via Gemini 2.0 Flash.

Orquestra o GeminiNLPAdapter para produzir resumo + questões MCQ estruturadas
em uma única chamada, com suporte completo a português.
"""

import logging
from infrastructure.ai.gemini_nlp_adapter import GeminiNLPAdapter, ResultadoGeminiNLP

logger = logging.getLogger(__name__)


class ServicoAnaliseNLP:
    """
    Serviço de domínio que delega análise NLP ao GeminiNLPAdapter.
    """

    def __init__(self, adapter: GeminiNLPAdapter) -> None:
        self._adapter = adapter

    async def analisar(self, texto: str, n_perguntas: int = 5, question_type: str = "multiple_choice") -> ResultadoGeminiNLP:
        logger.info("Executando caso de uso NLP — %d chars, %d questões, tipo: %s.", len(texto), n_perguntas, question_type)
        return await self._adapter.analisar(texto, n_perguntas=n_perguntas, question_type=question_type)


def criar_servico_analise_nlp() -> ServicoAnaliseNLP:
    """
    Factory: monta o grafo de dependências.
    Seguindo o princípio de inversão de dependência.
    """
    return ServicoAnaliseNLP(adapter=GeminiNLPAdapter())