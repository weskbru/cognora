# Arquitetura

## Visao geral

O Cognora e uma SPA React com uma API FastAPI. O frontend chama a API REST do backend; o backend persiste dados no PostgreSQL do Neon, armazena uploads localmente no servico backend e usa provedores externos de IA.

```text
Browser
  -> Vercel: React + Vite
     -> Render: FastAPI
     -> Neon: PostgreSQL
     -> Render disk/local uploads: Storage
     -> NVIDIA NIM -> Gemini -> OpenRouter: IA
```

## Estrutura

```text
frontend/
  index.html
  src/
    api/          # adapter HTTP para FastAPI
    components/   # UI e componentes de dominio
    context/      # providers React
    hooks/        # hooks compartilhados
    lib/          # autenticacao, query client e utilitarios
    pages/        # paginas da SPA

backend/
  api/            # rotas e schemas HTTP
  core/           # configuracao e seguranca
  domain/         # regras de negocio
  infrastructure/ # banco, repositorios e integracoes
  tests/

database/
  init.sql        # schema PostgreSQL canonico

docs/             # documentacao tecnica
```

## Frontend

`frontend/src/App.tsx` configura providers e rotas. A landing page fica em `/`; a area autenticada comeca em `/dashboard`.

`frontend/src/api/base44Client.js` preserva a interface historica usada pelos componentes, mas chama a API FastAPI. Apesar do nome legado, ele nao usa Base44 como backend.

## Backend

`backend/main.py` cria a aplicacao FastAPI e executa pequenas migracoes idempotentes no startup. O schema completo para bancos novos fica em `database/init.sql`.

`backend/infrastructure/database/connection.py` cria o engine SQLAlchemy. Em producao, `DATABASE_URL` aponta para a URL pooled do Neon.

## Convencoes

- Novos arquivos frontend usam `.tsx` ou `.ts`.
- Componentes de interface usam shadcn/ui via `@/components/ui/...`.
- O tema padrao e light.
- Segredos ficam somente em variaveis de ambiente.
