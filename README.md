# Cognora

Plataforma de estudos gamificada com IA generativa, documentos, quizzes, flashcards e competicoes.

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | React + Vite + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | FastAPI + SQLAlchemy |
| Banco | Neon PostgreSQL |
| Storage | Upload local servido pelo backend |
| Deploy | Vercel + Render |

## Estrutura

```text
cognora/
  frontend/              # SPA React
    index.html
    src/
  backend/               # API FastAPI
    api/
    core/
    domain/
    infrastructure/
    tests/
  database/
    init.sql             # schema PostgreSQL canonico
  docs/                  # documentacao tecnica
  docker-compose.yml     # ambiente local
  vite.config.js         # configuracoes frontend na raiz
  tailwind.config.js
  postcss.config.js
  tsconfig.json
```

## Desenvolvimento local

### Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

| Servico | URL |
|---------|-----|
| Frontend | `http://localhost:5173` |
| Backend | `http://localhost:8001` |
| Swagger | `http://localhost:8001/docs` |
| PostgreSQL | `localhost:5432` |

### Frontend sem Docker

```bash
cp .env.example .env
npm install
npm run dev
```

### Backend sem Docker

Preencha o `.env` da raiz e execute:

```bash
cd backend
python -m venv .venv
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload --env-file ../.env
```

## Scripts frontend

```bash
npm run dev
npm run build
npm run typecheck
npm run lint
npm run test
```

## Deploy

- Frontend: Vercel
- Backend: Render
- PostgreSQL: Neon com URL pooled
- Arquivos: storage local do backend em `UPLOAD_DIR`

Para preparar um banco Neon vazio, execute `database/init.sql` no SQL Editor do Neon.

Detalhes de variaveis e deploy: [docs/deployment.md](docs/deployment.md).

## Documentacao

Comece por [docs/README.md](docs/README.md).
