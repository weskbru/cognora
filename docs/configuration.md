# Configuracao

## Arquivos canonicos

| Arquivo | Responsabilidade |
|---------|------------------|
| `package.json` | Dependencias e scripts do frontend |
| `vite.config.js` | Root do frontend, aliases e integracao com PostCSS |
| `tailwind.config.js` | Tema Tailwind e safelist |
| `postcss.config.js` | Tailwind CSS e Autoprefixer |
| `tsconfig.json` | TypeScript e aliases `@/` |
| `vitest.config.js` | Testes frontend |
| `eslint.config.js` | Lint dos arquivos JavaScript legados |
| `components.json` | shadcn/ui |
| `vercel.json` | Rewrite da SPA no Vercel |
| `docker-compose.yml` | Ambiente local completo |
| `backend/requirements.txt` | Dependencias Python da API |
| `.env.example` | Variaveis do frontend, backend e Docker Compose |

## Scripts frontend

```bash
npm run dev
npm run build
npm run typecheck
npm run lint
npm run test
```

## Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

Servicos locais:

| Servico | URL |
|---------|-----|
| Frontend | `http://localhost:5173` |
| Backend | `http://localhost:8001` |
| Swagger | `http://localhost:8001/docs` |
| PostgreSQL | `localhost:5432` |

## Variaveis

O frontend usa variaveis prefixadas com `VITE_`. O Vite, o backend e o Docker Compose leem o `.env` da raiz.

Nao versione `.env`, `.env.local` ou credenciais reais.
