# Cognora V1 - Sprints de Implementacao do Dashboard

Data de referencia: 2026-06-04

Este documento organiza a implementacao da V1 do dashboard com uma premissa central:

```text
Validar o ciclo de estudo o mais cedo possivel.
```

Fluxo que precisa ser validado:

```text
Usuario entra
  -> ve o que estudar
  -> clica em Comecar Estudo
  -> responde questoes
  -> conclui sessao
  -> recebe progresso
  -> volta amanha
```

## Regra de priorizacao

Nao priorizar nesta fase:

- Metricas que nao influenciam diretamente a sessao de estudo.
- Graficos.
- Funcionalidades administrativas.
- Gamificacao avancada.
- Otimizacoes futuras.

Priorizar apenas o que ajuda o usuario a iniciar, concluir e repetir uma sessao de estudo.

## Sprint 1 - Hoje no Cognora

Objetivo:

Reorganizar o dashboard para que a primeira coisa que o usuario veja seja o bloco `Hoje no Cognora`.

Valor entregue ao usuario:

O usuario entende imediatamente que existe um plano de estudo, mesmo antes da sessao completa estar implementada.

Dependencias:

- Dados ja existentes de materias.
- Dados ja existentes de questoes.
- `UserProgress` para streak/XP quando disponivel.
- Dashboard atual.

Escopo:

- Criar bloco principal `Hoje no Cognora`.
- Exibir quantidade de questoes recomendadas.
- Exibir streak atual, se existir.
- Exibir tempo estimado simples.
- Exibir botao principal `Comecar Estudo`.
- Rebaixar documentos recentes para area secundaria.
- Criar area `Suas Materias` em versao inicial.

Criterio de aceite:

Ao entrar no dashboard, o usuario ve primeiro:

```text
Hoje no Cognora
questoes recomendadas
sequencia
tempo estimado
[Comecar Estudo]
```

Documentos recentes, graficos e indicadores secundarios nao competem visualmente com o bloco principal.

## Sprint 2 - Estrutura de StudySession

Objetivo:

Criar a estrutura minima para registrar uma sessao de estudo.

Valor entregue ao usuario:

O Cognora passa a conseguir lembrar que o usuario iniciou, concluiu ou abandonou uma sessao.

Dependencias:

- Usuario autenticado.
- Banco/modelos do backend.
- API de entidades ou rotas especificas para sessao.

Escopo:

- Criar entidade/tabela `StudySession`.
- Registrar `IN_PROGRESS`, `COMPLETED` e `ABANDONED`.
- Registrar `started_at`, `completed_at` e `abandoned_at`.
- Registrar materias planejadas.
- Registrar questoes planejadas e respondidas.
- Criar endpoint ou fluxo de entidade para iniciar sessao.
- Criar endpoint ou fluxo de entidade para concluir sessao.

Criterio de aceite:

Ao clicar em `Comecar Estudo`, uma sessao `IN_PROGRESS` e criada e associada ao usuario.

Uma sessao pode ser marcada como `COMPLETED`.

Uma sessao `IN_PROGRESS` com mais de 24 horas sem conclusao pode ser marcada como `ABANDONED`.

## Sprint 3 - Botao Comecar Estudo

Objetivo:

Fazer o botao `Comecar Estudo` montar uma sessao real usando questoes existentes.

Valor entregue ao usuario:

O usuario clica uma vez e recebe uma sessao pronta, sem montar plano manualmente.

Dependencias:

- Sprint 1.
- Sprint 2.
- Questoes existentes no sistema.
- Materias existentes no sistema.

Escopo:

- Selecionar no maximo 2 materias.
- Priorizar materias com questoes disponiveis enquanto revisao real ainda nao existe.
- Montar ate 10 questoes no total.
- Distribuir questoes entre materias selecionadas.
- Redirecionar ou abrir a experiencia de sessao.

Criterio de aceite:

Ao clicar em `Comecar Estudo`, o sistema cria uma sessao `IN_PROGRESS` com questoes planejadas.

O usuario ve quais questoes/materias fazem parte da sessao.

Se nao houver questoes disponiveis, o dashboard mostra uma chamada clara para gerar questoes a partir de uma materia/documento.

## Sprint 4 - Fluxo Completo de Sessao

Objetivo:

Permitir que o usuario responda questoes dentro da sessao e conclua o ciclo principal.

Valor entregue ao usuario:

O usuario deixa de apenas ver recomendacoes e passa a estudar de verdade dentro do fluxo da V1.

Dependencias:

- Sprint 2.
- Sprint 3.
- Componente existente de questoes ou adaptacao do fluxo atual de quiz/perguntas.

Escopo:

