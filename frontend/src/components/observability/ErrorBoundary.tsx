import { Component, type ErrorInfo, type ReactNode } from 'react';

import { reportFrontendEvent } from '@/api/observability';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportFrontendEvent({
      level: 'error',
      event_type: 'frontend_error',
      message: error.message || 'Erro ao renderizar interface.',
      metadata: {
        path: window.location.pathname,
        stack: error.stack,
        component_stack: info.componentStack,
      },
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
          <div className="max-w-md space-y-4 text-center">
            <h1 className="text-xl font-semibold">Algo deu errado</h1>
            <p className="text-sm text-muted-foreground">
              O erro foi registrado para analise. Recarregue a pagina para tentar novamente.
            </p>
            <Button onClick={() => window.location.reload()}>Recarregar</Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
