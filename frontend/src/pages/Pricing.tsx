import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Check, Zap, Crown, Sparkles, Loader2,
  BookOpen, FileText, Brain, Trophy, AlertCircle,
} from 'lucide-react';

interface Plan {
  id: 'free' | 'pro' | 'unlimited';
  name: string;
  price: string;
  period: string;
  description: string;
  icon: React.ElementType;
  color: string;
  badge?: string;
  features: string[];
  limits: string[];
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
      '3 gerações por dia',
      '+1 geração bônus ao fazer login',
      'Até 2 matérias',
      '1 documento por matéria',
      'Questões ilimitadas',
      'Flashcards ilimitados',
      'Competições',
    ],
    limits: [],
    cta: 'Plano atual',
    highlighted: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'R$19,90',
    period: 'por mês',
    description: 'Para estudantes que levam o aprendizado a sério.',
    icon: Zap,
    color: 'text-indigo-400',
    badge: 'Mais popular',
    features: [
      '20 gerações por dia',
      '+1 geração bônus ao fazer login',
      'Matérias ilimitadas',
      'Documentos ilimitados por matéria',
      'Questões ilimitadas',
      'Flashcards ilimitados',
      'Competições',
      'Suporte prioritário',
    ],
    limits: [],
    cta: 'Assinar Pro',
    highlighted: true,
  },
  {
    id: 'unlimited',
    name: 'Ilimitado',
    price: 'R$39,90',
    period: 'por mês',
    description: 'Poder total da IA, sem nenhuma restrição.',
    icon: Crown,
    color: 'text-amber-400',
    features: [
      'Gerações ilimitadas',
      'Matérias ilimitadas',
      'Documentos ilimitados',
      'Questões ilimitadas',
      'Flashcards ilimitados',
      'Competições',
      'Suporte prioritário',
      'Acesso antecipado a novidades',
    ],
    limits: [],
    cta: 'Assinar Ilimitado',
    highlighted: false,
  },
];

export default function Pricing() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  useEffect(() => {
    if (success) {
      setToast({ type: 'success', msg: 'Assinatura ativada com sucesso! Bem-vindo ao novo plano.' });
      navigate('/pricing', { replace: true });
    } else if (canceled) {
      setToast({ type: 'error', msg: 'Pagamento cancelado. Nenhuma cobrança foi feita.' });
      navigate('/pricing', { replace: true });
    }
  }, [success, canceled]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const { data: subStatus, refetch: refetchSub } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: () => base44.subscriptions.getStatus(),
    enabled: isAuthenticated,
  });

  const currentPlan = (subStatus?.plan || 'free') as Plan['id'];

  const handleCTA = async (plan: Plan) => {
    if (plan.id === 'free') return;

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (plan.id === currentPlan) return;

    setLoadingPlan(plan.id);
    try {
      const { checkout_url } = await base44.subscriptions.createCheckout(plan.id);
      window.location.href = checkout_url;
    } catch (err: any) {
      setToast({ type: 'error', msg: err?.message || 'Erro ao iniciar checkout.' });
    } finally {
      setLoadingPlan(null);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const { portal_url } = await base44.subscriptions.openPortal();
      window.location.href = portal_url;
    } catch (err: any) {
      setToast({ type: 'error', msg: err?.message || 'Erro ao abrir portal.' });
    } finally {
      setPortalLoading(false);
    }
  };

  const getButtonLabel = (plan: Plan) => {
    if (plan.id === currentPlan) return 'Plano atual';
    if (loadingPlan === plan.id) return '';
    return plan.cta;
  };

  const isCurrentPlan = (id: string) => id === currentPlan;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all
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

      {/* Header */}
      <div className="text-center space-y-3">
        <Badge variant="secondary" className="text-xs px-3 py-1">
          <Brain className="h-3 w-3 mr-1.5" />
          Planos Cognora
        </Badge>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
          Escolha seu plano
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Comece de graça e faça upgrade quando precisar de mais poder. Cancele quando quiser.
        </p>

        {/* Plano atual badge */}
        {isAuthenticated && currentPlan !== 'free' && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <Badge className={`${currentPlan === 'unlimited' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300'}`}>
              {currentPlan === 'unlimited' ? <Crown className="h-3 w-3 mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
              Você está no plano {currentPlan === 'unlimited' ? 'Ilimitado' : 'Pro'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePortal}
              disabled={portalLoading}
              className="text-xs text-muted-foreground h-7"
            >
              {portalLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Gerenciar assinatura →'}
            </Button>
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = isCurrentPlan(plan.id);
          const isLoading = loadingPlan === plan.id;

          return (
            <Card
              key={plan.id}
              className={`relative flex flex-col p-6 transition-all
                ${plan.highlighted
                  ? 'border-indigo-500 shadow-lg shadow-indigo-500/10 dark:border-indigo-500'
                  : 'border-border'}
                ${isCurrent ? 'ring-2 ring-primary/40' : ''}`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-indigo-600 text-white text-xs px-3">
                    {plan.badge}
                  </Badge>
                </div>
              )}

              {/* Plan header */}
              <div className="mb-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center bg-secondary`}>
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

              {/* CTA */}
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

              {/* Features */}
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

      {/* Feature comparison — quick summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
        {[
          { icon: Brain, label: 'IA Generativa', desc: 'Resumos, questões e flashcards gerados por IA com base nos seus documentos.' },
          { icon: BookOpen, label: 'Estudo Personalizado', desc: 'Sistema de progresso com XP, níveis e streak para manter o ritmo.' },
          { icon: Trophy, label: 'Competições', desc: 'Duelos e ligas semanais para disputar com colegas em tempo real.' },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex gap-3 p-4 rounded-xl bg-secondary/40 border border-border">
            <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="space-y-3 pb-4">
        <h2 className="text-base font-semibold text-foreground">Perguntas frequentes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              q: 'Posso cancelar a qualquer momento?',
              a: 'Sim. Cancele quando quiser pelo portal de assinatura. O acesso continua até o fim do período pago.',
            },
            {
              q: 'O que acontece ao atingir o limite de gerações?',
              a: 'No plano Free, o contador renova todo dia. Faça upgrade para ter mais gerações diárias ou ilimitadas.',
            },
            {
              q: 'Meus dados são preservados ao fazer upgrade?',
              a: 'Sim. Todo seu conteúdo, matérias, documentos e progresso são mantidos.',
            },
            {
              q: 'Os pagamentos são seguros?',
              a: 'Sim. Usamos Stripe, a plataforma de pagamentos mais utilizada no mundo. Seus dados financeiros nunca passam pelo Cognora.',
            },
          ].map(({ q, a }) => (
            <div key={q} className="p-4 rounded-xl border border-border bg-card">
              <p className="text-sm font-semibold text-foreground mb-1">{q}</p>
              <p className="text-sm text-muted-foreground">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
