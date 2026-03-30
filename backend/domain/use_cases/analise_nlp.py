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

    async def analisar(self, texto: str, n_perguntas: int = 5) -> ResultadoGeminiNLP:
        """
        Gera resumo e questões MCQ estruturadas a partir do texto.

        Args:
            texto: Conteúdo textual (ex.: extraído de um PDF).
            n_perguntas: Quantidade de questões a gerar.

        Returns:
            ResultadoGeminiNLP com resumo e lista de PerguntaGerada.
        """
        logger.info("Executando caso de uso NLP — %d chars, %d questões.", len(texto), n_perguntas)
        
        # O 'await' é crucial aqui pois o Adapter agora usa o AsyncOpenAI
        return await self._adapter.analisar(texto, n_perguntas=n_perguntas)


def criar_servico_analise_nlp() -> ServicoAnaliseNLP:
    """
    Factory: monta o grafo de dependências.
    Seguindo o princípio de inversão de dependência.
    """
    return ServicoAnaliseNLP(adapter=GeminiNLPAdapter())