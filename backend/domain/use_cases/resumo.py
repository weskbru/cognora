"""
Caso de uso: Geração de Resumo.

Orquestra as regras de negócio para resumo de texto:
- Validação de entrada
- Limite de tamanho (delega chunking ao adapter)
- Tratamento de erros de domínio

Depende da interface do HuggingFaceAdapter mas NÃO importa Transformers diretamente.
"""

import logging
from infrastructure.ai.huggingface_adapter import HuggingFaceAdapter

logger = logging.getLogger(__name__)

# Limite de caracteres aceito como entrada (proteção contra textos absurdamente grandes)
_LIMITE_CHARS = 100_000


class ServicoResumo:
    """
    Serviço de domínio responsável pela geração de resumos textuais.

    Recebe o adapter como dependência (injeção), facilitando testes
    com mocks sem alterar a lógica de negócio.
    """

    def __init__(self, adapter: HuggingFaceAdapter) -> None:
        self._adapter = adapter

    def gerar_resumo(self, texto: str) -> str:
        """
        Gera um resumo automático do texto fornecido.

        Args:
            texto: Conteúdo textual extraído de um PDF ou outra fonte.

        Returns:
            Texto resumido como string.

        Raises:
            ValueError: Texto inválido (vazio ou excede limite).
            RuntimeError: Falha no processamento pelo modelo.
        """
        texto = (texto or "").strip()
        if not texto:
            raise ValueError("Texto não pode ser vazio.")
        if len(texto) > _LIMITE_CHARS:
            raise ValueError(
                f"Texto excede o limite de {_LIMITE_CHARS:,} caracteres. "
                "Divida o conteúdo em partes menores."
            )

        logger.info("Iniciando geração de resumo. Tamanho: %d chars.", len(texto))
        try:
            resumo = self._adapter.resumir(texto)
            logger.info("Resumo gerado com sucesso. Tamanho: %d chars.", len(resumo))
            return resumo
        except RuntimeError:
            raise
        except Exception as exc:
            logger.exception("Erro inesperado na geração de resumo.")
            raise RuntimeError(f"Falha ao gerar resumo: {exc}") from exc
