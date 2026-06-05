# Cognora V1 - Documento de Consulta

Data de referencia: 2026-06-04

Este documento serve como base de consulta para decisoes de produto da V1 do Cognora. Ele organiza o posicionamento, os objetivos, o escopo e os criterios de decisao para evitar que a plataforma cresca apenas adicionando recursos de IA sem fortalecer a continuidade do aprendizado.

## Objetivo executivo da V1

Objetivo da V1: transformar o Cognora de uma plataforma de geracao de conteudo para uma plataforma de rotina diaria de estudo.

Se uma funcionalidade nao contribuir para esse objetivo, ela fica fora da V1.

Missao da V1:

```text
Ao abrir o Cognora, o usuario nao precisa pensar. Ele apenas estuda.
```

## North Star

A metrica principal da V1 deve medir habito real de estudo, nao volume de conteudo gerado.

North Star recomendada:

```text
Sessoes de estudo concluidas por usuario por semana.
```

Metrica complementar:

```text
Dias ativos de estudo por usuario.
```

O Cognora nao deve otimizar primariamente para PDFs enviados, resumos gerados, flashcards criados ou XP acumulado. Essas metricas podem ser acompanhadas, mas sao secundarias.

O sinal de sucesso da V1 e o usuario voltar, iniciar uma sessao e concluir uma rotina de estudo. Toda decisao futura deve aumentar, proteger ou explicar a North Star.

## Metricas CEO

Na V1, as metricas mais importantes para avaliar o produto sao:

1. D1 Retention: usuarios que voltam no dia seguinte.
2. Sessoes concluidas: o usuario estudou hoje, sim ou nao.
3. Streak: dias consecutivos de estudo.

Metricas como PDFs enviados, resumos gerados, flashcards criados, competicoes jogadas, graficos vistos ou XP acumulado devem ser tratadas como metricas auxiliares.

## Tese central

Ferramentas como ChatGPT, NotebookLM e ChatPDF ja executam bem tarefas como resumir PDFs, explicar conteudos, gerar questoes, criar flashcards e responder duvidas.

Essas funcionalidades estao se tornando commodities.

O problema principal nao esta mais na geracao de conteudo. O problema esta na continuidade do aprendizado.

## Oportunidade

O estudante nao precisa apenas de respostas. Ele precisa de organizacao, disciplina, revisao, acompanhamento e evolucao mensuravel.

Hoje, ferramentas generalistas conseguem ajudar manualmente, mas nao mantem automaticamente:

- Historico de estudos.
- Evolucao por materia.
- Questoes respondidas.
- Revisoes pendentes.
- Ranking entre usuarios.
- Planejamento continuo.

O Cognora deve ocupar esse espaco: transformar conteudo gerado por IA em uma rotina diaria de aprendizado com progresso visivel.

## Posicionamento

O Cognora nao deve ser tratado como uma ferramenta de IA para PDFs.

O Cognora e uma plataforma de aprendizado baseada em documentos.

Fluxo principal da V1:

```text
Materia
  -> PDFs
  -> Resumos
  -> Questoes
  -> Revisoes
  -> Pontuacao
  -> Ranking
```

O objetivo nao e gerar conteudo. O objetivo e criar retencao, ritmo de estudo e progresso mensuravel.

Na V1, o produto deve ser orientado por uma acao principal:

```text
Hoje no Cognora
  -> Comecar estudo
  -> Revisar
  -> Responder
  -> Concluir
  -> Registrar progresso
```

O primeiro botao da plataforma deve ser:

```text
[COMECAR ESTUDO]
```

Esse botao deve ter mais importancia visual do que upload de PDF, nova materia, nova competicao ou qualquer outra acao secundaria.

## Pergunta norteadora

A pergunta fundamental da V1 e:

```text
Por que o usuario voltaria amanha?
```

Respostas fracas:

- Para gerar outro resumo.
- Para subir outro PDF.
- Para testar outro prompt.

Respostas desejadas:

- Tenho revisoes pendentes.
- Tenho questoes para responder.
- Estou disputando posicao no ranking.
- Tenho metas de estudo para cumprir.
- Quero melhorar meu desempenho em uma materia especifica.

Pergunta operacional da interface:

```text
O que eu faco agora?
```

A V1 deve responder essa pergunta melhor do que ChatGPT, NotebookLM e ChatPDF.

## Objetivos da V1

### 1. Hoje no Cognora

Substituir o foco em documentos pelo foco em acao diaria.

O usuario nao acorda querendo ver um dashboard. Ele quer saber o que fazer agora.

O primeiro bloco da experiencia autenticada deve ocupar a maior parte da tela inicial:

```text
Hoje no Cognora

2 revisoes pendentes
15 questoes recomendadas
Sequencia: 7 dias
Tempo estimado: 18 min

[Comecar Estudo]
```

Acabou. Essa deve ser a experiencia principal.

Abaixo disso podem existir informacoes secundarias, mas elas nao devem competir visualmente com o inicio da sessao.

Ao clicar, a plataforma deve montar automaticamente uma sessao curta e guiada:

```text
Sessao de Hoje

Revisoes
  ✓ Revisao Banco de Dados
  ✓ Revisao Redes

Questoes
  □ 10 questoes Banco de Dados
  □ 5 questoes Redes

Sessao concluida
  -> progresso registrado
  -> XP concedido
  -> streak atualizado
```

Os numeros podem ser ajustados depois. O ponto principal e que o usuario nao precise decidir o fluxo.

Indicadores de apoio:

- Revisoes pendentes.
- Revisoes atrasadas.
- Questoes recomendadas.
- Materias sugeridas para hoje.
- Streak.

Criterio de decisao:

Se um item nao ajuda o usuario a comecar ou concluir uma sessao de estudo, ele deve ser secundario.

Sensacao desejada:

- Existe um plano.
- Existe progresso.
- Existe continuidade.

### 2. Sistema de Revisao

Funcionalidade estrutural da V1.

Cada materia deve possuir:

- Ultimo estudo.
- Proxima revisao.
- Historico de revisoes.
- Status das revisoes pendentes, feitas ou atrasadas.

Exemplo:

```text
Materia: Banco de Dados
Ultimo estudo: 04/06
Proximas revisoes:
  - 05/06
  - 12/06
  - 03/07
```

Objetivo:

Criar um motivo real para retorno diario.

Criterio de decisao:

Antes de adicionar uma nova funcionalidade de IA, verificar se ela alimenta o ciclo de revisao ou o acompanhamento de progresso.

### 3. Dashboard de Aprendizado

O dashboard da V1 nao deve ser uma colecao de cards. Ele deve ser a camada visual que sustenta a sessao diaria.

Hierarquia da tela inicial:

1. Hoje no Cognora.
2. Comecar Estudo.
3. Sessao de hoje.
4. Suas materias.
5. Indicadores secundarios.

Indicadores desejados:

- Sessoes concluidas.
- Dias ativos de estudo.
- Materias ativas.
- Revisoes para hoje.
- Questoes pendentes.
- Taxa geral de acerto.
- Streak.
- XP total.
- Nivel atual.
- Posicao no ranking.

Observacao:

XP, nivel e ranking sao combustivel de motivacao. Eles nao sao o objetivo principal do usuario.

O usuario quer passar em uma prova, aprender uma habilidade, evoluir em uma materia ou manter uma rotina. XP apenas reforca esse comportamento.

### Area secundaria: Suas Materias

Abaixo da sessao diaria, a tela inicial deve mostrar as materias como apoio de contexto.

Exemplo:

```text
Suas Materias

Banco de Dados
78% acerto
Proxima revisao amanha

Redes
65% acerto
Revisao hoje

SO
91% acerto
Em dia
```

Essa area nao deve pedir que o usuario monte o proprio plano. Ela apenas mostra progresso e estado das materias.

### 4. Metricas por Materia

Acompanhar desempenho individual por materia.

Exemplo:

```text
Materia: Banco de Dados
PDFs: 14
Questoes respondidas: 321
Taxa de acerto: 78%
Revisoes pendentes: 12
```

Indicadores desejados:

- Total de PDFs.
- Total de questoes geradas.
- Total de questoes respondidas.
- Taxa de acerto.
- Ultimo estudo.
- Proxima revisao.
- Revisoes pendentes.

