"""
Caso de uso: Geração de Perguntas.

Orquestra as regras de negócio para geração automática de perguntas:
- Validação de entrada
- Garantia de mínimo de perguntas geradas
- Desduplicação (delegada ao adapter)
- Tratamento de erros de domínio
"""

import logging
from infrastructure.ai.huggingface_adapter import HuggingFaceAdapter

logger = logging.getLogger(__name__)

_MINIMO_PERGUNTAS = 3
_LIMITE_CHARS = 100_000


class ServicoGeracaoPerguntas:
    """
    Serviço de domínio responsável pela geração de perguntas inteligentes.

    Garante que o resultado contenha ao menos `_MINIMO_PERGUNTAS` perguntas
    únicas e relacionadas ao conteúdo fornecido.
    """

    def __init__(self, adapter: HuggingFaceAdapter) -> None:
        self._adapter = adapter

    def gerar_perguntas(self, texto: str) -> list[str]:
        """
        Gera perguntas baseadas no conteúdo do texto.

        Args:
            texto: Conteúdo textual base para geração das perguntas.

        Returns:
            Lista com pelo menos 3 perguntas únicas.

        Raises:
            ValueError: Texto inválido ou modelo não gerou perguntas suficientes.
            RuntimeError: Falha no processamento pelo modelo.
        """
        texto = (texto or "").strip()
        if not texto:
            raise ValueError("Texto não pode ser vazio.")
        if len(texto) > _LIMITE_CHARS:
            raise ValueError(
                f"Texto excede o limite de {_LIMITE_CHARS:,} caracteres."
            )

        logger.info("Iniciando geração de perguntas. Tamanho: %d chars.", len(texto))
        try:
            perguntas = self._adapter.gerar_perguntas(texto)
        except RuntimeError:
            raise
        except Exception as exc:
            logger.exception("Erro inesperado na geração de perguntas.")
            raise RuntimeError(f"Falha ao gerar perguntas: {exc}") from exc

        if len(perguntas) < _MINIMO_PERGUNTAS:
            logger.warning(
                "Modelo gerou apenas %d pergunta(s); retornando mesmo abaixo do mínimo (%d).",
                len(perguntas),
                _MINIMO_PERGUNTAS,
            )

        logger.info("%d pergunta(s) gerada(s) com sucesso.", len(perguntas))
        return perguntas
