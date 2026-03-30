# Arquitetura do Cognora

## Visao geral

Cognora e um SPA (Single Page Application) React que usa Base44 como BaaS (Backend as a Service).
O frontend e 100% em React. Nao existe backend customizado — toda logica de dados passa pelo Base44 SDK.

## Fluxo de execucao

```
index.html
  └── main.jsx                  (monta a app no #root)
        └── App.tsx             (configura providers e rotas)
              ├── AuthProvider  (gerencia sessao do usuario)
              ├── QueryClientProvider (cache e sincronizacao de dados)
              ├── RewardsProvider (XP, niveis, streak)
              └── BrowserRouter
                    └── AppLayout (Sidebar + MobileNav)
                          └── <Outlet> (paginas renderizadas aqui)
```

## Camadas da aplicacao

### 1. Providers (App.tsx)
Toda a app e envolta em 3 providers aninhados:
- `AuthProvider` — autentica o usuario via Base44, expoe `useAuth()`
- `QueryClientProvider` — configura React Query com 1 retry, sem refetch no focus
- `RewardsProvider` — gerencia o sistema de XP e recompensas, expoe `useRewardsContext()`

### 2. Layout (AppLayout)
Componente wrapper que envolve todas as paginas autenticadas:
- `Sidebar.jsx` — navegacao lateral com nivel do usuario
- `MobileNav.jsx` — navegacao responsiva para mobile
- `<Outlet>` — onde as paginas sao renderizadas pelo React Router

### 3. Paginas (src/pages/)
11 paginas. Cada uma busca dados via React Query + Base44 SDK e renderiza componentes de features.

### 4. Componentes (src/components/)
Organizados por dominio:
- `ui/` — componentes base do shadcn (Button, Dialog, Card, etc.)
- `layout/` — componentes de estrutura (AppLayout, Sidebar, MobileNav)
- `shared/` — componentes genericos reutilizaveis (EmptyState, StatCard, PageHeader)
- `documents/` — componentes de documentos e questoes
- `modes/` — componentes dos modos de competicao
- `rewards/` — componentes visuais do sistema de XP
- `leaderboard/` — card de ranking

### 5. Hooks (src/hooks/)
- `useRewards.jsx` — logica central do sistema de gamificacao (XP, niveis, streak, historico)
- `use-mobile.jsx` — detecta se o dispositivo e mobile (breakpoint 768px)

### 6. Context (src/context/)
- `RewardsContext.jsx` — Provider que envolve a app com o sistema de recompensas

### 7. Lib (src/lib/)
- `AuthContext.jsx` — contexto de autenticacao com Base44
- `app-params.js` — configuracoes da app vindas do ambiente/URL
- `query-client.js` — instancia singleton do React Query
- `utils.js` — funcao `cn()` para mesclar classes Tailwind
- `PageNotFound.jsx` — pagina 404

### 8. API (src/api/)
Pasta gerada automaticamente pelo plugin Base44. Nao editar manualmente.
Exporta as entidades para uso nos componentes (ex: `Subject.list()`, `Document.create()`).

## Padroes utilizados

### React Query para estado do servidor
```jsx
const { data: subjects } = useQuery({
  queryKey: ['subjects'],
  queryFn: () => Subject.list()
})

const { mutate: createSubject } = useMutation({
  mutationFn: Subject.create,
  onSuccess: () => queryClient.invalidateQueries(['subjects'])
})
```

### Base44 SDK para CRUD
```jsx
// Listar
Subject.list()
// Criar
Subject.create({ name, description })
// Atualizar
Subject.update(id, data)
// Deletar
Subject.delete(id)
// Buscar por filtros
Question.filter({ subject_id: id, difficulty: 'hard' })
```

### Alias de imports
Todos os imports usam o alias `@/` que mapeia para `src/`:
```jsx
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/AuthContext'
import { useRewardsContext } from '@/context/RewardsContext'
```

## Autenticacao

Fluxo gerenciado pelo `AuthContext.jsx`:
1. App inicia e chama `checkAppState()` — valida configuracoes publicas do app Base44
2. Chama `checkUserAuth()` — verifica token do usuario
3. Se autenticado: renderiza a app normalmente
4. Se `auth_required`: redireciona para login Base44
5. Se `user_not_registered`: exibe `UserNotRegisteredError.jsx`

## Dados em tempo real

O React Query gerencia a sincronizacao automaticamente:
- Apos mutations (create/update/delete): `invalidateQueries` forca refetch
- Cache configurado para evitar refetch desnecessario no foco da janela
- Retry: 1 tentativa em caso de erro

## Responsividade

- Layout desktop: Sidebar fixa + conteudo principal
- Layout mobile: MobileNav inferior + conteudo em tela cheia
- Hook `use-mobile` detecta o breakpoint 768px para alternar entre layouts
