import ReactDOM from 'react-dom/client'
import App from '@/App'
import '@/index.css'
import { ErrorBoundary } from '@/components/observability/ErrorBoundary'
import { installFrontendObservability } from '@/lib/frontendObservability'

installFrontendObservability()

const root = document.getElementById('root')

if (!root) {
  throw new Error('[Cognora] Elemento #root nao encontrado.')
}

ReactDOM.createRoot(root).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
