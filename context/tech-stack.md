# Tech Stack Detalhado

## Core

### React 18.2.0
Framework principal de UI. Usa hooks funcionais em toda a app. Nenhum componente de classe.

### Vite 6.1.0
Build tool e servidor de desenvolvimento. Substitui webpack. HMR ultra-rapido.
Config em: `vite.config.js`

### TypeScript 5.8.2
Usado para verificacao de tipos. Arquivos `.tsx` (App.tsx) e `.ts` (utils/index.ts).
Nao e 100% TypeScript — maioria dos arquivos ainda e `.jsx`.
Config em: `jsconfig.json` (usa jsconfig em vez de tsconfig)

---

## Roteamento

### React Router DOM 6.26.0
Roteamento client-side com:
- `BrowserRouter` — wrapper na raiz
- `Routes / Route` — definicao das rotas em App.tsx
- `Outlet` — renderiza paginas filhas dentro do AppLayout
- `useNavigate` — navegacao programatica
- `useParams` — parametros da URL (ex: `:id`)

---

## UI e Estilo

### Tailwind CSS 3.4.17
Framework CSS utility-first. Toda a estilizacao e feita via classes no JSX.
Config em: `tailwind.config.js`
Tokens de design em: `frontend/src/index.css` (variaveis CSS)

### shadcn/ui
Biblioteca de 44 componentes React de alta qualidade. Nao e um pacote npm — os componentes sao copiados para `src/components/ui/`.
Config em: `components.json`
Estilo: "New York" com variaveis CSS
Componentes principais usados: Button, Card, Dialog, Select, Input, Badge, Tabs, Sheet, Tooltip, Avatar, Progress, ScrollArea, Separator

### Lucide React 0.475.0
Biblioteca de icones SVG como componentes React.
```jsx
import { BookOpen, Trophy, Upload } from 'lucide-react'
```

### Framer Motion 11.16.4
Animacoes declarativas em React. Usado principalmente para:
- Popup de recompensas (RewardPopup)
- Transicoes suaves de componentes
- Animacoes de entrada (fade, scale)

### Next Themes 0.4.4
Gerencia dark mode via classe CSS no `<html>`. Permite alternar tema sem flash.

---

## Estado e Dados

### TanStack React Query 5.84.1
Gerencia todo o estado do servidor. Substitui useState + useEffect para chamadas de API.
- `useQuery` — buscar dados
- `useMutation` — criar/editar/deletar
- `invalidateQueries` — invalidar cache apos mutations
Config em: `src/lib/query-client.js`

### React Hook Form 7.54.2
Gerencia estado de formularios complexos com alta performance.
Integra com shadcn Form components.

### Zod 3.24.2
Schema validation. Valida dados de formularios e entradas do usuario.
Usado junto com React Hook Form via `@hookform/resolvers`.

---

## Backend (Base44)

### @base44/sdk 0.8.0
SDK principal para comunicacao com o backend Base44:
- Autenticacao de usuarios
- CRUD de entidades (Subject, Document, Question, etc.)
- Upload de arquivos
- API gerada automaticamente em `src/api/`

### @base44/vite-plugin 1.0.0
Plugin Vite que integra Base44 ao ambiente de desenvolvimento:
- HMR notifier
- Navigation notifier
- Analytics tracker
- Visual edit agent
- Suporte a imports legados do SDK

---

## Utilitarios

### date-fns 3.6.0
Manipulacao de datas sem alterar Date nativo.
Usado para calcular streak, formatar datas do historico de XP.

### clsx 2.1.1
Monta strings de classnames condicionalmente.
```jsx
clsx('base', { active: isActive, disabled: !enabled })
```

### tailwind-merge 3.0.2
Mescla classes Tailwind resolvendo conflitos (ex: `p-2 p-4` vira `p-4`).

### class-variance-authority 0.7.1
Define variantes de componentes de forma type-safe.
Usado internamente pelos componentes shadcn/ui.

### canvas-confetti 1.9.4
Animacao de confetes. Usado nas telas de vitoria em competicoes.

### react-markdown 9.0.1
Renderiza conteudo Markdown. Usado nos resumos gerados pela IA.

### recharts 2.15.4
Graficos em React. Disponivel para visualizacoes de progresso e estatisticas.

### html2canvas 1.4.1 + jspdf 4.0.0
Gerar PDFs e capturas de tela. Possivelmente usado para exportar resumos ou resultados.

### react-quill 2.0.0
Editor rich text WYSIWYG. Pode ser usado para edicao de conteudo.

### react-leaflet 4.2.1
Mapas interativos. Dependencia incluida, uso a confirmar no produto.

### stripe (via SDK)
Integracao de pagamentos. Incluida mas possivelmente em desenvolvimento.

---

## Dev Tools

### ESLint 9.19.0
Linting de codigo. Config em: `estilnti.config.js`
Verifica apenas `src/components/` e `src/pages/` (ignora `src/lib/` e `src/components/ui/`)

### Autoprefixer 10.4.20
Adiciona vendor prefixes ao CSS automaticamente.

### PostCSS
Processa o CSS do Tailwind. Config em: `postcss.config.js`
