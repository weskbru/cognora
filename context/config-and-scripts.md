# Configuracoes e Scripts

## Scripts (package.json)

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento Vite com hot reload em localhost |
| `npm run build` | Gera build otimizado de producao em `/dist` |
| `npm run preview` | Serve o build de producao localmente para testar |
| `npm run lint` | Roda ESLint em modo silencioso (so erros, sem warnings) |
| `npm run lint:fix` | Roda ESLint e corrige problemas automaticamente |
| `npm run typecheck` | Verifica tipos TypeScript com base no jsconfig.json |

---

## vite.config.js

Build tool principal. Configurado com:
- **Plugin React** — suporte a JSX e hot reload
- **Plugin Base44** — integra o SDK, habilita:
  - HMR notifier (notificacoes de reload)
  - Navigation notifier (rastreia navegacao)
  - Analytics tracker
  - Visual edit agent (edicao visual no Base44 builder)
  - Legacy SDK imports
- **Log level: error** — suprime warnings do Vite no console

---

## tailwind.config.js

Configuracao do Tailwind CSS.

Principais customizacoes:
- **Dark mode**: via classe CSS (`class` mode)
- **Cores customizadas**: primary, secondary, accent, muted, sidebar (com variantes -foreground, -border)
- **Border radius**: custom com variaveis CSS (--radius)
- **Fontes**: Inter como fonte principal
- **Cores de graficos**: 5 cores para Recharts (chart-1 a chart-5)
- **Animacoes**: accordion-down / accordion-up para shadcn Accordion
- **Safelist**: classes dinamicas geradas em runtime que o Tailwind nao detectaria no purge
- **Plugin**: tailwindcss-animate para animacoes CSS

---

## jsconfig.json

Configuracao TypeScript/JSConfig.

Configuracoes importantes:
- **`@/*` → `./src/*`** — alias de import principal. Use `@/` em todos os imports em vez de caminhos relativos
- **jsx**: "react-jsx" — suporte moderno a JSX sem import do React
- **moduleResolution**: "bundler" — resolucao de modulos compativel com Vite
- **allowImportingTsExtensions**: true — permite importar `.ts` e `.tsx`
- **noEmit**: true — nao gera arquivos JS (so verifica tipos)
- **include**: `["src"]` — verifica tipos apenas em src/

---

## components.json

Configuracao do shadcn/ui.

- **style**: "new-york" — estilo visual dos componentes
- **rsc**: false — nao usa React Server Components
- **tsx**: false — gera componentes em JSX, nao TSX
- **tailwind.baseColor**: "slate" — cor base do tema
- **tailwind.cssVariables**: true — usa variaveis CSS para cores
- **aliases**: mapeamentos de pastas para `shadcn add` funcionar corretamente

Para adicionar novos componentes shadcn:
```bash
npx shadcn@latest add [nome-do-componente]
```

---

## estilnti.config.js (ESLint)

Linting configurado para o projeto.

Escopo de verificacao:
- `src/components/` — verifica componentes de feature
- `src/pages/` — verifica paginas
- IGNORA `src/lib/` e `src/components/ui/` (shadcn nao precisa de lint)

Regras ativas:
- React recommended rules
- React Hooks rules (deps obrigatorias)
- Unused imports detection
- `no-unused-vars` (warn, exceto `_` prefixados)
- Sem obrigatoriedade de prop-types
- Elementos customizados permitidos (Web Components se necessario)

---

## postcss.config.js

Configuracao minima do PostCSS.

Plugins:
- **tailwindcss** — processa as diretivas `@tailwind`
- **autoprefixer** — adiciona vendor prefixes automaticamente (-webkit-, -moz-, etc.)

---

## index.html

Template HTML da SPA.

- `<div id="root">` — ponto de montagem do React
- Favicon do Base44
- Fonte Inter do Google Fonts (carregada no CSS)
- Script `type="module"` apontando para `frontend/src/main.jsx`

---

## index.css (Design Tokens)

Variaveis CSS que definem o design system completo.

Estrutura:
```css
:root {
  /* Cores base (light mode) */
  --background: ...;
  --foreground: ...;
  --primary: ...;
  --primary-foreground: ...;
  /* ... etc */
  --radius: 0.5rem;
}

.dark {
  /* Override das cores para dark mode */
  --background: ...;
  /* ... etc */
}
```

Todas as cores dos componentes shadcn referenciam essas variaveis, garantindo que o dark mode funcione automaticamente ao adicionar a classe `dark` no `<html>`.

---

## .env.local (necessario criar manualmente)

Nao incluso no repositorio. Criar na raiz do projeto:

```env
VITE_BASE44_APP_ID=seu_app_id_aqui
VITE_BASE44_APP_BASE_URL=https://seu-app.base44.app
```

Esses valores sao obtidos no painel do Base44.
