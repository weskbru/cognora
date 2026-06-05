# Prompt para o Codex

Crie um novo documento chamado:

future-bank-style-questions.md

Objetivo do documento:

Registrar uma visão futura para o Cognora relacionada à geração de questões no estilo de bancas de concurso, sem impactar o roadmap atual da V1.

Importante:

Este documento não representa trabalho imediato.

Trata-se apenas de uma área de pesquisa e possível evolução futura do produto.

O documento deve conter as seções abaixo.

---

# Contexto

Hoje o Cognora já consegue:

* Receber PDFs.
* Gerar resumos.
* Gerar flashcards.
* Gerar questões usando IA.

Porém, existe uma oportunidade futura:

Permitir que o usuário escolha uma banca específica para que as questões geradas sigam o padrão daquela banca.

Exemplos:

* CEBRASPE
* FGV
* FCC
* VUNESP
* AOCP
* IBFC

---

# Problema

As questões geradas atualmente seguem um padrão genérico.

Para estudantes de concurso, o formato da banca faz diferença.

Exemplos:

CEBRASPE:

* Certo ou Errado.
* Pegadinhas conceituais.
* Afirmações julgáveis.
* Linguagem objetiva.

FGV:

* Alternativas.
* Interpretação.
* Casos práticos.

FCC:

* Questões mais diretas.
* Forte cobrança conceitual.

---

# Visão Futura

O usuário poderia selecionar:

Gerar questões no estilo:

* CEBRASPE
* FGV
* FCC
* VUNESP
* AOCP

A IA utilizaria o conteúdo do PDF como fonte, mas seguiria o formato e comportamento da banca escolhida.

Objetivo:

Aumentar a aderência ao estudo para concursos.

---

# Estratégia Recomendada

Não treinar modelo próprio neste momento.

Motivos:

* Alto custo.
* Complexidade operacional.
* Necessidade de infraestrutura.
* Necessidade de dataset validado.
* Pouco retorno para estágio atual do produto.

Recomendação:

Utilizar engenharia de prompts e perfis de banca.

Exemplo:

Perfil CEBRASPE

* Questões de Certo ou Errado.
* Linguagem objetiva.
* Pegadinhas conceituais.
* Explicação do gabarito.

Perfil FGV

* Questões de múltipla escolha.
* Casos práticos.
* Alternativas elaboradas.

---

# Roadmap de Evolução

## Fase 1

Questões por estilo de banca usando prompts.

Sem treinamento de IA.

Apenas templates especializados.

---

## Fase 2

Biblioteca de perfis de banca.

Cada banca possui:

* formato;
* tamanho do enunciado;
* estilo de cobrança;
* padrão de resposta.

---

## Fase 3

Validação automática de qualidade.

A própria IA avalia:

* aderência ao PDF;
* clareza;
* ausência de ambiguidade;
* compatibilidade com a banca.

---

## Fase 4

Somente após validação de mercado.

Avaliar:

* fine-tuning;
* modelos especializados;
* datasets próprios.

---

# Restrições

Não copiar bancos de questões pagos.

Não reproduzir materiais protegidos por terceiros.

As questões geradas devem ser originais e baseadas no conteúdo estudado pelo usuário.

---

# Decisão Atual

Esta funcionalidade não faz parte da V1.

Prioridade atual:

* Dashboard de aprendizado.
* Sessão de estudo.
* Revisão por matéria.
* Retenção.
* Hábito de estudo.

Somente após validação dessas etapas o Cognora deve investir em geração de questões por banca.

---

# Resumo Executivo

A oportunidade não é treinar uma IA própria para concursos.

A oportunidade é gerar questões originais baseadas no PDF do usuário seguindo o estilo da banca escolhida.

Esta abordagem possui menor custo, menor risco e maior alinhamento com a proposta do Cognora.
