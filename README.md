# Cognora — Plataforma Inteligente de Estudos

> Plataforma educacional gamificada com IA generativa, documentos, quizzes e competições.
> Construída com **React + FastAPI + PostgreSQL**.

---

## O que é o Cognora?

**Cognora** é uma plataforma SaaS de estudos que combina:

- Upload e análise automática de documentos (PDF) com IA
- Geração de resumos, questões de múltipla escolha e flashcards via LLM
- Sistema de gamificação: XP, níveis, streaks diários e ranking
- Competições entre usuários (Duel, Time Attack, Weekly League)
- Plano freemium com limites de gerações diárias

O público-alvo são estudantes brasileiros que querem estudar de forma ativa e gamificada.

---

## Stack

| Camada       | Tecnologia                               |
|--------------|------------------------------------------|
| Frontend     | React 18 + Vite 6                        |
| Roteamento   | React Router DOM 6                       |
| UI           | shadcn/ui + Tailwind CSS 3               |
| State        | TanStack React Query 5                   |
| Animações    | Framer Motion 11                         |
| Backend      | FastAPI (Python 3.12)                    |
| Banco de dados | PostgreSQL 15                          |
| ORM          | SQLAlchemy 2 + psycopg2                  |
| Auth         | JWT (python-jose) + bcrypt               |
| IA           | OpenRouter API (Gemini 2.0 Flash)        |
| Containers   | Docker + Docker Compose                  |

---

## Arquitetura

```
Browser
  │
  ▼
Frontend (React/Vite)          ← Vercel
  │  VITE_API_URL
  ▼
Backend (FastAPI)              ← Railway
  │  DATABASE_URL
  ▼
PostgreSQL                     ← Railway (plugin)
  │
  └── Uploads (arquivos PDF/PNG ficam em /uploads)
```

**Fluxo de análise de documento:**
```
Upload PDF → Extração de texto (pypdf)
           → LLM via OpenRouter (Gemini 2.0 Flash)
           → Resumo + Questões MCQ + Flashcards
           → Salvo no PostgreSQL
```

---

## Rodando localmente com Docker

