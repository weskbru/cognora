# Cognora — Plataforma Inteligente de Estudos

> Plataforma educacional gamificada com IA, documentos, quizzes e competições — construída em React + Base44.

---

## O que é o Cognora?

**Cognora** é uma plataforma SaaS de estudos que combina:
- Gerenciamento de documentos com análise por IA
- Geração automática de questões e resumos
- Sistema de recompensas com XP, níveis e streaks
- Competições entre usuários (Duel, Time Attack, Weekly League)
- Ranking global e perfis de progresso

O público-alvo são estudantes brasileiros (interface em pt-BR) que querem estudar de forma ativa e gamificada.

---

## Stack Principal

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite 6 |
| Roteamento | React Router DOM 6 |
| UI Components | shadcn/ui (44 componentes) |
| Estilo | Tailwind CSS 3 |
| State Server | TanStack React Query 5 |
| Formulários | React Hook Form + Zod |
| Animações | Framer Motion 11 |
| Backend | Base44 SDK (BaaS) |
| Banco de dados | Base44 Entities (6 entidades) |
| Ícones | Lucide React |
| Build | Vite + TypeScript |

---

## Como Rodar

### Pré-requisitos
1. Clone o repositório
2. Navegue até a pasta do projeto
3. Instale dependências: `npm install`
4. Crie um arquivo `.env.local` com:

```env
VITE_BASE44_APP_ID=seu_app_id
VITE_BASE44_APP_BASE_URL=sua_url_backend
```

### Scripts disponíveis

```bash
npm run dev          # Servidor de desenvolvimento com hot reload
npm run build        # Build de produção
npm run preview      # Preview do build de produção
npm run typecheck    # Verifica tipos TypeScript
npm run lint         # Verifica qualidade do código
npm run lint:fix     # Corrige problemas de lint automaticamente
```

---

## Estrutura do Projeto

```
cognora/
├── frontend/
│   └── src/
│       ├── pages/              # 11 páginas da aplicação
│       ├── components/
│       │   ├── competitions/   # Componentes de competição e layout
│       │   │   ├── documents/  # Cards e upload de documentos
│       │   │   ├── layout/     # Layout principal (Sidebar, Nav)
│       │   │   ├── leaderboard/# Ranking global
│       │   │   ├── modes/      # Modos de competição
│       │   │   ├── rewards/    # Popup de XP, badge, barra de progresso
│       │   │   ├── shared/     # Componentes reutilizáveis
│       │   │   └── ui/         # shadcn/ui (44 componentes base)
│       ├── context/            # RewardsContext
│       ├── hooks/              # useRewards, use-mobile
│       ├── lib/                # AuthContext, QueryClient, utils
│       ├── utils/              # createPageUrl
│       ├── api/                # Gerado automaticamente pelo Base44
│       ├── App.tsx             # Router e Providers
│       ├── main.jsx            # Entry point
│       └── index.css           # Design tokens + Tailwind
├── database/
│   └── entities/               # 6 schemas de entidades Base44
│       ├── Competition.db
│       ├── Document.db
│       ├── Question.db
│       ├── Subject.db
│       ├── Summary.db
│       └── UserProgress.db
├── backend/                    # Vazio — usa Base44 como BaaS
├── package.json
├── vite.config.js
├── tailwind.config.js
├── jsconfig.json
└── index.html
```

---

## Páginas da Aplicação

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/` | Dashboard.jsx | Visão geral com stats, docs recentes, matérias |
| `/subjects` | Subjects.jsx | Lista e gerenciamento de matérias |
| `/subjects/new` | NewSubject.jsx | Formulário de nova matéria |
| `/subjects/:id` | SubjectDetail.jsx | Detalhes de uma matéria |
| `/documents` | Documents.jsx | Lista de documentos, upload, busca |
| `/documents/:id` | DocumentDetail.jsx | Visualização e análise de documento |
| `/quiz` | Quiz.jsx | Browser de questões com filtros |
| `/profile` | Profile.jsx | Dashboard de progresso do usuário |
| `/leaderboard` | Leaderboard.jsx | Ranking global com pódio |
| `/competitions` | Competitions.jsx | Lista e criação de competições |
| `/competitions/:id` | CompetitionDetail.jsx | Competição ativa |

---

## Entidades do Banco de Dados

### Subject
```
name | description | created_date
```

### Document
```
name | status (pending/processing/completed/error) | subject_id | created_date
```

### Question
```
text | type (multiple_choice/true_false/essay) | difficulty (easy/medium/hard) | subject_id | created_date
```

### Summary
```
content | document_id | created_date
```

### Competition
```
title | mode (duel/time_attack/weekly_league) | status (waiting/active/finished)
host_email | participants[] | question_count | time_limit_seconds | invite_code | created_date
```

### UserProgress
```
user_email | xp | level (1-10) | streak_days | last_active_date
total_questions_answered | total_correct_answers
total_summaries_generated | total_documents_uploaded | xp_history[]
```

---

## Sistema de Recompensas (XP)

| Acao | XP Ganho |
|------|----------|
| Resposta correta | +10 XP |
| Resposta errada | +2 XP |
| Resumo gerado | +30 XP |
| Documento enviado | +20 XP |
| Login diario | +15 XP |
| Bonus de streak | +5 XP x dias |

### Niveis de Progressao

| Nivel | Nome | XP Necessario |
|-------|------|--------------|
| 1 | Iniciante | 0 - 100 |
| 2 | Estudante | 100 - 250 |
| 3 | Dedicado | 250 - 500 |
| 4 | Aplicado | 500 - 900 |
| 5 | Avancado | 900 - 1.500 |
| 6 | Expert | 1.500 - 2.500 |
| 7 | Mestre | 2.500 - 4.000 |
| 8 | Genio | 4.000 - 6.000 |
| 9 | Lendario | 6.000 - 10.000 |
| 10 | Supremo | 10.000+ |

---

## Modos de Competicao

| Modo | Descricao |
|------|-----------|
| Duel | 2 jogadores, 5 ou 10 questoes, comparacao direta |
| Time Attack | Desafio de 5 ou 10 minutos, maior pontuacao vence |
| Weekly League | Ranking cumulativo semanal |

---

## Arquitetura Resumida

- **Provider nesting**: `AuthProvider > QueryClientProvider > RewardsProvider` envolve toda a app
- **React Query**: gerencia todo o estado do servidor (CRUD das entidades)
- **Base44 SDK**: abstrai o backend — autenticacao, banco, API gerada automaticamente
- **shadcn/ui**: 44 componentes de base reutilizaveis
- **Hooks customizados**: `useRewards()` para XP/nivel/streak, `useAuth()` para sessao
- **Alias `@/`**: mapeia para `./src/` em todos os imports

---

## Publicar alteracoes

Abra [Base44.com](https://app.base44.com) e clique em **Publish**.

## Documentacao e Suporte

- Docs: https://docs.base44.com/Integrations/Using-GitHub
- Suporte: https://app.base44.com/support

---

## Contexto Detalhado

Para entender cada parte do projeto em profundidade, consulte a pasta `context/`:

| Arquivo | Conteudo |
|---------|---------|
| context/overview.md | Visao geral e proposito |
| context/architecture.md | Arquitetura, fluxo e padroes |
| context/tech-stack.md | Todas as dependencias explicadas |
| context/features.md | Funcionalidades detalhadas |
| context/database-schema.md | Entidades e campos |
| context/components-map.md | Mapa de todos os componentes |
| context/pages-map.md | O que cada pagina faz |
| context/rewards-system.md | XP, niveis e streak em detalhe |
| context/config-and-scripts.md | Configs e scripts explicados |