Objetivo:

Transformar aprendizado em dados mensuraveis.

## Fora da V1: Mapa de Fraquezas

Identificar assuntos com menor desempenho dentro de uma materia.

Exemplo:

```text
Materia: Banco de Dados
JOIN: 95%
DDL: 83%
Normalizacao: 48%
Triggers: 39%
```

Objetivo:

Direcionar o esforco do usuario para os pontos que realmente precisam de estudo.

Decisao de escopo:

O mapa de fraquezas nao entra como prioridade da V1.

Antes dele, o Cognora precisa consolidar:

- Materias.
- Questoes respondidas.
- Taxa de acerto por materia.
- Ultimo estudo.
- Proxima revisao.
- Sessoes de estudo concluidas.

Depois disso, a evolucao natural e:

```text
Materia
  -> Topicos
  -> Subtopicos
  -> Fraquezas
```

Essa evolucao pertence a V2, salvo se surgir uma implementacao muito simples que nao atrapalhe a V1.

## Escopo negativo da V1

A V1 nao deve expandir funcionalidades de IA.

Evitar:

- Mais IA apenas por adicionar IA.
- Mais flashcards apenas por volume.
- Mais tipos de competicao.
- Mais rankings.
- Mais graficos.
- Agentes.
- RAG avancado.
- Novos modelos.
- Chatbots complexos.
- Recursos estilo Notion.
- Recursos estilo Anki.
- Recursos estilo Quizlet.
- Mapa de fraquezas por topico.

Motivo:

Esses recursos podem aumentar complexidade sem melhorar a pergunta central: por que o usuario voltaria amanha?

## Principios de decisao

Use estes principios ao decidir prioridades da V1:

1. Retencao antes de geracao.
2. Comecar Estudo antes de Upload PDF.
3. Sessao diaria antes de dashboard completo.
4. Progresso antes de quantidade de recursos.
5. Revisao antes de novidade.
6. Dados por materia antes de dashboards genericos.
7. Acoes claras antes de telas bonitas.
8. XP como combustivel, nao como objetivo.
9. IA como meio, aprendizado como produto.

## Criterios para aceitar uma funcionalidade na V1

Uma funcionalidade deve entrar na V1 se responder sim para pelo menos uma destas perguntas:

- Ela aumenta a chance do usuario voltar amanha?
- Ela ajuda o usuario a iniciar ou concluir uma sessao de estudo?
- Ela melhora a medicao de progresso por materia?
- Ela ajuda o usuario a revisar no momento certo?
- Ela fortalece a rotina diaria?
- Ela torna o progresso mais claro sem aumentar complexidade?
- Ela responde melhor a pergunta "o que eu faco agora?"

Se a resposta principal for apenas "gera mais conteudo", "mostra mais um grafico" ou "parece interessante", a funcionalidade deve ficar fora da V1.

## Fluxo de produto

Fluxo atual que deve deixar de ser o centro:

```text
PDF
  -> Resumo
  -> Fim
```

Fluxo desejado da V1:

```text
PDF
  -> Resumo
  -> Questoes
  -> Revisao
  -> Sessao diaria
  -> XP
  -> Retorno amanha
```

O Cognora so comeca a sair do mercado de ferramentas de IA quando o usuario sente que existe continuidade depois da geracao.

## Resultado esperado

Ao final da V1, o Cognora deixa de ser percebido como uma plataforma que gera conteudo a partir de PDFs.

Ele passa a ser percebido como uma plataforma que acompanha a evolucao do estudante ao longo do tempo.

A geracao de conteudo vira apenas o meio.

O progresso do usuario passa a ser o produto principal.

## Proximas decisoes em aberto

Estas decisoes devem ser discutidas antes da implementacao detalhada:

- O que conta como "estudar" uma materia?
- Como calcular questoes pendentes?
- Como calcular tempo estimado da sessao?
- Qual e o minimo de dados para exibir "Hoje no Cognora" para um usuario novo?
- O ranking deve ser global, semanal, por turma ou por materia?
- XP deve recompensar principalmente sessao concluida, revisao feita ou desempenho?
- Quais indicadores entram no primeiro "Hoje no Cognora" sem poluir a experiencia?
