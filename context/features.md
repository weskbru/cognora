# Funcionalidades Detalhadas

## 1. Gerenciamento de Materias

**Onde:** `/subjects` e `/subjects/:id`

O usuario pode criar, visualizar e organizar materias de estudo.
Cada materia tem nome e descricao. Dentro de cada materia ficam os documentos.

Operacoes:
- Criar nova materia (form em `/subjects/new`)
- Listar materias em grid
- Ver detalhes de uma materia com seus documentos
- Deletar materia

Entidade: `Subject`

---

## 2. Gerenciamento de Documentos

**Onde:** `/documents` e `/documents/:id`

O usuario faz upload de PDFs. O sistema processa o documento em background via IA.

Status do documento:
- `pending` — aguardando processamento
- `processing` — IA gerando questoes e resumo
- `completed` — pronto para uso
- `error` — falha no processamento

Funcionalidades:
- Upload de PDF via `UploadDialog`
- Busca e filtro de documentos
- Badge de status colorido
- Visualizacao do documento processado com questoes e resumo

Componentes chave:
- `UploadDialog.jsx` — modal de upload
- `QuestionsSection.jsx` — exibe questoes do documento
- `SummarySection.jsx` — exibe resumo gerado
- `QuestionCard.jsx` — card individual de questao

Entidades: `Document`, `Question`, `Summary`

---

## 3. Sistema de Quiz

**Onde:** `/quiz`

Browser de questoes com filtros avancados.

Filtros disponiveis:
- Por materia (subject_id)
- Por dificuldade (easy, medium, hard)
- Por tipo (multiple_choice, true_false, essay)

Funcionalidades:
- Listagem de todas as questoes
- Responder questoes e ganhar XP
- Visualizacao da correcao

Tipos de questao:
- `multiple_choice` — multipla escolha
- `true_false` — verdadeiro ou falso
- `essay` — dissertativa

Dificuldades:
- `easy` — facil
- `medium` — medio
- `hard` — dificil

Entidade: `Question`

---

## 4. Sistema de Competicoes

**Onde:** `/competitions` e `/competitions/:id`

Competicoes em tempo real entre usuarios. Tres modos disponiveis.

### Criar Competicao
- Dialog `CreateCompetitionDialog`
- Escolhe modo, quantidade de questoes, limite de tempo
- Gera invite code automaticamente

### Entrar em Competicao
- Dialog `JoinCompetitionDialog`
- Insere o invite code recebido

### Modo Duel
**Arquivo:** `DuelMode.jsx`
- 2 jogadores
- 5 ou 10 questoes
- Comparacao direta de pontuacoes
- Exibe resultado lado a lado

### Modo Time Attack
**Arquivo:** `TimeAttackMode.jsx`
- 1 ou mais jogadores
- Limite de tempo: 5 ou 10 minutos
- Responde o maximo de questoes no tempo
- Maior pontuacao no tempo vence

### Modo Weekly League
**Arquivo:** `WeeklyLeagueMode.jsx`
- Ranking cumulativo semanal
- Pontuacao acumula durante a semana
- Reset toda semana

### Resultado
**Arquivo:** `CompetitionResults.jsx`
- Exibe resultado final
- Pontucoes de todos os participantes
- Confetes em caso de vitoria

Entidade: `Competition`

---

## 5. Sistema de Recompensas (Gamificacao)

**Onde:** `hooks/useRewards.jsx`, `context/RewardsContext.jsx`, `components/rewards/`

O nucleo da gamificacao. Ver `rewards-system.md` para detalhes completos.

Componentes visuais:
- `RewardPopup.jsx` — popup animado quando ganha XP
- `XPProgressBar.jsx` — barra de progresso do nivel atual
- `StreakBadge.jsx` — badge com numero de dias de streak

---

## 6. Perfil do Usuario

**Onde:** `/profile`

Dashboard pessoal do usuario com todas as suas metricas.

Informacoes exibidas:
- Nome, email, avatar
- Nivel atual e nome do nivel (ex: "Expert")
- XP total e progresso para proximo nivel
- Streak atual (dias consecutivos)
- Estatisticas: questoes respondidas, acertos, resumos, documentos
- Historico de XP (grafico/lista de ganhos)
- Mini-leaderboard com posicao global

Entidade: `UserProgress`

---

## 7. Leaderboard Global

**Onde:** `/leaderboard`

Ranking de todos os usuarios da plataforma.

Funcionalidades:
- Podio top 3 com destaque visual
- Lista completa de usuarios por XP
- Badge de nivel de cada usuario
- Streak badge
- Posicao do usuario logado em destaque

Componente: `LeaderboardCard.jsx`

---

## 8. Dashboard

**Onde:** `/`

Pagina inicial apos login. Visao rapida do estado geral.

Informacoes:
- Estatisticas resumidas (StatCard)
- Documentos enviados recentemente
- Materias do usuario
- Atalhos para acoes principais

---

## 9. Autenticacao

Gerenciada completamente pelo Base44 SDK. O Cognora nao implementa auth customizado.

Fluxo:
1. Usuario acessa a app
2. `AuthContext` verifica se ha sessao valida
3. Se nao autenticado: redireciona para login Base44
4. Se autenticado: renderiza a app normalmente

Componente de erro: `UserNotRegisteredError.jsx` (exibido se usuario existe no auth mas nao tem registro completo)

---

## 10. Dark Mode

Suportado via `next-themes`. Toggle de tema disponivel na interface.
Cores do dark mode definidas como CSS custom properties em `index.css`.
