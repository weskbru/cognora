# Deploy

## Servicos

| Camada | Servico |
|--------|---------|
| Frontend | Vercel |
| Backend API | Render |
| Banco de dados | Neon PostgreSQL |
| Arquivos | Supabase Storage |

## Render

Configure o servico com:

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Runtime: Python 3.12

Variaveis obrigatorias:

| Variavel | Origem |
|----------|--------|
| `DATABASE_URL` | Neon -> Connect -> habilite Connection pooling -> copie a URI completa |
| `SECRET_KEY` | Valor aleatorio seguro |
| `SUPABASE_URL` | Supabase -> Project Settings -> API |
| `SUPABASE_KEY` | Supabase -> service_role key |
| `ALLOWED_ORIGINS` | URL publica do frontend Vercel |

Configure tambem as chaves dos provedores usados: `NVIDIA_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, Google, Stripe e Resend.

## Neon

Para um banco vazio:

1. Abra o SQL Editor do Neon.
2. Execute `database/init.sql`.
3. Cadastre no Render a URI pooled completa gerada pelo Neon.

Formato de referencia:

```text
postgresql://[usuario]:[senha]@[endpoint]-pooler.[regiao].aws.neon.tech/[banco]?sslmode=require&channel_binding=require
```

Nao monte a URL manualmente e nao versione credenciais.

## Vercel

Configure:

- Root directory: `.`
- Environment variable: `VITE_API_URL=https://SEU-BACKEND.onrender.com`

O `vercel.json` da raiz redireciona rotas da SPA durante o deploy.

## Supabase Storage

O bucket esperado e `cognora-storage`. O backend usa `SUPABASE_URL` e `SUPABASE_KEY` para upload; o PostgreSQL da aplicacao fica no Neon.
