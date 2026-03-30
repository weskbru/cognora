import { Lock, Zap } from 'lucide-react';

const MESSAGES = {
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

export default function LimitReachedCard({ code, onDismiss }) {
  const msg = MESSAGES[code] || {
    title: 'Limite atingido',
    body: 'Você atingiu um limite do plano Free.',
    tip: null,
  };

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5 flex flex-col items-center text-center gap-3">
      <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
        <Lock className="h-5 w-5 text-red-500" />
      </div>
      <div>
        <h3 className="font-semibold text-foreground text-sm">{msg.title}</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{msg.body}</p>
      </div>
      {msg.tip && (
        <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <Zap className="h-3.5 w-3.5 fill-amber-400 text-amber-500 shrink-0" />
          {msg.tip}
        </div>
      )}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
        >
          Fechar
        </button>
      )}
    </div>
  );
}
