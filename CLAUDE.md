# Cognora — Regras de Arquitetura

## Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI (Python) + SQLAlchemy + PostgreSQL
- **Deploy**: Vercel (frontend) + Render (backend) + Supabase (DB + Storage)
- **Dev local**: Docker Compose (`docker compose up`)

## Regras obrigatórias

### TypeScript — SEMPRE

- Todo arquivo novo do frontend deve ser **`.tsx`** (componentes React) ou **`.ts`** (utilitários, hooks, API).
- **Nunca criar arquivos `.jsx` ou `.js`** — sem exceções.
- Arquivos `.jsx`/`.js` existentes devem ser renomeados para `.tsx`/`.ts` quando forem editados.
- Usar tipagem explícita em props, retornos de função e dados de API.
- `tsconfig.json` é a configuração ativa (`checkJs: false` — arquivos JS legados não são checados).

### Componentes UI

- Usar **shadcn/ui** para todos os componentes de interface (`Button`, `Select`, `Card`, `Badge`, etc.).
- Importar de `@/components/ui/...`.
- Não criar componentes primitivos do zero se já existirem no shadcn/ui.

### Convenções gerais

- Estado de tema padrão: **light** (escuro apenas quando o usuário alternar).
- Alternativas de questões MCQ são embaralhadas no servidor após geração da IA.
- Questões V/F não são embaralhadas (Verdadeiro sempre primeiro, Falso segundo).
- Provedores de IA: NVIDIA NIM (primário) → Gemini (secundário) → OpenRouter (fallback).