- Exibir questoes planejadas da sessao.
- Registrar respostas.
- Contabilizar questoes respondidas.
- Concluir sessao quando cumprir:
  - 10 questoes respondidas; ou
  - todas as questoes disponiveis, se houver menos de 10; ou
  - 1 revisao + 5 questoes quando revisao entrar na sprint seguinte.
- Mostrar tela de conclusao simples.
- Registrar progresso basico da sessao.

Criterio de aceite:

Um usuario consegue:

```text
Entrar no dashboard
  -> clicar em Comecar Estudo
  -> responder questoes
  -> concluir sessao
  -> ver feedback de conclusao
```

Esse fluxo funciona antes de qualquer grafico, ranking ou metrica avancada.

## Sprint 5 - Revisoes por Materia

Objetivo:

Adicionar revisao real por materia ao fluxo de sessao.

Valor entregue ao usuario:

O usuario passa a ter motivo concreto para voltar amanha: revisoes pendentes por materia.

Dependencias:

- Sprint 2.
- Sprint 4.
- Estrutura de materias.

Escopo:

- Criar dados de revisao por materia.
- Revisao nasce ao concluir uma sessao que incluiu a materia.
- Aplicar intervalos:
  - Stage 1 = +1 dia.
  - Stage 2 = +7 dias.
  - Stage 3 = +21 dias.
  - Stage 4+ = +30 dias.
- Atualizar `last_studied_at`.
- Atualizar `next_review_at`.
- Mostrar revisoes para hoje e atrasadas no bloco `Hoje no Cognora`.
- Usar revisao como prioridade principal para montar sessoes.

Criterio de aceite:

Ao concluir uma sessao de uma materia, essa materia recebe proxima revisao.

No dia da revisao, o dashboard mostra a pendencia.

`Comecar Estudo` prioriza materia com revisao atrasada ou para hoje.

## Sprint 6 - Metricas por Materia

Objetivo:

Mostrar progresso simples por materia, apenas com dados que ajudam a sessao.

Valor entregue ao usuario:

O usuario entende o estado das materias e por que o Cognora esta sugerindo determinada sessao.

Dependencias:

- Sprint 4.
- Sprint 5.
- Tentativas de questoes.
- Materias e documentos existentes.

Escopo:

- Mostrar quantidade de PDFs por materia.
- Mostrar questoes respondidas por materia.
- Mostrar taxa de acerto por materia.
- Mostrar ultima data de estudo.
- Mostrar proxima revisao.
- Mostrar status:
  - Em dia.
  - Revisao hoje.
  - Atrasada.
  - Sem questoes.
  - Comece enviando conteudo.

Criterio de aceite:

A area `Suas Materias` mostra progresso basico e status de revisao de cada materia.

Essas metricas explicam ou melhoram a escolha da sessao. Nenhum grafico complexo entra nesta sprint.

## Sprint 7 - XP, Streak e Analytics Essenciais

Objetivo:

Conectar progresso e analytics basicos ao comportamento real de estudo.

Valor entregue ao usuario:

O usuario recebe reconhecimento ao concluir sessoes e enxerga continuidade.

Dependencias:

- Sprint 4.
- Sprint 5.
- `UserProgress`.

Escopo:

- Atualizar streak apenas ao concluir sessao.
- Conceder XP por sessao concluida.
- Registrar sessoes concluidas por usuario por semana.
- Registrar sessoes abandonadas.
- Exibir streak no bloco `Hoje no Cognora`.
- Exibir feedback simples de conclusao.

Criterio de aceite:

Login, upload ou geracao de IA nao aumentam streak.

Uma sessao concluida no dia conta como dia ativo de estudo.

A North Star `sessoes concluidas por usuario por semana` pode ser calculada.

## Sprint 8 - Polimento Final

Objetivo:

Melhorar a experiencia sem adicionar complexidade de produto.

Valor entregue ao usuario:

O fluxo fica mais claro, mais agradavel e mais resiliente para usuarios novos e antigos.

Dependencias:

- Sprints 1 a 7.

Escopo:

- Estados vazios:
  - sem materia;
  - materia sem PDF;
  - materia sem questoes;
  - usuario sem sessoes.
- Tempo estimado da sessao.
- Responsividade mobile/desktop.
- Melhorias visuais no bloco `Hoje no Cognora`.
- Ajustes de copy.
- Testes do fluxo principal.

Criterio de aceite:

Usuario novo e usuario com conteudo conseguem entender o proximo passo.

O fluxo principal permanece simples:

```text
ver plano
  -> comecar estudo
  -> responder
  -> concluir
  -> ver progresso
```

## Itens adiados

Mover para depois da validacao do ciclo principal:

- Graficos avancados.
- Mapa de fraquezas.
- Ranking como foco do dashboard.
- Configurador manual de sessao.
- Novos modos de competicao.
- Expansoes de IA.
- Area administrativa de analytics.

