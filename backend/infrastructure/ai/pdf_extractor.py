"""
Extrator de texto de arquivos PDF.
Usa pypdf (sem dependência de API externa).
"""

import logging

logger = logging.getLogger(__name__)


def extrair_texto_pdf(filepath: str) -> str:
    """
    Extrai o texto de todas as páginas de um PDF.

    Args:
        filepath: Caminho absoluto para o arquivo PDF.

    Returns:
        Texto extraído concatenado das páginas.

    Raises:
        FileNotFoundError: Arquivo não existe.
        ValueError: Nenhum texto extraído (ex.: PDF só com imagens).
        RuntimeError: Falha na leitura do PDF.
    """
    try:
        from pypdf import PdfReader
        reader = PdfReader(filepath)
    except ImportError as exc:
        raise RuntimeError("pypdf não instalado. Execute: pip install pypdf") from exc
    except Exception as exc:
        raise RuntimeError(f"Não foi possível ler o PDF: {exc}") from exc

    paginas: list[str] = []
    for i, page in enumerate(reader.pages):
        texto_pagina = page.extract_text() or ""
        if texto_pagina.strip():
            paginas.append(texto_pagina)
        else:
            logger.debug("Página %d sem texto extraível.", i + 1)

    if not paginas:
        raise ValueError(
            "Nenhum texto encontrado no PDF. "
            "O arquivo pode conter apenas imagens (PDF escaneado)."
        )

    texto = "\n".join(paginas)
    logger.info("PDF extraído: %d página(s), %d chars.", len(paginas), len(texto))
    return texto
