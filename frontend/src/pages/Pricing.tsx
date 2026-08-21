import { useEffect, useState } from 'react';
import type { ElementType } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  BookOpen,
  Brain,
  Check,
  Copy,
  Crown,
  Loader2,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';

import { subscriptionsApi, type PaidPlan, type PixPaymentRequest } from '@/api/subscriptions';
import { useAuth } from '@/lib/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface Plan {
  id: 'free' | PaidPlan;
  name: string;
  price: string;
  period: string;
  description: string;
  icon: ElementType;
  color: string;
  badge?: string;
  features: string[];
  cta: string;
  highlighted: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 'R$0',
    period: 'para sempre',
    description: 'Para começar sua jornada de estudos.',
    icon: Sparkles,
    color: 'text-slate-400',
    features: [
      'Até 3 matérias',
      '1 PDF por matéria',
      'Até 3 PDFs ativos',
      'Upload até 5 MB',
      '5 resumos, 5 questões e 5 flashcards por mês',
      '1 geração por PDF no plano gratuito',
      '1 competição ativa',
    ],
    cta: 'Plano atual',
    highlighted: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'R$9,90',
    period: 'por mês',
    description: 'Para estudantes que levam o aprendizado a sério.',
    icon: Zap,
    color: 'text-indigo-500',
    badge: 'Mais popular',
    features: [
      'Até 10 matérias',
      'Até 2 PDFs por matéria',
      'Até 20 PDFs ativos',
      'Upload até 25 MB',
      '30 resumos, 30 questões e 30 flashcards por mês',
      'Sem bloqueio de repetição por PDF',
      'Até 5 competições ativas',
    ],
    cta: 'Assinar Pro',
    highlighted: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 'R$19,90',
    period: 'por mês',
    description: 'Para uso intensivo com limites altos e previsíveis.',
    icon: Crown,
    color: 'text-amber-500',
    features: [
      'Até 30 matérias',
      'Até 5 PDFs por matéria',
      'Até 100 PDFs ativos',
      'Upload até 50 MB',
      '100 resumos, 100 questões e 100 flashcards por mês',
      'Sem bloqueio de repetição por PDF',
      'Até 20 competições ativas',
      'Suporte prioritário',
    ],
    cta: 'Assinar Premium',
    highlighted: false,
  },
];

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString('pt-BR');
}

