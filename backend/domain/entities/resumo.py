"""
Entidade de domínio: ResultadoAnalise.

Representa o resultado combinado de resumo + perguntas geradas a partir
de um texto. Objeto Python puro — sem dependências de ORM ou framework.
"""

from dataclasses import dataclass, field


@dataclass
class ResultadoAnalise:
    """
    Saída estruturada do módulo de NLP.

    Attributes:
        resumo:    Texto resumido gerado pelo modelo de sumarização.
        perguntas: Lista de perguntas geradas a partir do conteúdo.
    """

    resumo: str
    perguntas: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "resumo": self.resumo,
            "perguntas": self.perguntas,
        }
