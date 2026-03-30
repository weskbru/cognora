# Mapa de Componentes

Todos os componentes do projeto com sua localizacao e responsabilidade.

---

## Layout

| Componente | Arquivo | O que faz |
|-----------|---------|-----------|
| AppLayout | components/competitions/layout/AppLayout.jsx | Wrapper da app autenticada. Inclui Sidebar (desktop) e MobileNav (mobile). Renderiza o `<Outlet>` para as paginas. |
| Sidebar | components/competitions/layout/Sidebar.jsx | Navegacao lateral esquerda. Exibe links das paginas, usuario logado, nivel atual e badge de streak. |
| MobileNav | components/competitions/layout/MobileNav.jsx | Navegacao inferior para dispositivos moveis. Versao compacta da Sidebar. |

---

## Shared (Reutilizaveis)

| Componente | Arquivo | O que faz |
|-----------|---------|-----------|
| PageHeader | components/competitions/shared/PageHeader.jsx | Cabecalho padrao de pagina com titulo e descricao opcional. |
| StatCard | components/competitions/shared/StatCard.jsx | Card de estatistica com icone, valor e rotulo. Usado no Dashboard e Perfil. |
| EmptyState | components/competitions/shared/EmptyState.jsx | Placeholder visual para listas vazias. Aceita titulo, mensagem e botao de acao. |

---

## Documents (Documentos)

| Componente | Arquivo | O que faz |
|-----------|---------|-----------|
| UploadDialog | components/competitions/documents/UploadDialog.jsx | Modal para upload de PDF. Seleciona materia, escolhe arquivo e envia. |
| QuestionCard | components/competitions/documents/QuestionCard.jsx | Card individual de uma questao. Exibe enunciado, tipo, dificuldade e opcoes de resposta. |
| QuestionsSection | components/competitions/documents/QuestionsSection.jsx | Secao de questoes de um documento. Lista todos os QuestionCards. |
| SummarySection | components/competitions/documents/SummarySection.jsx | Secao do resumo gerado. Renderiza conteudo Markdown do resumo. |

---

## Leaderboard (Ranking)

| Componente | Arquivo | O que faz |
|-----------|---------|-----------|
| LeaderboardCard | components/competitions/leaderboard/LeaderboardCard.jsx | Card de um usuario no ranking. Exibe posicao, avatar, nome, nivel, streak e XP. |

---

## Rewards (Recompensas)

| Componente | Arquivo | O que faz |
|-----------|---------|-----------|
| RewardPopup | components/competitions/rewards/RewardPopup.jsx | Popup animado (Framer Motion) que aparece quando o usuario ganha XP. Exibe motivo e quantidade de XP. |
| XPProgressBar | components/competitions/rewards/XPProgressBar.jsx | Barra de progresso do XP dentro do nivel atual. Exibe nivel atual, XP e % para o proximo nivel. |
| StreakBadge | components/competitions/rewards/StreakBadge.jsx | Badge com numero de dias de streak consecutivo. Exibe icone de fogo e contador. |

---

## Modes (Modos de Competicao)

| Componente | Arquivo | O que faz |
|-----------|---------|-----------|
| CompetitionQuestion | components/competitions/modes/CompetitionQuestion.jsx | Exibe uma questao durante uma competicao ativa. Gerencia selecao de resposta e timer. |
| DuelMode | components/competitions/modes/DuelMode.jsx | Interface do modo Duel. Exibe questoes lado a lado para 2 jogadores. |
| TimeAttackMode | components/competitions/modes/TimeAttackMode.jsx | Interface do Time Attack. Exibe timer regressivo e questoes em sequencia. |
| WeeklyLeagueMode | components/competitions/modes/WeeklyLeagueMode.jsx | Interface da Weekly League. Exibe ranking semanal e pontuacao acumulada. |

---

## Competition (Dialogs)

| Componente | Arquivo | O que faz |
|-----------|---------|-----------|
| CreateCompetitionDialog | competitions/* | Modal para criar nova competicao. Escolhe modo, questoes, tempo, materia. |
| JoinCompetitionDialog | competitions/* | Modal para entrar em competicao via invite code. |
| CompetitionResults | competitions/* | Tela de resultado final. Exibe pontuacoes, vencedor e confetes. |

---

## Lib / Utilitarios

| Componente | Arquivo | O que faz |
|-----------|---------|-----------|
| UserNotRegisteredError | components/UserNotRegisteredError.jsx | Exibido quando usuario esta autenticado mas sem registro completo na plataforma. |
| PageNotFound | lib/PageNotFound.jsx | Pagina 404. Renderizada para rotas nao encontradas (`*`). |

---

## UI (shadcn/ui — 44 componentes base)

Localizacao: `components/ui/`

Componentes disponíveis (nao editar — gerenciados pelo shadcn):

```
accordion       alert           alert-dialog    aspect-ratio
avatar          badge           breadcrumb      button
calendar        card            carousel        chart
checkbox        collapsible     command         context-menu
dialog          drawer          dropdown-menu   form
hover-card      input           input-otp       label
menubar         navigation-menu pagination      popover
progress        radio-group     resizable       scroll-area
select          separator       sheet           sidebar
skeleton        slider          sonner          switch
table           tabs            textarea        toast
toggle          toggle-group    tooltip
```

Uso tipico:
```jsx
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
```

---

## Hierarquia de composicao tipica

```
AppLayout
  Sidebar
    StreakBadge
    XPProgressBar
  <Outlet>
    PageHeader
    StatCard (varios)
    EmptyState (se vazio)
    LeaderboardCard (varios)
    QuestionCard
      CompetitionQuestion (dentro de competicao)
    RewardPopup (global, sobre tudo)
```
