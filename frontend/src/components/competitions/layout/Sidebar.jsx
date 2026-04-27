import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, FileText, HelpCircle,
  GraduationCap, User, Trophy, Swords, BookX,
  Zap, Sparkles, Crown, CreditCard, ArrowUpCircle,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const NAV_SECTIONS = [
  {
    label: 'MENU',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/subjects', label: 'Matérias', icon: BookOpen },
      { path: '/documents', label: 'Documentos', icon: FileText },
      { path: '/quiz', label: 'Questões', icon: HelpCircle },
      { path: '/error-notebook', label: 'Caderno de Erros', icon: BookX },
    ],
  },
  {
    label: 'PROGRESSO',
    items: [
      { path: '/profile', label: 'Meu Progresso', icon: User },
      { path: '/competitions', label: 'Competições', icon: Swords },
      { path: '/leaderboard', label: 'Ranking', icon: Trophy },
    ],
  },
  {
    label: 'PLANOS',
    items: [
      { path: '/pricing', label: 'Preços', icon: CreditCard },
    ],
  },
];

const PLAN_LABELS = {
  free: null,
  pro: { label: 'Pro', icon: Zap, cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
  unlimited: { label: 'Ilimitado', icon: Crown, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
};

export default function Sidebar({ isOpen = true }) {
  const location = useLocation();

  const { data: genStatus } = useQuery({
    queryKey: ['limits-status'],
    queryFn: () => base44.limits.getStatus(),
    staleTime: 30_000,
  });

  const plan = genStatus?.plan || 'free';
  const isUnlimited = plan === 'unlimited';
  const genUsedPct = genStatus && !isUnlimited
    ? Math.round((genStatus.used / genStatus.limit) * 100)
    : 0;
  const genEmpty = !isUnlimited && genStatus?.remaining === 0;
  const genBonus = genStatus?.has_daily_bonus;
  const planInfo = PLAN_LABELS[plan];

  return (
    <aside className={`fixed left-0 top-0 h-screen w-64 bg-card border-r border-border flex flex-col z-30 transition-all duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>

      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-5 h-[70px] border-b border-border shrink-0">
        <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <GraduationCap className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-foreground tracking-tight">Cognora</span>
          {planInfo && (
            <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${planInfo.cls}`}>
              <planInfo.icon className="h-2.5 w-2.5" />
              {planInfo.label}
            </span>
          )}
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-4 py-4 overflow-y-auto space-y-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="text-[11px] font-semibold text-muted-foreground/60 tracking-widest mb-2 px-2">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <item.icon className="h-4.5 w-4.5 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div className="border-t border-border px-4 py-4 space-y-3">

        {/* Gerações (só exibe se não for ilimitado) */}
        {genStatus && !isUnlimited && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                {genBonus && !genEmpty
                  ? <Zap className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                  : <Sparkles className={`h-3.5 w-3.5 ${genEmpty ? 'text-red-400' : 'text-muted-foreground'}`} />
                }
                <span className={`text-xs font-medium ${genEmpty ? 'text-red-500' : 'text-muted-foreground'}`}>
                  Gerações hoje
                </span>
              </div>
              <span className={`text-xs font-bold tabular-nums ${genEmpty ? 'text-red-500' : 'text-foreground'}`}>
                {genStatus.remaining}/{genStatus.limit}
              </span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  genEmpty ? 'bg-red-400' : genBonus ? 'bg-amber-400' : 'bg-primary'
                }`}
                style={{ width: `${Math.max(genEmpty ? 0 : 4, genUsedPct)}%` }}
              />
            </div>
            {genEmpty && (
              <p className="text-xs text-red-500 mt-1">Limite atingido. Renova amanhã.</p>
            )}
          </div>
        )}

        {/* CTA de upgrade — só no plano free */}
        {plan === 'free' && (
          <Link
            to="/pricing"
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold transition-all shadow-sm"
          >
            <ArrowUpCircle className="h-4 w-4 shrink-0" />
            <span>Fazer upgrade de plano</span>
          </Link>
        )}

      </div>
    </aside>
  );
}