export default function Pricing() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [pixPayment, setPixPayment] = useState<PixPaymentRequest | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const { data: subStatus } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: () => subscriptionsApi.getStatus(),
    enabled: isAuthenticated,
  });

  const currentPlan = subStatus?.plan || 'free';
  const expiresAt = formatDate(subStatus?.plan_expires_at);

  const handleCTA = async (plan: Plan) => {
    if (plan.id === 'free') return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (plan.id === currentPlan) return;

    setLoadingPlan(plan.id);
    try {
      const payment = await subscriptionsApi.createPixPayment(plan.id);
      setPixPayment(payment);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar Pix.';
      setToast({ type: 'error', msg: message });
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleCopyPix = async () => {
    if (!pixPayment) return;
    try {
      await navigator.clipboard.writeText(pixPayment.pix_payload);
      setToast({ type: 'success', msg: 'Código Pix copiado.' });
    } catch {
      setToast({ type: 'error', msg: 'Não foi possível copiar automaticamente.' });
    }
  };

  const getButtonLabel = (plan: Plan) => {
    if (plan.id === currentPlan) return 'Plano atual';
    if (loadingPlan === plan.id) return '';
    return plan.cta;
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto font-inter">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all
          ${toast.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300'
            : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/60 dark:border-red-800 dark:text-red-300'}`}
        >
          {toast.type === 'success'
            ? <Check className="h-4 w-4 shrink-0" />
            : <AlertCircle className="h-4 w-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      <div className="text-center space-y-3">
        <Badge variant="secondary" className="text-xs px-3 py-1">
          <Brain className="h-3 w-3 mr-1.5" />
          Planos Cognora
        </Badge>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
          Escolha seu plano
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Comece de graça e faça upgrade quando precisar de mais poder.
        </p>

        {isAuthenticated && currentPlan !== 'free' && (
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            <Badge variant="outline" className={`${currentPlan === 'premium' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300'}`}>
              {currentPlan === 'premium' ? <Crown className="h-3 w-3 mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
              Você está no plano {currentPlan === 'premium' ? 'Premium' : 'Pro'}
            </Badge>
            {expiresAt && (
              <Badge variant="secondary" className="text-xs">
                Ativo até {expiresAt}
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = plan.id === currentPlan;
          const isLoading = loadingPlan === plan.id;

          return (
            <Card
              key={plan.id}
              className={`h-full relative flex flex-col p-6 transition-all rounded-lg
                ${plan.highlighted
                  ? 'border-indigo-500 shadow-lg shadow-indigo-500/10 dark:border-indigo-500'
                  : 'border-border'}
                ${isCurrent ? 'ring-2 ring-primary/40' : ''}`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="default" className="bg-indigo-600 text-white text-xs px-3">
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <div className="mb-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-secondary">
                    <Icon className={`h-5 w-5 ${plan.color}`} />
                  </div>
                  <div>
                    <p className="font-bold text-foreground leading-none">{plan.name}</p>
                    {isCurrent && (
                      <span className="text-[11px] text-primary font-medium">Plano atual</span>
                    )}
                  </div>
                </div>
                <div className="flex items-end gap-1.5 mb-1">
                  <span className="text-3xl font-extrabold text-foreground">{plan.price}</span>
                  <span className="text-sm text-muted-foreground mb-1">/{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <Button
                onClick={() => handleCTA(plan)}
                disabled={isCurrent || isLoading || plan.id === 'free'}
                variant={plan.highlighted ? 'default' : 'outline'}
                className={`w-full mb-5 ${plan.highlighted && !isCurrent ? 'bg-indigo-600 hover:bg-indigo-500' : ''}`}
              >
                {isLoading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : getButtonLabel(plan)}
              </Button>

              <ul className="space-y-2.5 flex-1">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-foreground/80">{feat}</span>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
        {[
          { icon: Brain, label: 'IA Generativa', desc: 'Resumos, questões e flashcards gerados por IA com base nos seus documentos.' },
          { icon: BookOpen, label: 'Estudo Personalizado', desc: 'Sistema de progresso com XP, níveis e streak para manter o ritmo.' },
          { icon: Trophy, label: 'Competições', desc: 'Duelos e ligas semanais para disputar com colegas em tempo real.' },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex gap-3 p-4 rounded-lg bg-secondary/40 border border-border">
            <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3 pb-4">
        <h2 className="text-base font-semibold text-foreground">Perguntas frequentes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              q: 'Posso cancelar a qualquer momento?',
              a: 'Sim. Como o pagamento é Pix manual, basta não renovar. O acesso continua até o fim do período pago.',
            },
            {
              q: 'O que acontece ao atingir o limite de gerações?',
              a: 'No plano Free, os limites de resumos, questões e flashcards renovam todo mês. Faça upgrade para limites maiores.',
            },
            {
              q: 'Meus dados são preservados ao fazer upgrade?',
              a: 'Sim. Todo seu conteúdo, matérias, documentos e progresso são mantidos.',
            },
            {
              q: 'Quando o plano é ativado?',
              a: 'Após a conferência manual do Pix pelo admin. O navegador não consegue ativar o plano sozinho.',
            },
          ].map(({ q, a }) => (
            <div key={q} className="p-4 rounded-lg border border-border bg-card">
              <p className="text-sm font-semibold text-foreground mb-1">{q}</p>
              <p className="text-sm text-muted-foreground">{a}</p>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={!!pixPayment} onOpenChange={(open) => !open && setPixPayment(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Pagamento Pix</DialogTitle>
            <DialogDescription>
              Use a referência abaixo na mensagem do Pix para agilizar a conferência.
            </DialogDescription>
          </DialogHeader>

          {pixPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-4">
                <div className="rounded-lg border bg-white p-3">
                  {pixPayment.qr_code_data_url && (
                    <img
                      src={pixPayment.qr_code_data_url}
                      alt="QR Code Pix"
                      className="h-36 w-36 mx-auto"
                    />
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                    <span className="text-muted-foreground">Plano</span>
                    <span className="font-semibold">{pixPayment.plan === 'premium' ? 'Premium' : 'Pro'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                    <span className="text-muted-foreground">Valor</span>
                    <span className="font-semibold">{formatCurrency(pixPayment.amount_cents)}</span>
                  </div>
                  <div className="rounded-md border px-3 py-2">
                    <p className="text-muted-foreground">Referência</p>
                    <p className="font-mono text-sm font-semibold break-all">{pixPayment.pix_reference}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Textarea
                  readOnly
                  value={pixPayment.pix_payload}
                  className="min-h-24 resize-none font-mono text-xs"
                />
                <Button onClick={handleCopyPix} className="w-full gap-2">
                  <Copy className="h-4 w-4" />
                  Copiar Pix copia e cola
                </Button>
              </div>

              <div className="rounded-lg border bg-secondary/40 p-3 text-sm text-muted-foreground">
                Envie o Pix com seu nome, e-mail e a referência {pixPayment.pix_reference}. O plano é ativado após conferência manual no painel admin.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
