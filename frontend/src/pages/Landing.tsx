import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  GraduationCap, Brain, Zap, Crown, FileText,
  ArrowRight, Check, ChevronDown, Flame,
  BookOpen, BarChart3, Swords, BookX, Target, X, Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const FONT_URL =
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap';

/* ─── Scroll-reveal ──────────────────────────────────────────────────────── */
function Reveal({ children, delay = 0, className = '', style }: {
  children: React.ReactNode; delay?: number; className?: string; style?: React.CSSProperties;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref} className={className} style={style}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

/* ─── NavBar ─────────────────────────────────────────────────────────────── */
function NavBar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-14 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200"
      style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
    >
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
          <GraduationCap className="h-4 w-4 text-white" />
        </div>
        <span className="text-base font-bold text-slate-900 tracking-tight">Cognora</span>
      </div>
      <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
        <a href="#features" className="hover:text-slate-900 transition-colors">Recursos</a>
        <a href="#how"      className="hover:text-slate-900 transition-colors">Como funciona</a>
        <a href="#pricing"  className="hover:text-slate-900 transition-colors">Planos</a>
      </div>
      <div className="flex items-center gap-3">
        <Link to="/login" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">
          Entrar
        </Link>
        <Link to="/login">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg px-4">
            Começar grátis
          </Button>
        </Link>
      </div>
    </motion.nav>
  );
}

/* ─── Hero product cards ─────────────────────────────────────────────────── */
function MockSubjectCard() {
  return (
    <div className="rounded-2xl p-4 shadow-lg w-60 bg-white border border-slate-200">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
          <BookOpen className="h-4 w-4 text-indigo-600" />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-800">Direito Constitucional</p>
          <p className="text-[10px] text-slate-400">12 questões · 3 docs</p>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-1.5">
        <div className="h-full rounded-full bg-indigo-600" style={{ width: '73%' }} />
      </div>
      <div className="flex items-center justify-between text-[10px] text-slate-400">
        <span>73% estudado</span>
        <span className="flex items-center gap-0.5">
          <Flame className="h-3 w-3 text-amber-500" /> 7 dias
        </span>
      </div>
    </div>
  );
}

