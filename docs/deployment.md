# Deploy

## Servicos

| Camada | Servico |
|--------|---------|
| Frontend | Vercel |
| Backend API | Render |
| Banco de dados | Neon PostgreSQL |
| Arquivos | Storage local do backend |

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
| `ALLOWED_ORIGINS` | URL publica do frontend Vercel |
| `UPLOAD_DIR` | Diretorio persistente para uploads no backend |

Defina também as proteções de sessão:

```text
ENVIRONMENT=production
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAMESITE=lax
AUTH_RATE_LIMIT_ATTEMPTS=10
AUTH_RATE_LIMIT_WINDOW_SECONDS=300
```

O cookie de sessão é `HttpOnly` e não fica disponível ao JavaScript. O frontend
publicado usa o proxy `/api` da Vercel, portanto o cookie é first-party e não
depende da liberação de cookies de terceiros pelo navegador. O Render é
detectado automaticamente como produção e habilita cookies `Secure`, mas
mantenha as variáveis explícitas.

Configure tambem as chaves dos provedores usados: `NVIDIA_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, Google e Resend.

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
- Build command: `npm run build`
- Output directory: `frontend/dist`
- `VITE_API_URL` continua obrigatória apenas no desenvolvimento local. Em
  produção, o frontend usa `/api` no mesmo domínio e o `vercel.json` encaminha
  as chamadas para `https://cognora.onrender.com`.

O `vercel.json` da raiz fixa o diretorio publicado, encaminha a API e
redireciona rotas da SPA durante o deploy.

## Uploads locais

O backend salva uploads em `UPLOAD_DIR` e serve os arquivos por `/uploads`.

Em producao, configure um disco persistente no Render e aponte `UPLOAD_DIR` para esse caminho, por exemplo:

```text
/var/data/cognora/uploads
```

Sem disco persistente, arquivos enviados podem ser perdidos em rebuilds/redeploys do backend.
