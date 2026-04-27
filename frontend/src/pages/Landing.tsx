import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import {
  GraduationCap, Brain, Zap, Crown, Trophy, Swords,
  FileText, HelpCircle, Sparkles, ArrowRight,
  Check, Star, ChevronDown, BookX, BarChart3, Target, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/* ─── Animation helpers ──────────────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
};

const stagger = (delay = 0.1) => ({
  visible: { transition: { staggerChildren: delay } },
});

function Section({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.section
      ref={ref}
      id={id}
      variants={stagger()}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ─── NavBar ─────────────────────────────────────────────────────────────── */
function NavBar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200"
    >
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
          <GraduationCap className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-bold text-slate-900 tracking-tight">Cognora</span>
      </div>
      <div className="hidden md:flex items-center gap-7 text-sm text-slate-500">
        <a href="#features" className="hover:text-slate-900 transition-colors">Recursos</a>
        <a href="#how" className="hover:text-slate-900 transition-colors">Como funciona</a>
        <a href="#pricing" className="hover:text-slate-900 transition-colors">Preços</a>
      </div>
      <div className="flex items-center gap-3">
        <Link to="/login" className="text-sm text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">
          Entrar
        </Link>
        <Link to="/login">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4">
            Começar grátis
          </Button>
        </Link>
      </div>
    </motion.nav>
  );
}

/* ─── Hero ───────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden bg-gradient-to-b from-slate-50 to-white">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-100 rounded-full blur-[120px] opacity-60" />
        <div className="absolute top-2/3 left-1/5 w-[350px] h-[350px] bg-violet-100 rounded-full blur-[100px] opacity-50" />
        <div className="absolute top-1/4 right-1/5 w-[280px] h-[280px] bg-emerald-100 rounded-full blur-[80px] opacity-40" />
      </div>
      <div
        className="absolute inset-0 opacity-[0.35] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)', backgroundSize: '32px 32px' }}
      />

      <div className="relative z-10 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
          <Badge variant="outline" className="mb-6 bg-indigo-50 text-indigo-600 border-indigo-200 text-xs px-3 py-1 rounded-full">
            <Sparkles className="h-3 w-3 mr-1.5" />
            IA para estudantes — gratuito para começar
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl md:text-7xl font-extrabold text-slate-900 leading-[1.08] tracking-tight mb-6"
        >
          Estude mais{' '}
          <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-emerald-500 bg-clip-text text-transparent">
            inteligente
          </span>
          {' '}com IA
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          O Cognora transforma seus documentos em questões, resumos e flashcards gerados por IA.
          Compete com colegas, acompanha seu progresso e domina qualquer matéria.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link to="/login">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-6 text-base font-semibold rounded-xl gap-2 shadow-lg shadow-indigo-200">
              Começar grátis agora
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <a href="#how">
            <Button size="lg" variant="outline" className="border-slate-300 text-slate-600 hover:bg-slate-50 px-8 py-6 text-base rounded-xl gap-2">
              Ver como funciona
              <ChevronDown className="h-4 w-4" />
            </Button>
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-slate-400"
        >
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-2">
              {['🧑‍🎓', '👩‍💻', '🧑‍🔬', '👨‍📚'].map((e, i) => (
                <span key={i} className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-sm shadow-sm">{e}</span>
              ))}
            </div>
            <span>+500 estudantes ativos</span>
          </div>
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}
            <span className="ml-1">4.9 / 5</span>
          </div>
        </motion.div>
      </div>

      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-slate-300"
      >
        <ChevronDown className="h-5 w-5" />
      </motion.div>
    </section>
  );
}

/* ─── Horizontal scroll (Features) ──────────────────────────────────────── */
const FEATURES = [
  {
    icon: Brain,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    accent: 'border-indigo-200',
    title: 'IA Generativa',
    desc: 'Envie qualquer PDF ou texto e a IA gera questões, resumos e flashcards personalizados em segundos.',
    tag: 'Powered by Gemini',
  },
  {
    icon: HelpCircle,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    accent: 'border-violet-200',
    title: 'Questões Inteligentes',
    desc: 'Múltipla escolha ou verdadeiro/falso gerados automaticamente. Pratique no ritmo que quiser.',
    tag: 'MCQ & V/F',
  },
  {
    icon: BookX,
    color: 'text-rose-500',
    bg: 'bg-rose-50',
    accent: 'border-rose-200',
    title: 'Caderno de Erros',
    desc: 'Todo erro vira oportunidade. O sistema registra o que você errou para revisar no momento certo.',
    tag: 'Revisão ativa',
  },
  {
    icon: Swords,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    accent: 'border-amber-200',
    title: 'Competições',
    desc: 'Duele com colegas em tempo real. Quem responde mais rápido e correto sobe no ranking.',
    tag: 'Tempo real',
  },
  {
    icon: BarChart3,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    accent: 'border-emerald-200',
    title: 'Progresso & XP',
    desc: 'Acompanhe seu desempenho com XP, níveis e streak diário. Gamificação que mantém você motivado.',
    tag: 'Gamificação',
  },
  {
    icon: Trophy,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
    accent: 'border-cyan-200',
    title: 'Ranking Global',
    desc: 'Ligas semanais com os estudantes mais dedicados. Suba para o topo e mostre seu conhecimento.',
    tag: 'Ligas semanais',
  },
];

function HorizontalScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });
  // translate the strip from 0 to -(total - 100vw) — 6 cards × 420px = 2520px, minus 1 visible
  const x = useTransform(scrollYProgress, [0, 1], ['0%', '-62%']);

  return (
    <div id="features" ref={containerRef} style={{ height: '400vh' }}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}
        className="flex flex-col justify-center bg-white"
      >
        {/* Section label */}
        <div className="px-8 md:px-16 mb-8">
          <Badge variant="outline" className="mb-3 bg-violet-50 text-violet-600 border-violet-200 text-xs px-3 py-1 rounded-full">
            Recursos
          </Badge>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            Tudo que você precisa para{' '}
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              arrasar nos estudos
            </span>
          </h2>
          <p className="text-slate-500 mt-2 text-base">Role para ver todos os recursos →</p>
        </div>

        {/* Scrolling strip */}
        <div style={{ overflow: 'hidden' }}>
          <motion.div
            style={{ x }}
            className="flex gap-5 pl-8 md:pl-16 pr-8"
          >
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className={`shrink-0 w-[340px] md:w-[420px] p-7 rounded-2xl border ${f.accent} bg-white shadow-sm flex flex-col gap-4`}
              >
                <div className="flex items-start justify-between">
                  <div className={`h-12 w-12 rounded-xl ${f.bg} flex items-center justify-center`}>
                    <f.icon className={`h-6 w-6 ${f.color}`} />
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${f.bg} ${f.color}`}>{f.tag}</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg mb-1.5">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Progress indicator */}
        <div className="px-8 md:px-16 mt-6 flex gap-1.5">
          {FEATURES.map((_f, i) => (
            <motion.div
              key={i}
              style={{ scaleX: useTransform(scrollYProgress, [i / FEATURES.length, (i + 1) / FEATURES.length], [0, 1]) }}
              className="h-1 w-8 bg-indigo-600 rounded-full origin-left"
            />
          ))}
          <div className="h-1 flex-1 bg-slate-100 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/* ─── How it works ───────────────────────────────────────────────────────── */
const STEPS = [
  {
    n: '01',
    icon: FileText,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    title: 'Envie seu material',
    desc: 'Faça upload de PDFs, apostilas ou cole seu texto. O Cognora aceita qualquer formato.',
  },
  {
    n: '02',
    icon: Brain,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    title: 'IA processa e gera',
    desc: 'Nossa IA analisa o conteúdo e cria questões, resumos e flashcards em segundos.',
  },
  {
    n: '03',
    icon: Target,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    title: 'Pratique e evolua',
    desc: 'Responda questões, revise erros e dispute rankings. Quanto mais você usa, mais aprende.',
  },
];

function HowItWorks() {
  return (
    <div className="bg-slate-50 py-1">
      <Section id="how" className="py-28 px-6 max-w-5xl mx-auto">
        <motion.div variants={fadeUp} className="text-center mb-16">
          <Badge variant="outline" className="mb-4 bg-emerald-50 text-emerald-600 border-emerald-200 text-xs px-3 py-1 rounded-full">
            Como funciona
          </Badge>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            De zero ao domínio em{' '}
            <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
              3 passos
            </span>
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto text-lg">
            Simples, rápido e eficaz. Comece a estudar em menos de 2 minutos.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-12 left-[22%] right-[22%] h-px bg-gradient-to-r from-indigo-200 via-violet-200 to-emerald-200" />
          {STEPS.map((s) => (
            <motion.div key={s.n} variants={fadeUp} className="flex flex-col items-center text-center">
              <div className={`relative h-24 w-24 rounded-2xl ${s.bg} border border-slate-100 flex items-center justify-center mb-6 shadow-sm`}>
                <s.icon className={`h-9 w-9 ${s.color}`} />
                <span className="absolute -top-2.5 -right-2.5 h-6 w-6 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-500 flex items-center justify-center shadow-sm">
                  {s.n}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">{s.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed max-w-xs">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ─── Stats band ─────────────────────────────────────────────────────────── */
function Stats() {
  const stats = [
    { value: '+500', label: 'Estudantes ativos' },
    { value: '+10k', label: 'Questões geradas' },
    { value: '98%', label: 'Satisfação' },
    { value: '3x', label: 'Mais rápido para aprender' },
  ];
  return (
    <div className="bg-indigo-600 py-16 px-6">
      <Section className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((s) => (
          <motion.div key={s.label} variants={fadeUp} className="text-center">
            <p className="text-4xl font-extrabold text-white mb-1">{s.value}</p>
            <p className="text-sm text-indigo-200">{s.label}</p>
          </motion.div>
        ))}
      </Section>
    </div>
  );
}

/* ─── Pricing preview ────────────────────────────────────────────────────── */
const PREVIEW_PLANS = [
  {
    id: 'free',
    icon: Sparkles,
    iconColor: 'text-slate-400',
    iconBg: 'bg-slate-100',
    name: 'Free',
    price: 'R$0',
    period: 'para sempre',
    features: [
      '3 gerações de IA por dia',
      '2 matérias',
      '1 documento por matéria',
      'Upload até 5 MB',
      '1 competição ativa',
      'Questões ilimitadas',
    ],
    limits: [] as string[],
    cta: 'Começar grátis',
    highlight: false,
  },
  {
    id: 'pro',
    icon: Zap,
    iconColor: 'text-indigo-600',
    iconBg: 'bg-indigo-50',
    name: 'Pro',
    price: 'R$9,90',
    period: '/mês',
    badge: 'Mais popular',
    features: [
      '20 gerações de IA por dia',
      'Matérias ilimitadas',
      'Documentos ilimitados',
      'Upload até 25 MB',
      'Competições ilimitadas',
      'Suporte prioritário',
    ],
    limits: [] as string[],
    cta: 'Assinar Pro',
    highlight: true,
  },
  {
    id: 'unlimited',
    icon: Crown,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-50',
    name: 'Ilimitado',
    price: 'R$19,90',
    period: '/mês',
    features: [
      'Gerações de IA ilimitadas',
      'Tudo do Pro',
      'Upload até 50 MB',
      'Acesso antecipado a novidades',
    ],
    limits: [] as string[],
    cta: 'Assinar Ilimitado',
    highlight: false,
  },
];

function PricingPreview() {
  return (
    <Section id="pricing" className="py-28 px-6 max-w-5xl mx-auto">
      <motion.div variants={fadeUp} className="text-center mb-14">
        <Badge variant="outline" className="mb-4 bg-amber-50 text-amber-600 border-amber-200 text-xs px-3 py-1 rounded-full">
          Planos
        </Badge>
        <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
          Comece de graça,{' '}
          <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
            cresça sem limites
          </span>
        </h2>
        <p className="text-slate-500 max-w-xl mx-auto text-lg">
          Cancele quando quiser. Sem contratos. Sem pegadinhas.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {PREVIEW_PLANS.map((p) => (
          <motion.div
            key={p.id}
            variants={fadeUp}
            className={`relative rounded-2xl p-6 border transition-all ${
              p.highlight
                ? 'border-indigo-400 shadow-xl shadow-indigo-100 ring-1 ring-indigo-400'
                : 'border-slate-200 bg-white hover:shadow-md'
            }`}
          >
            {p.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge variant="default" className="bg-indigo-600 text-white text-xs px-3">{p.badge}</Badge>
              </div>
            )}
            <div className="flex items-center gap-2.5 mb-4">
              <div className={`h-9 w-9 rounded-xl ${p.iconBg} flex items-center justify-center`}>
                <p.icon className={`h-5 w-5 ${p.iconColor}`} />
              </div>
              <span className="font-bold text-slate-900">{p.name}</span>
            </div>
            <div className="mb-5">
              <span className="text-3xl font-extrabold text-slate-900">{p.price}</span>
              <span className="text-sm text-slate-400 ml-1">{p.period}</span>
            </div>
            <ul className="space-y-2 mb-6">
              {p.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link to="/login">
              <Button
                variant={p.highlight ? 'default' : 'outline'}
                className={`w-full ${p.highlight ? 'bg-indigo-600 hover:bg-indigo-500' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
              >
                {p.cta}
              </Button>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Comparison table */}
      <motion.div variants={fadeUp} className="mt-12 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-4 text-slate-500 font-medium">Recurso</th>
              <th className="text-center py-3 px-4 text-slate-700 font-semibold">Free</th>
              <th className="text-center py-3 px-4 text-indigo-600 font-semibold">Pro</th>
              <th className="text-center py-3 px-4 text-amber-600 font-semibold">Ilimitado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[
              ['Gerações de IA/dia', '3', '20', '∞'],
              ['Matérias', '2', '∞', '∞'],
              ['Documentos por matéria', '1', '∞', '∞'],
              ['Tamanho máximo do arquivo', '5 MB', '25 MB', '50 MB'],
              ['Competições ativas', '1', '∞', '∞'],
              ['Questões & Flashcards', '∞', '∞', '∞'],
              ['Ranking & Competições', <Check className="h-4 w-4 text-emerald-500 mx-auto" />, <Check className="h-4 w-4 text-emerald-500 mx-auto" />, <Check className="h-4 w-4 text-emerald-500 mx-auto" />],
              ['Suporte prioritário', <X className="h-4 w-4 text-slate-300 mx-auto" />, <Check className="h-4 w-4 text-emerald-500 mx-auto" />, <Check className="h-4 w-4 text-emerald-500 mx-auto" />],
            ].map(([label, free, pro, unl], i) => (
              <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3 px-4 text-slate-600">{label}</td>
                <td className="py-3 px-4 text-center text-slate-500">{free}</td>
                <td className="py-3 px-4 text-center font-medium text-indigo-700">{pro}</td>
                <td className="py-3 px-4 text-center font-medium text-amber-700">{unl}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </Section>
  );
}

