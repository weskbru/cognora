# Deploy e Infraestrutura

## Servicos de Producao

| Camada | Servico | URL |
|--------|---------|-----|
| Frontend | Vercel | https://vercel.com/weskbrus-projects/cognora |
| Backend API | Render | https://dashboard.render.com/web/srv-d76ldghr0fns73cdk7eg |
| Banco + Storage | Supabase | https://supabase.com/dashboard/project/okomhmbfthyfdzvfecpl |

---

## Variaveis de Ambiente

### Render (Backend)

Configure em: Render Dashboard → seu servico → **Environment**

| Variavel | Valor / Onde obter |
|----------|-------------------|
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string (URI) — Transaction pooler |
| `SECRET_KEY` | String aleatoria segura (use `openssl rand -hex 32`) |
| `OPENROUTER_API_KEY` | https://openrouter.ai/keys |
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_KEY` | Supabase → Project Settings → API → service_role key (**nao** anon key) |

> **Atencao**: o arquivo `.env` local **nao e enviado ao Render**. Cada variavel precisa ser cadastrada manualmente no painel do Render.

### Vercel (Frontend)

Configure em: Vercel → seu projeto → **Settings → Environment Variables**

| Variavel | Valor |
|----------|-------|
| `VITE_API_URL` | URL publica do Render, ex: `https://cognora.onrender.com` |

---

## Desenvolvimento local

### Pre-requisitos

- Python 3.12+ e pip
- Node.js 18+
- O arquivo `.env` na raiz do projeto (ja existe, nao commitar)

### Iniciar o backend

```bash
cd backend
pip install -r requirements.txt      # primeira vez apenas
uvicorn main:app --reload --port 8000
```

O backend carrega automaticamente o `.env` da raiz via `python-dotenv`.
Acesse a documentacao interativa em: http://localhost:8000/docs

### Iniciar o frontend

Em outro terminal, na raiz do projeto:

```bash
npm install          # primeira vez apenas
npm run dev
```

O `.env.local` ja aponta `VITE_API_URL=http://localhost:8000`.
Acesse o app em: http://localhost:5173

### Banco de dados em local

Por padrao o backend local usa o mesmo banco do Supabase (producao).
Para isolar o ambiente e usar um banco local via Docker:

```bash
docker compose up db        # sobe apenas o postgres local
```

E altere temporariamente o `.env`:
```
DATABASE_URL=postgresql://cognora:cognora@localhost:5432/cognora
```

> Nao commite essa alteracao.

### Resumo dos ambientes

| O que muda | Local | Producao |
|------------|-------|----------|
| Frontend roda em | http://localhost:5173 | Vercel |
| Backend roda em | http://localhost:8000 | Render |
| `VITE_API_URL` | `http://localhost:8000` (`.env.local`) | URL do Render (Vercel dashboard) |
| `.env` carregado por | `python-dotenv` automaticamente | Variaveis no painel do Render |

---

## Como fazer deploy

### Backend (Render)

O Render detecta push no branch `main` e faz deploy automatico.

- **Build command**: `pip install -r requirements.txt`
- **Start command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Root directory**: `backend`
- **Runtime**: Python 3.12

Para deploy manual: Render Dashboard → **Manual Deploy → Deploy latest commit**

### Frontend (Vercel)

Vercel faz deploy automatico em cada push no `main`.

Para deploy manual: `vercel --prod` (requer CLI do Vercel instalada)

### Banco de dados (Supabase)

Migrations sao gerenciadas pelo arquivo `database/init.sql`.

Para aplicar mudancas no schema em producao:
1. Edite `database/init.sql`
2. Va em Supabase Dashboard → **SQL Editor**
3. Execute o trecho alterado manualmente

---

## Supabase Storage

- **Bucket**: `cognora-storage`
- Arquivos enviados pelos usuarios (PDFs) ficam neste bucket
- A politica do bucket deve ser `public` para leitura (URLs publicas funcionarem)
- Verificar em: Supabase → Storage → `cognora-storage` → Policies

---

## Diagnostico de problemas comuns

### Upload de PDF falha com `ConnectError` / `Name or service not known`

**Causa**: `SUPABASE_URL` ou `SUPABASE_KEY` nao estao configuradas no ambiente do Render.

**Solucao**:
1. Acesse Render Dashboard → seu servico → Environment
2. Confirme que `SUPABASE_URL` e `SUPABASE_KEY` estao presentes
3. `SUPABASE_KEY` deve ser a **service_role** key (Supabase → Project Settings → API)
4. Apos salvar as variaveis, o Render reinicia o servico automaticamente

### Backend retorna 500 "Supabase nao configurado"

Mesmo problema acima — variaveis ausentes no Render.

### Frontend nao consegue chamar o backend

Verificar se `VITE_API_URL` na Vercel aponta para a URL correta do Render (sem barra no final).

### Banco de dados nao conecta

Usar o **Transaction pooler** do Supabase (porta 6543), nao a connection direta (porta 5432), pois o Render nao mantem conexoes persistentes.

Formato: `postgresql://postgres.[ref]:[senha]@aws-0-[regiao].pooler.supabase.com:6543/postgres`

---

## Fluxo de dados em producao

```
Browser → Vercel (React SPA)
             ↓ chamadas HTTP
         Render (FastAPI)
             ↓ queries SQL          ↓ upload/download de arquivos
         Supabase (PostgreSQL)   Supabase (Storage)
             ↓ IA
         OpenRouter API
```