### Pré-requisitos
- Docker + Docker Compose instalados
- Chave da [OpenRouter API](https://openrouter.ai/keys)

### 1. Clone e configure o ambiente

```bash
git clone https://github.com/SEU_USUARIO/cognora.git
cd cognora

# Copie os arquivos de exemplo
cp .env.example .env.local
cp backend/.env.example backend/.env
```

### 2. Preencha as variáveis

**`.env.local`** (frontend):
```env
VITE_API_URL=http://localhost:8001
```

**`backend/.env`** (backend):
```env
DATABASE_URL=postgresql://cognora:cognora@db:5432/cognora
SECRET_KEY=gere-com-python-secrets-token-hex-32
OPENROUTER_API_KEY=sk-or-v1-SUA_CHAVE_AQUI
ALLOWED_ORIGINS=http://localhost:5173
```

### 3. Suba os containers

```bash
docker compose up --build
```

| Serviço    | URL                        |
|------------|----------------------------|
| Frontend   | http://localhost:5173       |
| Backend    | http://localhost:8001       |
| Swagger UI | http://localhost:8001/docs  |
| PostgreSQL | localhost:5432              |

---

## Rodando sem Docker

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # preencha as variáveis
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend

```bash
cp .env.example .env.local       # preencha VITE_API_URL
npm install
npm run dev
```

---

## Scripts disponíveis

### Frontend

```bash
npm run dev          # servidor de desenvolvimento (porta 5173)
npm run build        # build de produção (gera dist/)
npm run preview      # preview do build
npm run typecheck    # verifica tipos TypeScript
npm run lint         # verifica qualidade do código
npm run lint:fix     # corrige problemas de lint automaticamente
```

### Backend (testes)

```bash
cd backend
python -m pytest tests/ -v                         # todos os testes
python -m pytest tests/unit/ -v                    # apenas unitários
python -m pytest tests/integration/ -v             # apenas integração

# Com PostgreSQL real (CI/CD):
TEST_DATABASE_URL=postgresql://... python -m pytest tests/
```

---

## Variáveis de ambiente

### Backend (`backend/.env`)

| Variável           | Obrigatório | Descrição                                        |
|--------------------|-------------|--------------------------------------------------|
| `DATABASE_URL`     | Sim         | URL de conexão PostgreSQL                        |
| `SECRET_KEY`       | Sim         | Chave secreta para assinar JWTs (mín. 32 chars)  |
| `OPENROUTER_API_KEY` | Sim       | Chave da API OpenRouter para o LLM               |
| `ALLOWED_ORIGINS`  | Não         | Origens CORS permitidas, separadas por vírgula (padrão: `*`) |

### Frontend (`.env.local`)

| Variável       | Obrigatório | Descrição                        |
|----------------|-------------|----------------------------------|
| `VITE_API_URL` | Sim         | URL base do backend FastAPI       |

---

## Deploy em produção

### Backend → Railway

1. Conecte o repositório no [Railway](https://railway.app)
2. Configure **Root Directory**: `backend`
3. Railway detecta o `Dockerfile` automaticamente
4. Adicione um plugin PostgreSQL e copie a `DATABASE_URL`
5. Configure as variáveis de ambiente:
   ```
   DATABASE_URL=<gerado pelo Railway>
   SECRET_KEY=<gere um valor seguro>
   OPENROUTER_API_KEY=<sua chave>
   ALLOWED_ORIGINS=https://SEU-FRONTEND.vercel.app
   ```

### Frontend → Vercel

1. Importe o repositório na [Vercel](https://vercel.com)
2. Configure **Root Directory**: `.` (raiz, onde está o `package.json`)
3. Adicione a variável de ambiente:
   ```
   VITE_API_URL=https://SEU-BACKEND.railway.app
   ```

---

## Estrutura do projeto

```
cognora/
├── frontend/
│   └── src/
│       ├── api/            # base44Client.js — adapter HTTP para o backend
│       ├── components/     # componentes React (UI, competitions, etc.)
│       ├── lib/            # AuthContext, QueryClient
│       ├── pages/          # 11 páginas da aplicação
│       └── ...
├── backend/
│   ├── api/
│   │   ├── routes/         # auth, entities, nlp, upload, limits, ai
│   │   └── schemas/        # Pydantic schemas de request/response
│   ├── core/
│   │   ├── config/         # settings.py (variáveis de ambiente)
│   │   └── security/       # JWT e bcrypt
│   ├── domain/
│   │   ├── entities/       # entidades de domínio (dataclasses)
│   │   └── use_cases/      # lógica de negócio (auth, limits, nlp, ai)
│   ├── infrastructure/
│   │   ├── ai/             # adaptadores OpenRouter, HuggingFace, PDF extractor
│   │   ├── database/       # modelos SQLAlchemy, conexão
│   │   └── repositories/   # repositório genérico e de usuário
│   ├── tests/              # suite de testes (166 testes)
│   ├── main.py             # entry point FastAPI
│   ├── requirements.txt
│   ├── requirements-test.txt
│   └── Dockerfile
├── docker-compose.yml
├── package.json            # dependências do frontend
├── .env.example            # template de variáveis do frontend
└── README.md
```

---

## Páginas da aplicação

| Rota                | Descrição                                        |
|---------------------|--------------------------------------------------|
| `/`                 | Dashboard — stats, documentos recentes, matérias |
| `/login`            | Login / Registro                                 |
| `/subjects`         | Lista e gerenciamento de matérias                |
| `/subjects/:id`     | Detalhes de uma matéria                          |
| `/documents`        | Lista de documentos, upload, busca               |
| `/documents/:id`    | Visualização, análise e geração de questões      |
| `/quiz`             | Browser de questões com filtros                  |
| `/profile`          | Progresso do usuário (XP, streak, histórico)     |
| `/leaderboard`      | Ranking global                                   |
| `/competitions`     | Lista e criação de competições                   |
| `/competitions/:id` | Competição ativa                                 |

---

## Sistema de recompensas (XP)

| Ação                   | XP   |
|------------------------|------|
| Resposta correta       | +10  |
| Resumo gerado          | +30  |
| Documento enviado      | +20  |
| Login diário           | +15  |
| Bônus de streak        | +5 × dias |

---

## Decisões técnicas

- **Clean Architecture**: separação clara entre API, domínio e infraestrutura — facilita testes e manutenção
- **FastAPI sobre Django**: ideal para APIs leves com validação automática via Pydantic e documentação Swagger embutida
- **OpenRouter em vez de OpenAI direta**: acesso a múltiplos modelos (incluindo gratuitos) com fallback automático
- **SQLAlchemy 2 (ORM imperativo)**: controle fino das queries sem magia; compatível com PostgreSQL e SQLite (testes)
- **JWT stateless**: sem sessões no servidor — escala horizontalmente sem estado compartilhado
- **Freemium no banco**: limites de geração armazenados em `UserProgress` — sem Redis necessário para MVP
