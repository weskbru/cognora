import { type ComponentType, type ReactElement, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Gem, Heart, Lock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

const TypedDialogContent = DialogContent as unknown as ComponentType<{
  children?: ReactNode;
  className?: string;
}>;
const TypedDialogTitle = DialogTitle as unknown as ComponentType<{
  children?: ReactNode;
  className?: string;
}>;
const TypedDialogDescription = DialogDescription as unknown as ComponentType<{
  children?: ReactNode;
  className?: string;
}>;

type LimitCode =
  | 'GENERATION_LIMIT_REACHED'
  | 'SUBJECT_LIMIT_REACHED'
  | 'DOCUMENT_LIMIT_REACHED';

interface LimitMessage {
  title: string;
  body: string;
  tip: string | null;
}

interface LimitReachedCardProps {
  code: LimitCode | string;
  onDismiss?: () => void;
}

const MESSAGES: Record<LimitCode, LimitMessage> = {
  GENERATION_LIMIT_REACHED: {
    title: 'Limite diário de gerações atingido',
    body: 'Você usou todas as gerações de IA disponíveis hoje. Faça login amanhã para renovar automaticamente.',
    tip: 'Dica: faça login todo dia para ganhar +1 geração bônus!',
  },
  SUBJECT_LIMIT_REACHED: {
    title: 'Limite de matérias atingido',
    body: 'O plano Free permite até 2 matérias. Exclua uma matéria existente ou faça upgrade.',
    tip: null,
  },
  DOCUMENT_LIMIT_REACHED: {
    title: 'Limite de documentos por matéria',
    body: 'O plano Free permite 1 documento por matéria. Exclua o documento atual ou faça upgrade.',
    tip: null,
  },
};

const FALLBACK_MESSAGE: LimitMessage = {
  title: 'Limite atingido',
  body: 'Você atingiu um limite do plano Free.',
  tip: null,
};

function CompactLimitCard({
  message,
  onDismiss,
}: {
  message: LimitMessage;
  onDismiss?: () => void;
}): ReactElement {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-center dark:border-red-900/60 dark:bg-red-950/30">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/60">
        <Lock className="h-5 w-5 text-red-500" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{message.title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{message.body}</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="mt-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Fechar
        </button>
      )}
    </div>
  );
}

function GenerationLimitModal({ onDismiss }: { onDismiss?: () => void }): ReactElement {
  const message = MESSAGES.GENERATION_LIMIT_REACHED;

  return (
    <Dialog open onOpenChange={(open: boolean) => !open && onDismiss?.()}>
      <TypedDialogContent className="max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-5xl overflow-y-auto border-slate-800 bg-slate-950 p-0 text-slate-100 shadow-2xl shadow-slate-950/60 [&>button]:hidden">
        <div className="relative overflow-hidden rounded-xl bg-[radial-gradient(circle_at_50%_20%,rgba(79,70,229,0.12),transparent_38%)]">
          <div className="px-6 pb-8 pt-9 text-center sm:px-10 sm:pt-10">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-red-500/10 bg-red-500/10 shadow-lg shadow-red-500/5">
              <Lock className="h-10 w-10 text-red-400" />
            </div>

            <TypedDialogTitle className="mt-6 text-2xl font-semibold leading-tight tracking-tight text-slate-100 sm:text-3xl">
              <span className="text-red-400">Limite diário</span> de gerações atingido
            </TypedDialogTitle>
            <TypedDialogDescription className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Você usou todas as gerações de IA disponíveis hoje.
              <br />
              Faça login amanhã para renovar automaticamente.
            </TypedDialogDescription>

            {message.tip && (
              <div className="mx-auto mt-7 flex max-w-2xl items-center justify-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-4 text-left text-sm text-slate-200 sm:text-base">
                <Zap className="h-6 w-6 shrink-0 fill-amber-400 text-amber-400" />
                <p><span className="text-amber-400">Dica:</span> faça login todo dia para ganhar +1 geração bônus!</p>
              </div>
            )}
          </div>

          <div className="border-t border-slate-800/80 px-5 py-7 sm:px-10">
            <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-5 py-5 text-center sm:flex-row sm:text-left">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-violet-500/20 bg-violet-500/10 shadow-lg shadow-violet-500/10">
                <Gem className="h-10 w-10 text-violet-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="flex items-center justify-center gap-2 text-lg font-semibold text-slate-100 sm:justify-start">
                  Torne-se apoiador do projeto <Heart className="h-5 w-5 text-violet-400" />
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base">
                  Ao assinar, você desbloqueia <span className="text-violet-300">gerações ilimitadas</span>,
                  apoia o desenvolvimento e ainda ganha benefícios exclusivos!
                </p>
              </div>
              <Button asChild className="h-12 shrink-0 gap-2 rounded-xl bg-violet-600 px-6 text-white hover:bg-violet-500">
                <Link to="/pricing">
                  <Crown className="h-5 w-5" /> Quero apoiar
                </Link>
              </Button>
            </div>
          </div>

          <div className="border-t border-slate-800/80 px-6 py-5 text-center">
            <button
              type="button"
              onClick={onDismiss}
              className="text-sm text-emerald-400 transition-colors hover:text-emerald-300"
            >
              Fechar
            </button>
          </div>
        </div>
      </TypedDialogContent>
    </Dialog>
  );
}

export default function LimitReachedCard({ code, onDismiss }: LimitReachedCardProps): ReactElement {
  if (code === 'GENERATION_LIMIT_REACHED') {
    return <GenerationLimitModal onDismiss={onDismiss} />;
  }

  const message = MESSAGES[code as LimitCode] || FALLBACK_MESSAGE;
  return <CompactLimitCard message={message} onDismiss={onDismiss} />;
}
