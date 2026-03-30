# Mapa de Paginas

Todas as 11 paginas da aplicacao com o que fazem e como funcionam.

---

## Dashboard (`/`)
**Arquivo:** `frontend/src/pages/Dashboard.jsx`

Pagina inicial apos o login. Mostra um panorama rapido do estado do usuario.

O que exibe:
- Cards de estatisticas (total de materias, documentos, questoes, progresso)
- Lista de documentos enviados recentemente
- Lista de materias com contagem de documentos
- Atalhos para criar materia ou enviar documento

Dados buscados: `Subject.list()`, `Document.list()`, `UserProgress` do usuario

---

## Subjects (`/subjects`)
**Arquivo:** `frontend/src/pages/Subjects.jsx`

Lista todas as materias do usuario em formato de grid.

O que exibe:
- Grid de cards de materias
- Numero de documentos por materia
- Botao para criar nova materia
- Estado vazio com chamada para acao

Dados buscados: `Subject.list()`

---

## NewSubject (`/subjects/new`)
**Arquivo:** `frontend/src/pages/NewSubject.jsx`

Formulario para criar uma nova materia.

Campos:
- Nome (obrigatorio)
- Descricao (opcional)

Apos criar: redireciona para `/subjects`

---

## SubjectDetail (`/subjects/:id`)
**Arquivo:** `frontend/src/pages/SubjectDetail.jsx`

Pagina de detalhe de uma materia especifica.

O que exibe:
- Nome e descricao da materia
- Lista de documentos pertencentes a materia
- Status de processamento de cada documento
- Botao para upload de novo documento (abre UploadDialog)
- Link para cada documento

Dados buscados: `Subject.get(id)`, `Document.filter({ subject_id: id })`

---

## Documents (`/documents`)
**Arquivo:** `frontend/src/pages/Documents.jsx`

Lista todos os documentos do usuario com busca e filtros.

O que exibe:
- Campo de busca por nome
- Filtro por status
- Filtro por materia
- Cards de documentos com badge de status
- Botao de upload (abre UploadDialog)

Status exibidos com cores:
- pending — cinza
- processing — amarelo/laranja
- completed — verde
- error — vermelho

Dados buscados: `Document.list()`, `Subject.list()`

---

## DocumentDetail (`/documents/:id`)
**Arquivo:** `frontend/src/pages/DocumentDetail.jsx`

Pagina de detalhe de um documento processado.

O que exibe:
- Nome e status do documento
- Materia associada
- `SummarySection` — resumo gerado pela IA
- `QuestionsSection` — questoes geradas pela IA
- Se ainda processando: indicador de carregamento

Dados buscados: `Document.get(id)`, `Summary.filter({ document_id: id })`, `Question.filter({ document_id: id })`

---

## Quiz (`/quiz`)
**Arquivo:** `frontend/src/pages/Quiz.jsx`

Browser interativo de questoes para estudo.

O que exibe:
- Filtros: materia, dificuldade, tipo
- Lista de QuestionCards
- Opcao de responder cada questao
- Feedback de acerto/erro
- Ganho de XP ao responder

Dados buscados: `Question.list()`, `Subject.list()`

---

## Profile (`/profile`)
**Arquivo:** `frontend/src/pages/Profile.jsx`

Dashboard pessoal do usuario logado.

O que exibe:
- Avatar, nome, email
- Nivel atual (nome + numero) com XPProgressBar
- StreakBadge com dias consecutivos
- Cards de estatisticas: questoes respondidas, acertos, resumos, documentos
- Historico de XP (lista de ganhos recentes)
- Mini-leaderboard (posicao no ranking global)

Dados buscados: `UserProgress.filter({ user_email: currentUser.email })`

---

## Leaderboard (`/leaderboard`)
**Arquivo:** `frontend/src/pages/Leaderboard.jsx`

Ranking global de todos os usuarios da plataforma.

O que exibe:
- Podio top 3 com destaque visual (ouro, prata, bronze)
- Lista completa de LeaderboardCards ordenados por XP
- Posicao do usuario logado destacada
- Nivel e streak de cada usuario

Dados buscados: `UserProgress.list()` (todos os usuarios)

---

## Competitions (`/competitions`)
**Arquivo:** `frontend/src/pages/Competitions.jsx`

Lista e gerenciamento de competicoes.

O que exibe:
- Lista de competicoes do usuario (hosting + participando)
- Status de cada competicao
- Botao "Criar Competicao" (abre CreateCompetitionDialog)
- Botao "Entrar com Codigo" (abre JoinCompetitionDialog)
- Cards de competicao com modo, status, participantes

Dados buscados: `Competition.filter({ host_email: currentUser.email })` + competicoes onde e participante

---

## CompetitionDetail (`/competitions/:id`)
**Arquivo:** `frontend/src/pages/CompetitionDetail.jsx`

Pagina da competicao ativa.

O que exibe (depende do status):
- `waiting`: sala de espera com invite code, lista de participantes, botao de iniciar (host)
- `active`: modo de competicao ativo (DuelMode / TimeAttackMode / WeeklyLeagueMode)
- `finished`: CompetitionResults com pontuacoes finais

Dados buscados: `Competition.get(id)`

---

## PageNotFound (`*`)
**Arquivo:** `frontend/src/lib/PageNotFound.jsx`

Pagina 404. Renderizada para qualquer rota nao mapeada.
Exibe mensagem de erro e link para voltar ao inicio.