/* ─── Testimonials ───────────────────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    name: 'Lucas M.',
    role: 'Concurseiro',
    avatar: '🧑‍💼',
    text: 'Usei o Cognora pra estudar para o ENEM. A geração de questões do PDF da apostila foi um divisor de águas. Passei!',
  },
  {
    name: 'Ana C.',
    role: 'Estudante de Medicina',
    avatar: '👩‍⚕️',
    text: 'O caderno de erros me ajudou a identificar exatamente onde eu estava falhando. Minha nota em fisiologia subiu 30%.',
  },
  {
    name: 'Pedro R.',
    role: 'Universitário',
    avatar: '🧑‍💻',
    text: 'As competições me mantêm motivado toda semana. É viciante! E aprender competindo é muito mais eficiente.',
  },
];

function Testimonials() {
  return (
    <div className="bg-slate-50 py-1">
      <Section className="py-24 px-6 max-w-5xl mx-auto">
        <motion.div variants={fadeUp} className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
            O que nossos estudantes dizem
          </h2>
          <p className="text-slate-500">Resultados reais de quem usa o Cognora no dia a dia.</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t) => (
            <motion.div
              key={t.name}
              variants={fadeUp}
              className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex mb-3">
                {[...Array(5)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">"{t.text}"</p>
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{t.avatar}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ─── Final CTA ──────────────────────────────────────────────────────────── */
function FinalCTA() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  return (
    <section ref={ref} className="py-32 px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.7 }}
        className="max-w-3xl mx-auto rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 p-12 text-center relative overflow-hidden shadow-2xl shadow-indigo-200"
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
        <div className="relative z-10">
          <div className="h-14 w-14 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-5">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            Pronto para estudar de verdade?
          </h2>
          <p className="text-indigo-100 text-lg mb-8 max-w-lg mx-auto">
            Junte-se a centenas de estudantes que já usam IA para aprender mais em menos tempo.
          </p>
          <Link to="/login">
            <Button size="lg" className="bg-white text-indigo-700 hover:bg-indigo-50 px-10 py-6 text-base font-semibold rounded-xl gap-2 shadow-lg">
              Criar conta grátis
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="text-xs text-indigo-300 mt-4">Sem cartão de crédito. Sempre gratuito para começar.</p>
        </div>
      </motion.div>
    </section>
  );
}

/* ─── Footer ─────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-slate-200 px-6 py-8 bg-white">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-indigo-600 flex items-center justify-center">
            <GraduationCap className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-slate-600 font-semibold">Cognora</span>
        </div>
        <p>© 2025 Cognora. Todos os direitos reservados.</p>
        <div className="flex gap-5">
          <Link to="/login" className="hover:text-slate-600 transition-colors">Entrar</Link>
          <a href="#pricing" className="hover:text-slate-600 transition-colors">Preços</a>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <NavBar />
      <div className="pt-16">
        <Hero />
        <HorizontalScroll />
        <HowItWorks />
        <Stats />
        <PricingPreview />
        <Testimonials />
        <FinalCTA />
        <Footer />
      </div>
    </div>
  );
}
