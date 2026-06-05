# Cognora V1 - Dashboard de Aprendizado

Data de referencia: 2026-06-04

Este documento define a organizacao do dashboard da V1. Ele complementa `v1-product-strategy.md` e traduz a estrategia "o usuario nao precisa pensar, ele apenas estuda" em uma tela inicial concreta.

## Regra principal

O dashboard nao deve ser uma pagina de estatisticas.

O dashboard deve responder:

```text
O que eu faco agora?
```

Por isso, a primeira tela autenticada deve priorizar a sessao diaria de estudo, nao documentos, uploads, graficos ou competicoes.

## Revisao por materia

Decisao de produto:

```text
Revisao e atrelada a materia, nao ao PDF.
```

Motivo:

Um usuario pode ter muitos PDFs dentro de uma mesma materia. Se a revisao for por PDF, o sistema vira uma lista grande de pendencias fragmentadas. Se a revisao for por materia, o Cognora consegue montar um plano de estudo simples e continuo.

Exemplo:

```text
Materia: Banco de Dados
PDFs: 20
Ultimo estudo: 04/06
Proxima revisao: 05/06
Status: Revisao hoje
```

Os PDFs alimentam a materia. A materia alimenta a revisao.

## Hierarquia da tela

Ordem da tela inicial:

1. Hoje no Cognora.
2. Botao Comecar Estudo.
3. Sessao de hoje.
4. Suas materias.
5. Indicadores secundarios.
6. Documentos recentes.

Tudo que nao ajuda o usuario a iniciar uma sessao deve ficar abaixo ou fora da primeira dobra.

## Bloco principal: Hoje no Cognora

Este bloco deve ocupar a maior parte da tela inicial.

Exemplo:

```text
Hoje no Cognora

2 revisoes pendentes
15 questoes recomendadas
Sequencia: 7 dias
Tempo estimado: 18 min

[Comecar Estudo]
```

Objetivo:

Fazer o usuario entender imediatamente que existe um plano para hoje.

## Sessao de hoje

Ao clicar em `Comecar Estudo`, o Cognora deve montar automaticamente a sessao.

Exemplo:

```text
Sessao de Hoje

Revisoes
  □ Banco de Dados
  □ Redes

Questoes
  □ 10 questoes Banco de Dados
  □ 5 questoes Redes

Ao concluir
  -> marcar sessao concluida
  -> atualizar ultimo estudo das materias
  -> agendar proximas revisoes
  -> atualizar streak
  -> conceder XP
```

O usuario pode ver o plano, mas nao deve precisar montar o plano manualmente.

## Decisoes travadas para implementacao

### 1. O que conclui uma sessao

Regra da V1:

```text
Uma sessao e concluida quando o usuario completa uma das regras:
  - 10 questoes respondidas
  - 1 revisao de materia + 5 questoes respondidas
```

Se o usuario novo tiver menos de 10 questoes disponiveis, a sessao pode ser concluida com:

```text
todas as questoes disponiveis respondidas, desde que exista pelo menos 1 questao
```

Motivo:

A sessao precisa medir estudo real, mas nao pode bloquear usuario novo ou materia com pouco conteudo. Apenas abrir a tela, ver resumo ou navegar por documentos nao conclui sessao.

### 2. Quando nasce uma revisao

Regra da V1:

```text
A revisao de uma materia nasce ao concluir uma sessao que incluiu aquela materia.
```

Se a materia ainda nao possui ciclo de revisao, a conclusao da primeira sessao cria o ciclo.

Motivo:

A revisao deve nascer de estudo realizado, nao de upload ou geracao de conteudo. Isso evita criar pendencias antes do usuario realmente estudar a materia.

### 3. Intervalo das revisoes

Regra da V1:

```text
Stage 1 = +1 dia
Stage 2 = +7 dias
Stage 3 = +21 dias
Stage 4+ = +30 dias
```

Ao concluir revisao de uma materia:

```text
review_stage atual aumenta em 1, ate o limite de Stage 4.
next_review_at recebe o intervalo do novo stage.
last_studied_at recebe a data da sessao concluida.
```

Depois do Stage 4, a materia permanece em ciclos de 30 dias.

Exemplo:

```text
Materia: Banco de Dados
Sessao concluida em: 04/06
Stage inicial: 1
Proxima revisao: 05/06
```

### 4. Como atualizar o streak

Regra da V1:

```text
1 sessao concluida no dia = dia ativo de estudo.
```

Atualizacao:

- Se o usuario concluiu uma sessao hoje e tambem concluiu uma sessao ontem: `streak + 1`.
- Se o usuario concluiu uma sessao hoje e nao concluiu ontem: `streak = 1`.
- Se o usuario nao concluiu nenhuma sessao hoje: o streak nao aumenta.
- Quando o proximo dia ativo ocorrer apos falha de um ou mais dias: `streak = 1`.

Motivo:

Streak deve medir estudo concluido, nao login, upload ou geracao de IA.

### 5. Status e abandono de sessao

Regra da V1:

```text
Toda sessao deve ter um status.
```

Status possiveis:

- `IN_PROGRESS`: usuario iniciou a sessao.
- `COMPLETED`: usuario cumpriu a regra de conclusao.
- `ABANDONED`: usuario iniciou, mas nao concluiu.

Uma sessao `IN_PROGRESS` deve virar `ABANDONED` quando:

```text
o usuario iniciou a sessao e ficou mais de 24 horas sem concluir.
```

Motivo:

Sessao abandonada e dado de produto. Ela ajuda a medir atrito, tamanho da sessao e qualidade da recomendacao.

### 6. Como escolher as materias da sessao

Regra da V1:

```text
Selecionar no maximo 2 materias por sessao.
```

Prioridade:

1. Materias com revisao atrasada.
2. Materias com revisao para hoje.
3. Materias com menor taxa de acerto.
4. Materias ha mais tempo sem estudar.
5. Materias com questoes disponiveis.

Em caso de empate:

```text
Escolher a materia com mais questoes disponiveis.
```

Motivo:

A sessao precisa ser curta, objetiva e automatica. Mais de 2 materias aumenta a sensacao de plano pesado e reduz a chance de conclusao.

## Conteudo dentro da sessao

Depois que as materias da sessao forem escolhidas, o Cognora deve montar o conteudo assim:

```text
Para cada materia selecionada:
  - incluir revisao se estiver pendente
  - incluir ate 10 questoes se existirem questoes disponiveis
```

Se a sessao tiver 2 materias, distribuir as questoes tentando manter o total perto de 10 questoes.

Exemplo:

```text
Banco de Dados: 5 questoes
Redes: 5 questoes
```

Se apenas 1 materia tiver questoes disponiveis:

```text
Banco de Dados: 10 questoes
```

## Suas materias

Area secundaria abaixo do bloco principal.

Ela deve mostrar estado e progresso, nao obrigar o usuario a decidir tudo sozinho.

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

Dados por materia:

- Nome.
- Quantidade de PDFs.
- Questoes respondidas.
- Taxa de acerto.
- Ultimo estudo.
- Proxima revisao.
- Status da revisao.

Status possiveis:

- Em dia.
- Revisao hoje.
- Atrasada.
- Sem questoes.
- Comece enviando conteudo.

## Indicadores secundarios

Indicadores que podem aparecer, mas nao devem competir com `Comecar Estudo`:

- XP total.
- Nivel atual.
- Posicao no ranking.
- Total de materias.
- Total de documentos.
- Total de questoes respondidas.
- Taxa geral de acerto.

Decisao:

XP, nivel e ranking sao motivadores. Eles nao sao o centro do dashboard.

## Documentos recentes

Documentos recentes continuam uteis, mas deixam de ser o centro da tela.

Novo papel:

- Ajudar o usuario a acessar conteudo.
- Mostrar atividade recente.
- Servir como contexto da materia.

Eles nao devem ocupar a area principal do dashboard.

## Dados necessarios

Hoje o sistema ja possui:

- Materias.
- Documentos por materia.
- Questoes por materia/documento.
- Tentativas de questoes.
- UserProgress com XP, nivel e streak.

Para a V1 do dashboard, o sistema precisa passar a ter dados de revisao por materia:

- `subject_id`
- `user_email`
- `last_studied_at`
- `next_review_at`
- `review_stage`
- `review_status`
- `completed_reviews_count`
- `created_at`
- `updated_at`

Tambem precisa registrar sessoes de estudo:

- `user_email`
- `started_at`
- `completed_at`
- `abandoned_at`
- `status`
- `subjects`
- `questions_planned`
- `questions_answered`
- `reviews_planned`
- `reviews_completed`
- `xp_awarded`

## Primeira versao possivel

Antes de criar o sistema completo de revisao, o dashboard pode ser reorganizado usando dados existentes.

V0 do dashboard V1:

- Bloco `Hoje no Cognora`.
- Botao `Comecar Estudo`.
- Questoes recomendadas baseadas nas questoes existentes.
- Streak vindo de `UserProgress`.
- Materias com taxa de acerto calculada por tentativas.
- Documentos recentes rebaixados para area secundaria.

Limitacao:

Sem campos de revisao por materia, `revisoes pendentes` ainda sera uma simulacao ou ficara vazio.

## Primeira versao completa

V1 completa do dashboard:

- Revisao real por materia.
- Sessao diaria registrada.
- `Comecar Estudo` monta a sessao automaticamente.
- Conclusao de sessao atualiza streak e progresso.
- Materias mostram ultimo estudo e proxima revisao.
- Dashboard passa a medir sessoes concluidas e dias ativos.

## Fora do dashboard V1

Nao priorizar nesta etapa:

- Mapa de fraquezas por topico.
- Graficos complexos.
- Configurador manual de sessao.
- Novos modos de competicao.
- Mais tipos de IA.
- Ranking como area principal.

## Criterio de aceite

O dashboard da V1 esta correto quando um usuario autenticado consegue abrir a plataforma e entender, sem pensar:

```text
Tenho algo para estudar agora.
Existe um plano para hoje.
Posso comecar com um clique.
Meu progresso sera registrado.
Tenho motivo para voltar amanha.
```
