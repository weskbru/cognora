"""
HuggingFace Adapter — encapsula toda integração com a biblioteca Transformers.

Responsabilidades:
- Carregar e cachear pipelines (lazy load / singleton)
- Aplicar chunking para textos maiores que o limite dos modelos
- Expor interface desacoplada: resumir() e gerar_perguntas()

Modelos utilizados:
- Resumo:    facebook/bart-large-cnn  (suporta ~1024 tokens)
- Perguntas: valhalla/t5-base-e2e-qg  (end-to-end question generation)
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ── Constantes de chunking ─────────────────────────────────────────────────────
# BART suporta até 1024 tokens. Texto em português gera ~2-3 subwords por palavra,
# então usamos 400 como limite seguro (≈ 300 palavras por chunk).
_MAX_TOKENS_RESUMO = 400
_MAX_TOKENS_PERGUNTAS = 300
_PALAVRAS_POR_TOKEN = 0.75


# ── Helpers de chunking ────────────────────────────────────────────────────────

def _tokens_estimados(texto: str) -> int:
    """Estimativa rápida de tokens via contagem de palavras."""
    return int(len(texto.split()) / _PALAVRAS_POR_TOKEN)


def _dividir_em_chunks(texto: str, max_tokens: int) -> list[str]:
    """
    Divide o texto em chunks de no máximo `max_tokens` tokens (estimados).
    Preserva palavras inteiras.
    """
    palavras = texto.split()
    max_palavras = int(max_tokens * _PALAVRAS_POR_TOKEN)

    chunks: list[str] = []
    for i in range(0, len(palavras), max_palavras):
        chunk = " ".join(palavras[i : i + max_palavras])
        if chunk.strip():
            chunks.append(chunk)

    return chunks if chunks else [texto]


def _desduplicar(perguntas: list[str]) -> list[str]:
    """Remove perguntas duplicadas mantendo a ordem de inserção."""
    vistas: set[str] = set()
    unicas: list[str] = []
    for p in perguntas:
        chave = p.lower().strip()
        if chave not in vistas:
            vistas.add(chave)
            unicas.append(p)
    return unicas


# ── Adapter (Singleton) ────────────────────────────────────────────────────────

class HuggingFaceAdapter:
    """
    Adapter desacoplado para modelos HuggingFace Transformers.

    Implementa o padrão Singleton para evitar recarregamento dos modelos
    a cada chamada. Os pipelines são inicializados sob demanda (lazy load).

    Preparado para execução assíncrona: os métodos são síncronos mas podem
    ser executados em thread pool via asyncio.to_thread() ou run_in_executor().
    """

    _instance: Optional["HuggingFaceAdapter"] = None
    _pipeline_resumo = None
    _pipeline_perguntas = None

    def __new__(cls) -> "HuggingFaceAdapter":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    # ── Lazy load dos pipelines ────────────────────────────────────────────────

    def _get_pipeline_resumo(self):
        if self._pipeline_resumo is None:
            from transformers import pipeline  # importação adiada para não bloquear a inicialização

            logger.info("Carregando modelo de resumo: facebook/bart-large-cnn")
            self._pipeline_resumo = pipeline(
                "summarization",
                model="facebook/bart-large-cnn",
            )
            logger.info("Modelo de resumo pronto.")
        return self._pipeline_resumo

    def _get_pipeline_perguntas(self):
        if self._pipeline_perguntas is None:
            from transformers import pipeline

            logger.info("Carregando modelo de perguntas: valhalla/t5-base-e2e-qg")
            self._pipeline_perguntas = pipeline(
                "text2text-generation",
                model="valhalla/t5-base-e2e-qg",
            )
            logger.info("Modelo de perguntas pronto.")
        return self._pipeline_perguntas

    # ── Interface pública ──────────────────────────────────────────────────────

    def resumir(self, texto: str) -> str:
        """
        Gera um resumo usando BART-large-CNN.

        Para textos grandes, divide em chunks, resume cada um e combina
        os resultados num meta-resumo final.

        Args:
            texto: Conteúdo textual a ser resumido.

        Returns:
            Texto resumido como string.

        Raises:
            ValueError: Se o texto for vazio.
            RuntimeError: Se o modelo falhar.
        """
        if not texto or not texto.strip():
            raise ValueError("Texto vazio fornecido para resumo.")

        pipe = self._get_pipeline_resumo()
        chunks = _dividir_em_chunks(texto, _MAX_TOKENS_RESUMO)
        logger.info("Resumindo %d chunk(s).", len(chunks))

        resumos_parciais: list[str] = []
        for idx, chunk in enumerate(chunks, start=1):
            logger.debug("Resumindo chunk %d/%d", idx, len(chunks))
            try:
                resultado = pipe(
                    chunk,
                    max_length=200,
                    min_length=30,
                    do_sample=False,
                    truncation=True,
                )
                resumos_parciais.append(resultado[0]["summary_text"])
            except Exception as exc:
                logger.warning("Falha ao resumir chunk %d: %s", idx, exc)
                raise RuntimeError(f"Erro ao resumir chunk {idx}: {exc}") from exc

        if len(resumos_parciais) == 1:
            return resumos_parciais[0]

        # Meta-resumo: combina os resumos parciais
        texto_combinado = " ".join(resumos_parciais)
        if _tokens_estimados(texto_combinado) > _MAX_TOKENS_RESUMO:
            # Limita para não extrapolar o modelo
            max_palavras = int(_MAX_TOKENS_RESUMO * _PALAVRAS_POR_TOKEN)
            texto_combinado = " ".join(texto_combinado.split()[:max_palavras])

        logger.info("Gerando meta-resumo a partir de %d resumos parciais.", len(resumos_parciais))
        resultado_final = pipe(
            texto_combinado,
            max_length=300,
            min_length=50,
            do_sample=False,
            truncation=True,
        )
        return resultado_final[0]["summary_text"]

    def gerar_perguntas(self, texto: str) -> list[str]:
        """
        Gera perguntas a partir de um texto usando T5 (end-to-end QG).

        O modelo valhalla/t5-base-e2e-qg retorna múltiplas perguntas
        separadas por <sep>. Aplica chunking e desduplicação automática.

        Args:
            texto: Conteúdo textual base para as perguntas.

        Returns:
            Lista de perguntas únicas (strings).

        Raises:
            ValueError: Se o texto for vazio.
            RuntimeError: Se o modelo falhar.
        """
        if not texto or not texto.strip():
            raise ValueError("Texto vazio fornecido para geração de perguntas.")

        pipe = self._get_pipeline_perguntas()
        chunks = _dividir_em_chunks(texto, _MAX_TOKENS_PERGUNTAS)
        logger.info("Gerando perguntas de %d chunk(s).", len(chunks))

        todas_perguntas: list[str] = []
        for idx, chunk in enumerate(chunks, start=1):
            logger.debug("Gerando perguntas do chunk %d/%d", idx, len(chunks))
            try:
                resultado = pipe(
                    chunk,
                    max_new_tokens=256,
                    truncation=True,
                    max_length=512,   # limite de input do T5
                )
            except Exception as exc:
                logger.warning("Falha ao gerar perguntas no chunk %d: %s", idx, exc)
                raise RuntimeError(f"Erro ao gerar perguntas no chunk {idx}: {exc}") from exc

            texto_gerado = resultado[0]["generated_text"]
            # O modelo separa perguntas com o token <sep>
            perguntas_chunk = [
                p.strip()
                for p in texto_gerado.split("<sep>")
                if p.strip() and "?" in p
            ]
            todas_perguntas.extend(perguntas_chunk)

        return _desduplicar(todas_perguntas)