function MockQuestionCard() {
  const opts = [
    { l: 'A', t: 'A lei não se aplica à administração pública', ok: false },
    { l: 'B', t: 'A administração só pode fazer o que a lei permite', ok: true },
    { l: 'C', t: 'O agente tem discricionariedade total', ok: false },
  ];
  return (
    <div className="rounded-2xl p-4 shadow-lg w-68 bg-white border border-slate-200" style={{ width: '272px' }}>
      <div className="flex items-center gap-1.5 mb-2">
        <Brain className="h-3.5 w-3.5 text-indigo-500" />
        <span className="text-[10px] font-semibold text-indigo-600">IA · Múltipla escolha</span>
      </div>
      <p className="text-xs font-medium text-slate-800 mb-2.5">
        Qual princípio impede a administração de agir sem previsão legal?
      </p>
      <div className="space-y-1.5">
        {opts.map((o) => (
          <div key={o.l} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px]"
            style={{ background: o.ok ? '#ECFDF5' : '#F8F8F7', border: `1px solid ${o.ok ? '#A7F3D0' : 'transparent'}` }}>
            <span className="w-4 h-4 rounded-full flex items-center justify-center font-bold shrink-0 text-[9px]"
              style={{ background: o.ok ? '#059669' : '#E2E0DB', color: o.ok ? '#fff' : '#888' }}>
              {o.l}
            </span>
            <span style={{ color: o.ok ? '#059669' : '#6B7280' }}>{o.t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockStreakBadge() {
  return (
    <div className="rounded-xl px-3 py-2.5 shadow-md bg-white border border-slate-200 flex items-center gap-2">
      <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center text-lg">🔥</div>
      <div>
        <p className="text-xs font-bold text-slate-800">Sequência de 7 dias</p>
        <p className="text-[10px] text-slate-400">+1 geração bônus hoje</p>
      </div>
    </div>
  );
}

function MockCompCard() {
  return (
    <div className="rounded-xl px-3 py-2.5 shadow-md bg-white border border-slate-200 flex items-center gap-2">
      <div className="h-8 w-8 rounded-lg bg-violet-50 flex items-center justify-center">
        <Swords className="h-4 w-4 text-violet-600" />
      </div>
      <div>
        <p className="text-xs font-bold text-slate-800">Competição ao vivo</p>
        <p className="text-[10px] text-slate-400">2 participantes · 45s</p>
      </div>
    </div>
  );
}

/* ─── Hero ───────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16 bg-gradient-to-b from-slate-50 to-white">
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, #CBD5E1 1px, transparent 1px)', backgroundSize: '36px 36px', opacity: 0.4 }} />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full pointer-events-none bg-indigo-100 blur-3xl opacity-50" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-14 w-full grid md:grid-cols-2 gap-16 items-center py-20"
        style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>

        {/* Copy */}
        <div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Badge variant="outline" className="mb-6 text-xs font-semibold rounded-full px-3 py-1 bg-indigo-50 text-indigo-600 border-indigo-200">
              IA para concursos e ENEM
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl md:text-6xl font-extrabold leading-[1.06] tracking-tight text-slate-900 mb-5">
            Pare de esquecer<br />
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              o que estudou.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="text-lg text-slate-500 leading-relaxed mb-8">
            Envie seu PDF, gere questões e resumos com IA e revise automaticamente o que você precisa lembrar — até a véspera da prova.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.28 }}
            className="flex flex-col sm:flex-row gap-3 mb-10">
            <Link to="/login">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl px-7 py-6 text-base gap-2 shadow-lg shadow-indigo-200">
                Começar grátis agora <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-50 font-medium rounded-xl px-7 py-6 text-base">
                Ver recursos <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </a>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="flex items-center gap-4 text-sm text-slate-400">
            <div className="flex -space-x-2">
              {['🧑‍🎓','👩‍⚕️','🧑‍💻','👨‍📚'].map((e, i) => (
                <span key={i} className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-sm shadow-sm">{e}</span>
              ))}
            </div>
            <span><strong className="text-slate-700">+500 estudantes</strong> já usam o Cognora</span>
          </motion.div>
        </div>

        {/* Floating cards */}
        <div className="relative hidden md:flex items-center justify-center h-[500px]">
          <motion.div
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            style={{ position: 'absolute', top: 0, right: 0, animation: 'floatA 5s ease-in-out infinite' }}>
            <MockSubjectCard />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            style={{ position: 'absolute', bottom: 40, left: 0, animation: 'floatB 6s ease-in-out infinite' }}>
            <MockQuestionCard />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            style={{ position: 'absolute', bottom: 180, right: 0, animation: 'floatC 4.5s ease-in-out infinite' }}>
            <MockStreakBadge />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            style={{ position: 'absolute', top: 200, left: 10, animation: 'floatA 5.5s ease-in-out infinite 1s' }}>
            <MockCompCard />
          </motion.div>
        </div>
      </div>

      <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-300">
        <ChevronDown className="h-5 w-5" />
      </motion.div>

      <style>{`
        @keyframes floatA { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes floatB { 0%,100%{transform:translateY(0)} 50%{transform:translateY(10px)} }
        @keyframes floatC { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
      `}</style>
    </section>
  );
}

/* ─── Features (floating cards — symmetric 3+3) ──────────────────────────── */
const LEFT_FEATURES = [
  { icon: Brain,     color: 'text-indigo-600', bg: 'bg-indigo-50',  title: 'Questões por IA',     desc: 'MCQ e V/F gerados automaticamente do seu PDF pela IA.', anim: 'fc1', dur: '5.2s', delay: '0s' },
  { icon: BookX,     color: 'text-rose-500',   bg: 'bg-rose-50',    title: 'Caderno de Erros',    desc: 'Todo erro salvo automaticamente para revisão no momento certo.', anim: 'fc3', dur: '6.4s', delay: '0.6s' },
  { icon: BarChart3, color: 'text-emerald-600',bg: 'bg-emerald-50', title: 'Progresso & XP',      desc: 'Nível, streak e taxa de acerto por matéria em tempo real.', anim: 'fc5', dur: '5.8s', delay: '1.1s' },
];
const RIGHT_FEATURES = [
  { icon: FileText, color: 'text-violet-600', bg: 'bg-violet-50', title: 'Resumo Inteligente',  desc: 'Resumo estruturado do conteúdo gerado sem você escrever uma linha.', anim: 'fc2', dur: '4.8s', delay: '0.8s' },
  { icon: Swords,   color: 'text-amber-500',  bg: 'bg-amber-50',  title: 'Competições ao vivo', desc: 'Duele com colegas em tempo real. A pressão do duelo fixa o conteúdo.', anim: 'fc4', dur: '5.6s', delay: '0.3s' },
  { icon: Target,   color: 'text-cyan-600',   bg: 'bg-cyan-50',   title: 'Revisão automática',  desc: 'O sistema prioriza o que você mais precisa rever baseado nos seus erros.', anim: 'fc6', dur: '6.2s', delay: '0.9s' },
];

/* vertical anchors: top / middle / bottom — 3 cards, evenly spaced in 560px */
const V_TOPS = [20, 200, 380];

function Features() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="features" className="py-28 overflow-hidden bg-white">
      <div className="max-w-6xl mx-auto px-6 md:px-14">
        <Reveal className="text-center mb-16" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" } as React.CSSProperties}>
          <p className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-3">Recursos</p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Tudo que você precisa para{' '}
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              arrasar nos estudos
            </span>
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto text-lg">
            Do upload do documento à conquista do ranking — o Cognora cobre toda a sua jornada.
          </p>
        </Reveal>

        {/* ── Desktop: 3 | logo | 3 ── */}
        <div ref={ref} className="hidden md:block relative" style={{ height: 560 }}>

          {/* Left column */}
          {LEFT_FEATURES.map((f, i) => (
            <motion.div key={f.title}
              initial={{ opacity: 0, x: -24 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.55, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: 'absolute',
                top: V_TOPS[i],
                left: 0,
                width: 220,
                animation: inView ? `${f.anim} ${f.dur} ease-in-out ${f.delay} infinite` : 'none',
              }}
              className="rounded-2xl p-5 bg-white border border-slate-100 shadow-md"
            >
              <div className={`h-10 w-10 rounded-xl ${f.bg} flex items-center justify-center mb-3`}>
                <f.icon className={`h-5 w-5 ${f.color}`} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1"
                style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{f.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}

          {/* Center logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="w-44 h-44 rounded-3xl bg-indigo-600 flex flex-col items-center justify-center shadow-2xl shadow-indigo-200"
              style={{ animation: 'fc0 7s ease-in-out infinite' }}>
              <GraduationCap className="h-11 w-11 text-white mb-2" />
              <span className="text-white font-bold text-base"
                style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>Cognora</span>
            </div>
          </motion.div>

          {/* Right column */}
          {RIGHT_FEATURES.map((f, i) => (
            <motion.div key={f.title}
              initial={{ opacity: 0, x: 24 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.55, delay: i * 0.15 + 0.1, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: 'absolute',
                top: V_TOPS[i],
                right: 0,
                width: 220,
                animation: inView ? `${f.anim} ${f.dur} ease-in-out ${f.delay} infinite` : 'none',
              }}
              className="rounded-2xl p-5 bg-white border border-slate-100 shadow-md"
            >
              <div className={`h-10 w-10 rounded-xl ${f.bg} flex items-center justify-center mb-3`}>
                <f.icon className={`h-5 w-5 ${f.color}`} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1"
                style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{f.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}

          <style>{`
            @keyframes fc0 { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-8px)}  }
            @keyframes fc1 { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-14px)} }
            @keyframes fc2 { 0%,100%{transform:translateY(0)}   50%{transform:translateY(12px)}  }
            @keyframes fc3 { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-10px)} }
            @keyframes fc4 { 0%,100%{transform:translateY(0)}   50%{transform:translateY(14px)}  }
            @keyframes fc5 { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-12px)} }
            @keyframes fc6 { 0%,100%{transform:translateY(0)}   50%{transform:translateY(10px)}  }
          `}</style>
        </div>

        {/* ── Mobile: grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
          {[...LEFT_FEATURES, ...RIGHT_FEATURES].map((f) => (
            <Reveal key={f.title}>
              <div className="rounded-2xl p-5 bg-white border border-slate-100 shadow-sm">
                <div className={`h-10 w-10 rounded-xl ${f.bg} flex items-center justify-center mb-3`}>
                  <f.icon className={`h-5 w-5 ${f.color}`} />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1"
                  style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How it works ───────────────────────────────────────────────────────── */
function HowItWorks() {
  return (
    <div className="bg-slate-50">
      <section id="how" className="py-28 px-6 max-w-5xl mx-auto">
        <Reveal className="text-center mb-16" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" } as React.CSSProperties}>
          <p className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-3">Como funciona</p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            De zero ao domínio em{' '}
            <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">3 passos</span>
          </h2>
          <p className="text-slate-500 max-w-lg mx-auto text-lg">Comece a estudar de forma inteligente em menos de 2 minutos.</p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-12 left-[22%] right-[22%] h-px bg-gradient-to-r from-indigo-200 via-violet-200 to-emerald-200" />
          {[
            { n:'01', icon: FileText, color:'text-indigo-600', bg:'bg-indigo-50', title:'Envie seu material', desc:'Upload de PDFs, apostilas ou cole o texto. O Cognora organiza por matéria automaticamente.' },
            { n:'02', icon: Brain,    color:'text-violet-600', bg:'bg-violet-50', title:'IA gera em segundos', desc:'Questões, resumo estruturado e flashcards criados automaticamente do seu conteúdo.' },
            { n:'03', icon: Target,   color:'text-emerald-600',bg:'bg-emerald-50',title:'Pratique e retenha',  desc:'Responda questões, veja seus erros e o sistema revisita o que você precisa fixar.' },
          ].map((s, i) => (
            <Reveal key={s.n} delay={i * 0.12} className="flex flex-col items-center text-center">
              <div className={`relative h-24 w-24 rounded-2xl ${s.bg} border border-slate-100 flex items-center justify-center mb-6 shadow-sm`}>
                <s.icon className={`h-9 w-9 ${s.color}`} />
                <span className="absolute -top-2.5 -right-2.5 h-6 w-6 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-500 flex items-center justify-center shadow-sm"
                  style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{s.n}</span>
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2"
                style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{s.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed max-w-xs">{s.desc}</p>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ─── Stats ──────────────────────────────────────────────────────────────── */
function Stats() {
  return (
    <div className="bg-indigo-600 py-16 px-6">
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        {[
          { n:'+500', l:'estudantes ativos' },
          { n:'+10k', l:'questões geradas' },
          { n:'3×',   l:'mais retenção vs leitura passiva' },
          { n:'98%',  l:'de satisfação' },
        ].map((s, i) => (
          <Reveal key={s.l} delay={i * 0.08} className="text-center">
            <p className="text-4xl font-extrabold text-white mb-1"
              style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{s.n}</p>
            <p className="text-sm text-indigo-200">{s.l}</p>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

/* ─── Pricing ────────────────────────────────────────────────────────────── */
const PLANS = [
  {
    id:'free',  icon:BookOpen, iconBg:'bg-slate-100',  iconColor:'text-slate-400',
    name:'Free', price:'R$0',     period:'para sempre',
    desc:'Para começar sem compromisso.',
    features:['3 gerações de IA por dia','2 matérias','1 documento por matéria','Upload até 5 MB','1 competição ativa','Questões ilimitadas'],
    nope:['Sem suporte prioritário'],
    cta:'Começar grátis', highlight:false,
  },
  {
    id:'pro',   icon:Zap,      iconBg:'bg-indigo-50',  iconColor:'text-indigo-600',
    name:'Pro',  price:'R$9,90', period:'/mês', badge:'Mais popular',
    desc:'Para quem estuda de verdade.',
    features:['20 gerações de IA por dia','Matérias ilimitadas','Documentos ilimitados','Upload até 25 MB','Competições ilimitadas','Suporte prioritário'],
    nope:[] as string[],
    cta:'Assinar Pro', highlight:true,
  },
  {
    id:'unlimited', icon:Crown, iconBg:'bg-amber-50', iconColor:'text-amber-500',
    name:'Ilimitado', price:'R$19,90', period:'/mês',
    desc:'Poder total. Zero restrições.',
    features:['Gerações ilimitadas','Tudo do Pro','Upload até 50 MB','Acesso antecipado a novidades'],
    nope:[] as string[],
    cta:'Assinar Ilimitado', highlight:false,
  },
];

function Pricing() {
  return (
    <section id="pricing" className="py-28 px-6 bg-white"
      style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
      <div className="max-w-5xl mx-auto">
        <Reveal className="text-center mb-14">
          <p className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-3">Planos</p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-3">
            Simples. Justo.{' '}
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">Sem surpresas.</span>
          </h2>
          <p className="text-slate-500 text-lg">Comece grátis. Faça upgrade quando precisar. Cancele quando quiser.</p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-5 items-start">
          {PLANS.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.1}>
              <div className={`relative rounded-2xl p-7 flex flex-col gap-5 transition-all ${
                p.highlight
                  ? 'bg-indigo-600 border border-indigo-600 shadow-xl shadow-indigo-200'
                  : 'bg-white border border-slate-200 hover:shadow-md'
              }`}>
                {p.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="default" className="bg-slate-900 text-white text-[11px] font-bold px-3 py-0.5 border-none">
                      {p.badge}
                    </Badge>
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${p.highlight ? 'bg-white/15' : p.iconBg}`}>
                      <p.icon className={`h-4 w-4 ${p.highlight ? 'text-white' : p.iconColor}`} />
                    </div>
                    <span className={`font-bold ${p.highlight ? 'text-white' : 'text-slate-900'}`}>{p.name}</span>
                  </div>
                  <div className="flex items-end gap-1 mb-1">
                    <span className={`text-4xl font-extrabold ${p.highlight ? 'text-white' : 'text-slate-900'}`}>{p.price}</span>
                    <span className={`text-sm mb-1.5 ${p.highlight ? 'text-indigo-200' : 'text-slate-400'}`}>{p.period}</span>
                  </div>
                  <p className={`text-sm ${p.highlight ? 'text-indigo-200' : 'text-slate-500'}`}>{p.desc}</p>
                </div>

                <Link to="/login">
                  <Button className={`w-full font-semibold rounded-xl py-5 ${
                    p.highlight
                      ? 'bg-white text-indigo-600 hover:bg-indigo-50'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}>
                    {p.cta}
                  </Button>
                </Link>

                <ul className="space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <div className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 ${p.highlight ? 'bg-white/20' : 'bg-emerald-50'}`}>
                        <Check className={`h-2.5 w-2.5 ${p.highlight ? 'text-white' : 'text-emerald-600'}`} />
                      </div>
                      <span className={p.highlight ? 'text-indigo-100' : 'text-slate-600'}>{f}</span>
                    </li>
                  ))}
                  {p.nope.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <div className="h-4 w-4 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <X className="h-2.5 w-2.5 text-slate-400" />
                      </div>
                      <span className="text-slate-400">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Testimonials ───────────────────────────────────────────────────────── */
function Testimonials() {
  const items = [
    { name:'Lucas M.', role:'Concurseiro', avatar:'🧑‍💼', text:'A geração de questões do PDF da apostila foi um divisor de águas. Passei no concurso depois de 3 meses usando o Cognora.' },
    { name:'Ana C.',   role:'Medicina',    avatar:'👩‍⚕️', text:'O caderno de erros me ajudou a identificar exatamente onde falhava. Minha nota em fisiologia subiu 30%.' },
    { name:'Pedro R.', role:'Universitário',avatar:'🧑‍💻', text:'As competições me mantêm motivado toda semana. Aprendo competindo de um jeito que não conseguia estudando sozinho.' },
  ];
  return (
    <div className="bg-slate-50">
      <section className="py-24 px-6 max-w-5xl mx-auto">
        <Reveal className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-2"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
            O que nossos estudantes dizem
          </h2>
          <p className="text-slate-500">Resultados reais de quem usa o Cognora no dia a dia.</p>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {items.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.1}>
              <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all">
                <div className="flex mb-3">
                  {[...Array(5)].map((_, j) => <Star key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">"{t.text}"</p>
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{t.avatar}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900"
                      style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{t.name}</p>
                    <p className="text-xs text-slate-400">{t.role}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ─── Final CTA ──────────────────────────────────────────────────────────── */
function FinalCTA() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <section ref={ref} className="py-32 px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-3xl mx-auto rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 p-12 text-center relative overflow-hidden shadow-2xl shadow-indigo-200"
        style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
        <div className="absolute inset-0 pointer-events-none opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="relative z-10">
          <div className="h-14 w-14 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-5">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            Seu próximo simulado<br />pode ser amanhã.
          </h2>
          <p className="text-indigo-100 text-lg mb-8 max-w-lg mx-auto">
            Crie sua conta grátis agora e comece a estudar de forma inteligente ainda hoje.
          </p>
          <Link to="/login">
            <Button size="lg" className="bg-white text-indigo-700 hover:bg-indigo-50 font-semibold rounded-xl px-10 py-6 text-base gap-2 shadow-lg">
              Criar conta grátis <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="text-xs text-indigo-300 mt-4">Sem cartão de crédito. Gratuito para sempre no plano Free.</p>
        </div>
      </motion.div>
    </section>
  );
}

/* ─── Footer ─────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-6 py-8">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-indigo-600 flex items-center justify-center">
            <GraduationCap className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-slate-600 font-semibold"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>Cognora</span>
        </div>
        <p>© 2025 Cognora. Todos os direitos reservados.</p>
        <div className="flex gap-5">
          <Link to="/login" className="hover:text-slate-600 transition-colors">Entrar</Link>
          <a href="#pricing" className="hover:text-slate-600 transition-colors">Planos</a>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function Landing() {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONT_URL;
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <div className="pt-16">
        <Hero />
        <Features />
        <HowItWorks />
        <Stats />
        <Pricing />
        <Testimonials />
        <FinalCTA />
        <Footer />
      </div>
    </div>
  );
}
