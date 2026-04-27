import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import {
  GraduationCap, Brain, Zap, Crown, FileText,
  ArrowRight, Check, ChevronDown, Flame,
  Upload, X, BookOpen, BarChart3,
  Swords, BookX, Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/* ─── Font injection ─────────────────────────────────────────────────────── */
const FONT_URL =
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600&display=swap';

/* ─── Design tokens ──────────────────────────────────────────────────────── */
const D = {
  bg:         '#FAFAF8',
  surface:    '#FFFFFF',
  dark:       '#111110',
  darkSurf:   '#1C1C1A',
  text:       '#1A1A18',
  textSub:    '#6B6860',
  textMuted:  '#A8A49D',
  textDark:   '#F0EFE9',
  textDarkSub:'#8A8880',
  accent:     '#2563EB',
  accentHov:  '#1D4ED8',
  accentLt:   '#EFF6FF',
  success:    '#059669',
  successLt:  '#ECFDF5',
  border:     '#E8E7E2',
  borderDark: '#2C2C2A',
  fontDisplay:"'Space Grotesk', system-ui, sans-serif",
  fontBody:   "'DM Sans', system-ui, sans-serif",
};

/* ─── Scroll-reveal wrapper ──────────────────────────────────────────────── */
function Reveal({
  children, delay = 0, y = 28, className = '',
}: {
  children: React.ReactNode; delay?: number; y?: number; className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── NavBar ─────────────────────────────────────────────────────────────── */
function NavBar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ background: 'rgba(250,250,248,0.92)', borderBottom: `1px solid ${D.border}`, fontFamily: D.fontDisplay }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-14 h-16 backdrop-blur-md"
    >
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: D.accent }}>
          <GraduationCap className="h-4 w-4 text-white" />
        </div>
        <span className="text-base font-bold tracking-tight" style={{ color: D.text }}>Cognora</span>
      </div>

      <div className="hidden md:flex items-center gap-8 text-sm font-medium" style={{ color: D.textSub }}>
        {['#problem', '#solution', '#pricing'].map((href, i) => (
          <a key={href} href={href} className="hover:text-slate-900 transition-colors">
            {['Problema', 'Como funciona', 'Planos'][i]}
          </a>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Link to="/login" className="text-sm font-medium hidden sm:block transition-colors"
          style={{ color: D.textSub }}>
          Entrar
        </Link>
        <Link to="/login">
          <Button size="sm" className="text-sm font-semibold rounded-lg px-4"
            style={{ background: D.accent, color: '#fff' }}>
            Começar grátis
          </Button>
        </Link>
      </div>
    </motion.nav>
  );
}

/* ─── Hero product mockup ────────────────────────────────────────────────── */
function MockSubjectCard() {
  return (
    <div className="rounded-2xl p-4 shadow-lg w-64"
      style={{ background: D.surface, border: `1px solid ${D.border}`, fontFamily: D.fontBody }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: '#EFF6FF' }}>
          <BookOpen className="h-4 w-4" style={{ color: D.accent }} />
        </div>
        <div>
          <p className="text-xs font-semibold" style={{ color: D.text }}>Direito Constitucional</p>
          <p className="text-[10px]" style={{ color: D.textMuted }}>12 questões · 3 docs</p>
        </div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: '#F0EFE9' }}>
        <div className="h-full rounded-full" style={{ width: '73%', background: D.accent }} />
      </div>
      <div className="flex items-center justify-between text-[10px]" style={{ color: D.textMuted }}>
        <span>73% estudado</span>
        <span className="flex items-center gap-0.5">
          <Flame className="h-3 w-3 text-amber-500" /> streak 7 dias
        </span>
      </div>
    </div>
  );
}

function MockQuestionCard() {
  const opts = [
    { l: 'A', t: 'A lei não se aplica à administração pública federal', ok: false },
    { l: 'B', t: 'A administração só pode fazer o que a lei permite', ok: true },
    { l: 'C', t: 'O agente tem discricionariedade total de atuação', ok: false },
  ];
  return (
    <div className="rounded-2xl p-4 shadow-lg w-72"
      style={{ background: D.surface, border: `1px solid ${D.border}`, fontFamily: D.fontBody }}>
      <div className="flex items-center gap-1.5 mb-2">
        <div className="h-4 w-4 rounded" style={{ background: '#EFF6FF' }}>
          <Brain className="h-3 w-3 m-0.5" style={{ color: D.accent }} />
        </div>
        <span className="text-[10px] font-semibold" style={{ color: D.accent }}>IA · Múltipla escolha</span>
      </div>
      <p className="text-xs font-medium mb-3" style={{ color: D.text }}>
        Qual princípio impede a administração de agir sem previsão legal?
      </p>
      <div className="space-y-1.5">
        {opts.map((o) => (
          <div key={o.l}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px]"
            style={{
              background: o.ok ? D.successLt : '#F7F6F2',
              border: `1px solid ${o.ok ? '#A7F3D0' : 'transparent'}`,
            }}>
            <span className="w-4 h-4 rounded-full flex items-center justify-center font-bold shrink-0 text-[9px]"
              style={{ background: o.ok ? D.success : '#DDD9D0', color: o.ok ? '#fff' : '#888' }}>
              {o.l}
            </span>
            <span style={{ color: o.ok ? D.success : D.textSub }}>{o.t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockStreakBadge() {
  return (
    <div className="rounded-xl px-3 py-2.5 shadow-md flex items-center gap-2"
      style={{ background: D.surface, border: `1px solid ${D.border}`, fontFamily: D.fontBody }}>
      <div className="h-8 w-8 rounded-lg flex items-center justify-center text-lg" style={{ background: '#FEF3C7' }}>
        🔥
      </div>
      <div>
        <p className="text-xs font-bold" style={{ color: D.text }}>Sequência de 7 dias</p>
        <p className="text-[10px]" style={{ color: D.textMuted }}>+1 geração bônus hoje</p>
      </div>
    </div>
  );
}

/* ─── Hero ───────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section
      className="relative min-h-screen flex items-center overflow-hidden pt-16"
      style={{ background: D.bg, fontFamily: D.fontDisplay }}
    >
      {/* Subtle dot grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, #D8D6CF 1px, transparent 1px)`,
          backgroundSize: '36px 36px',
          opacity: 0.45,
        }}
      />
      {/* Soft glow */}
      <div className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: '#DBEAFE', filter: 'blur(100px)', opacity: 0.5 }} />

      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-14 w-full grid md:grid-cols-2 gap-16 items-center py-20">

        {/* Left — copy */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Badge variant="outline"
              className="mb-6 text-xs font-semibold rounded-full px-3 py-1"
              style={{ background: D.accentLt, color: D.accent, borderColor: '#BFDBFE' }}>
              IA para concursos e ENEM
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl md:text-6xl font-extrabold leading-[1.06] tracking-tight mb-5"
            style={{ color: D.text }}
          >
            Pare de esquecer<br />
            <span style={{
              background: `linear-gradient(135deg, ${D.accent}, #7C3AED)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              o que estudou.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="text-lg leading-relaxed mb-8"
            style={{ color: D.textSub, fontFamily: D.fontBody }}
          >
            Envie seu PDF, gere questões e resumos com IA e revise
            automaticamente o que você precisa lembrar — até a véspera da prova.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.28 }}
            className="flex flex-col sm:flex-row gap-3 mb-10"
          >
            <Link to="/login">
              <Button size="lg"
                className="font-semibold rounded-xl px-7 py-6 text-base gap-2 shadow-lg"
                style={{ background: D.accent, color: '#fff', boxShadow: '0 8px 24px rgba(37,99,235,0.28)' }}>
                Começar grátis agora
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#solution">
              <Button size="lg" variant="outline"
                className="font-medium rounded-xl px-7 py-6 text-base"
                style={{ borderColor: D.border, color: D.textSub }}>
                Ver como funciona
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-5"
            style={{ fontFamily: D.fontBody }}
          >
            <div className="flex -space-x-2">
              {['🧑‍🎓','👩‍⚕️','🧑‍💻','👨‍📚'].map((e, i) => (
                <span key={i}
                  className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm"
                  style={{ background: '#F0EFE9', borderColor: D.bg }}>
                  {e}
                </span>
              ))}
            </div>
            <div className="text-sm" style={{ color: D.textMuted }}>
              <span className="font-semibold" style={{ color: D.text }}>+500 estudantes</span> já usam o Cognora
            </div>
          </motion.div>
        </div>

        {/* Right — product mockup */}
        <div className="relative hidden md:flex items-center justify-center h-[480px]">
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="absolute top-0 right-4"
            style={{ animation: 'floatA 5s ease-in-out infinite' }}
          >
            <MockSubjectCard />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="absolute bottom-8 left-0"
            style={{ animation: 'floatB 6s ease-in-out infinite' }}
          >
            <MockQuestionCard />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="absolute bottom-36 right-0"
            style={{ animation: 'floatC 4.5s ease-in-out infinite' }}
          >
            <MockStreakBadge />
          </motion.div>
          <style>{`
            @keyframes floatA { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
            @keyframes floatB { 0%,100%{transform:translateY(0)} 50%{transform:translateY(8px)} }
            @keyframes floatC { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
          `}</style>
        </div>
      </div>

      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        style={{ color: D.textMuted }}
      >
        <ChevronDown className="h-5 w-5" />
      </motion.div>
    </section>
  );
}

/* ─── Problem ────────────────────────────────────────────────────────────── */
const PAINS = [
  {
    emoji: '📖',
    title: 'Você lê o PDF duas vezes e esquece no dia seguinte.',
    desc: 'Leitura passiva não forma memória. Você sente que estudou, mas na prova a cabeça bate na parede.',
  },
  {
    emoji: '📂',
    title: 'Suas anotações estão espalhadas em 5 lugares diferentes.',
    desc: 'Caderno, Google Drive, foto no celular, sticky note... Na hora que precisa, não acha nada.',
  },
  {
    emoji: '😰',
    title: 'Na véspera da prova, você não sabe o que revisar.',
    desc: 'Você estudou muito, mas não sabe onde estão os buracos. Fica relendo o que já sabe e ignorando o que esqueceu.',
  },
];

function Problem() {
  return (
    <section id="problem" style={{ background: D.dark, fontFamily: D.fontDisplay }}>
      <div className="max-w-5xl mx-auto px-6 md:px-14 py-28">
        <Reveal className="text-center mb-16">
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: D.textDarkSub }}>
            O problema
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight" style={{ color: D.textDark }}>
            Todo estudante conhece<br />essa sensação.
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-5">
          {PAINS.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.1}>
              <div className="rounded-2xl p-7 h-full flex flex-col gap-4"
                style={{ background: D.darkSurf, border: `1px solid ${D.borderDark}` }}>
                <span className="text-3xl">{p.emoji}</span>
                <h3 className="text-base font-bold leading-snug" style={{ color: D.textDark }}>
                  {p.title}
                </h3>
                <p className="text-sm leading-relaxed flex-1" style={{ color: D.textDarkSub, fontFamily: D.fontBody }}>
                  {p.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.3} className="mt-14 text-center">
          <p className="text-xl font-semibold" style={{ color: D.textDark }}>
            Você não tem problema de capacidade.{' '}
            <span style={{ color: D.textDarkSub }}>Tem problema de método.</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Solution (horizontal scroll) ──────────────────────────────────────── */
const SOLUTIONS = [
  {
    icon: Upload,
    color: D.accent,
    bg: '#EFF6FF',
    tag: 'Passo 1',
    title: 'Envie seu PDF ou texto',
    desc: 'Faça upload de qualquer apostila, artigo ou cola o texto direto. O Cognora organiza tudo por matéria automaticamente.',
    mock: (
      <div className="rounded-xl p-4 mt-4" style={{ background: '#F7F9FF', border: '1px solid #DBEAFE' }}>
        <div className="flex items-center gap-3 text-xs" style={{ color: '#3B82F6', fontFamily: 'DM Sans, sans-serif' }}>
          <FileText className="h-4 w-4 shrink-0" />
          <span className="font-medium">Direito_Constitucional_2024.pdf</span>
          <span className="ml-auto text-green-600 font-semibold">✓ Enviado</span>
        </div>
      </div>
    ),
  },
  {
    icon: Brain,
    color: '#7C3AED',
    bg: '#F5F3FF',
    tag: 'Passo 2',
    title: 'IA gera questões e resumos',
    desc: 'Em segundos, a IA produz questões de múltipla escolha, resumo estruturado e flashcards prontos para revisão.',
    mock: (
      <div className="rounded-xl p-4 mt-4 space-y-2" style={{ background: '#FAFAF8', border: '1px solid #E8E7E2' }}>
        {['Resumo gerado ✓', '5 questões MCQ ✓', '8 flashcards ✓'].map((t) => (
          <div key={t} className="flex items-center gap-2 text-xs" style={{ color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>
            <div className="h-4 w-4 rounded-full flex items-center justify-center shrink-0" style={{ background: '#ECFDF5' }}>
              <Check className="h-2.5 w-2.5 text-emerald-600" />
            </div>
            {t}
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Target,
    color: '#059669',
    bg: '#ECFDF5',
    tag: 'Passo 3',
    title: 'Responda e revise com foco',
    desc: 'Pratique questões, veja onde erra, e o sistema prioriza automaticamente o que você precisa revisar mais.',
    mock: (
      <div className="rounded-xl p-3 mt-4" style={{ background: '#FAFAF8', border: '1px solid #E8E7E2' }}>
        <div className="h-2 rounded-full overflow-hidden mb-1.5" style={{ background: '#E5E7EB' }}>
          <div className="h-full rounded-full" style={{ width: '68%', background: '#059669' }} />
        </div>
        <p className="text-[11px]" style={{ color: '#6B7280', fontFamily: 'DM Sans, sans-serif' }}>68% de aproveitamento · 4 pontos de atenção</p>
      </div>
    ),
  },
  {
    icon: BookX,
    color: '#DC2626',
    bg: '#FEF2F2',
    tag: 'Diferencial',
    title: 'Caderno de erros automático',
    desc: 'Cada questão errada vai automaticamente para revisão. Você nunca mais precisa anotar manualmente o que errou.',
    mock: (
      <div className="rounded-xl p-3 mt-4 space-y-1.5" style={{ background: '#FAFAF8', border: '1px solid #E8E7E2' }}>
        {['Princípio da legalidade', 'Ato administrativo vinculado'].map((t) => (
          <div key={t} className="flex items-center gap-2 text-[11px]" style={{ color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>
            <div className="h-2 w-2 rounded-full shrink-0" style={{ background: '#FCA5A5' }} />
            {t}
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Swords,
    color: '#D97706',
    bg: '#FFFBEB',
    tag: 'Engajamento',
    title: 'Compete e sobe no ranking',
    desc: 'Duele com colegas em competições ao vivo. A pressão do tempo e da competição fixa o conteúdo como nada mais.',
    mock: (
      <div className="rounded-xl p-3 mt-4" style={{ background: '#FAFAF8', border: '1px solid #E8E7E2' }}>
        <div className="flex items-center justify-between text-[11px]" style={{ color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>
          <span>🥇 Ana C.</span><span className="font-bold text-amber-600">920 pts</span>
        </div>
        <div className="flex items-center justify-between text-[11px] mt-1" style={{ color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>
          <span>🥈 Você</span><span className="font-bold" style={{ color: D.accent }}>870 pts</span>
        </div>
      </div>
    ),
  },
  {
    icon: BarChart3,
    color: '#0891B2',
    bg: '#ECFEFF',
    tag: 'Progresso',
    title: 'Acompanhe sua evolução',
    desc: 'XP, streak, nível e taxa de acerto por matéria. Você sabe exatamente onde está e o que precisa melhorar.',
    mock: (
      <div className="rounded-xl p-3 mt-4 grid grid-cols-3 gap-2" style={{ background: '#FAFAF8', border: '1px solid #E8E7E2' }}>
        {[['XP', '2.400'], ['Nível', '8'], ['Streak', '7d 🔥']].map(([l, v]) => (
          <div key={l} className="text-center">
            <p className="text-xs font-bold" style={{ color: D.text }}>{v}</p>
            <p className="text-[10px]" style={{ color: D.textMuted, fontFamily: 'DM Sans, sans-serif' }}>{l}</p>
          </div>
        ))}
      </div>
    ),
  },
];

function Solution() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });
  const x = useTransform(scrollYProgress, [0, 1], ['0%', '-64%']);

  return (
    <div id="solution" ref={containerRef} style={{ height: '500vh' }}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', background: D.bg }}>
        <div className="px-6 md:px-14 pt-16 pb-6">
          <Reveal>
            <p className="text-xs font-semibold tracking-widest uppercase mb-2"
              style={{ color: D.textMuted, fontFamily: D.fontDisplay }}>
              A solução
            </p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight"
              style={{ color: D.text, fontFamily: D.fontDisplay }}>
              O sistema que fecha as lacunas do seu estudo.
            </h2>
            <p className="text-sm mt-1.5 hidden sm:block" style={{ color: D.textMuted, fontFamily: D.fontBody }}>
              Role para explorar →
            </p>
          </Reveal>
        </div>

        <div style={{ overflow: 'hidden' }}>
          <motion.div style={{ x }} className="flex gap-4 px-6 md:px-14">
            {SOLUTIONS.map((s) => (
              <div key={s.title}
                className="shrink-0 w-72 md:w-80 rounded-2xl p-6 flex flex-col"
                style={{ background: D.surface, border: `1px solid ${D.border}` }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="h-11 w-11 rounded-xl flex items-center justify-center"
                    style={{ background: s.bg }}>
                    <s.icon className="h-5 w-5" style={{ color: s.color }} />
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: s.bg, color: s.color }}>
                    {s.tag}
                  </span>
                </div>
                <h3 className="text-base font-bold mb-2 leading-snug"
                  style={{ color: D.text, fontFamily: D.fontDisplay }}>
                  {s.title}
                </h3>
                <p className="text-sm leading-relaxed flex-1"
                  style={{ color: D.textSub, fontFamily: D.fontBody }}>
                  {s.desc}
                </p>
                {s.mock}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Progress dots */}
        <div className="px-6 md:px-14 mt-5 flex items-center gap-2">
          {SOLUTIONS.map((_, i) => (
            <motion.div key={i}
              style={{
                width: useTransform(
                  scrollYProgress,
                  [i / SOLUTIONS.length, (i + 0.5) / SOLUTIONS.length, (i + 1) / SOLUTIONS.length],
                  [8, 24, 8]
                ),
                background: D.accent,
              }}
              className="h-1.5 rounded-full transition-all"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Stats ──────────────────────────────────────────────────────────────── */
function Stats() {
  const items = [
    { n: '+500', l: 'estudantes ativos' },
    { n: '+10k', l: 'questões geradas' },
    { n: '3×', l: 'mais retenção vs leitura passiva' },
    { n: '98%', l: 'de satisfação dos usuários' },
  ];
  return (
    <section style={{ background: D.dark, borderTop: `1px solid ${D.borderDark}` }}>
      <div className="max-w-5xl mx-auto px-6 md:px-14 py-16 grid grid-cols-2 md:grid-cols-4 gap-8">
        {items.map((s, i) => (
          <Reveal key={s.l} delay={i * 0.08} className="text-center">
            <p className="text-4xl font-extrabold mb-1" style={{ color: '#FFFFFF', fontFamily: D.fontDisplay }}>
              {s.n}
            </p>
            <p className="text-sm" style={{ color: D.textDarkSub, fontFamily: D.fontBody }}>{s.l}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ─── Pricing ────────────────────────────────────────────────────────────── */
const PLANS = [
  {
    id: 'free', icon: BookOpen, iconBg: '#F3F4F6', iconColor: '#6B7280',
    name: 'Free', price: 'R$0', period: 'para sempre',
    desc: 'Para começar sem compromisso.',
    features: ['3 gerações de IA por dia', '2 matérias', '1 documento por matéria', 'Upload até 5 MB', '1 competição ativa', 'Questões ilimitadas'],
    nope: ['Sem suporte prioritário'],
    cta: 'Começar grátis', highlight: false,
  },
  {
    id: 'pro', icon: Zap, iconBg: '#EFF6FF', iconColor: D.accent,
    name: 'Pro', price: 'R$9,90', period: '/mês', badge: 'Mais popular',
    desc: 'Para quem estuda de verdade.',
    features: ['20 gerações de IA por dia', 'Matérias ilimitadas', 'Documentos ilimitados', 'Upload até 25 MB', 'Competições ilimitadas', 'Suporte prioritário'],
    nope: [] as string[],
    cta: 'Assinar Pro', highlight: true,
  },
  {
    id: 'unlimited', icon: Crown, iconBg: '#FFFBEB', iconColor: '#D97706',
    name: 'Ilimitado', price: 'R$19,90', period: '/mês',
    desc: 'Poder total. Zero restrições.',
    features: ['Gerações ilimitadas', 'Tudo do Pro', 'Upload até 50 MB', 'Acesso antecipado a novos recursos'],
    nope: [] as string[],
    cta: 'Assinar Ilimitado', highlight: false,
  },
];

function Pricing() {
  return (
    <section id="pricing" style={{ background: D.bg, fontFamily: D.fontDisplay }}>
      <div className="max-w-5xl mx-auto px-6 md:px-14 py-28">
        <Reveal className="text-center mb-14">
          <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: D.textMuted }}>
            Planos
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3" style={{ color: D.text }}>
            Simples. Justo. Sem surpresas.
          </h2>
          <p className="text-lg" style={{ color: D.textSub, fontFamily: D.fontBody }}>
            Comece grátis. Faça upgrade quando precisar. Cancele quando quiser.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-5 items-start">
          {PLANS.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.1}>
              <div className="relative rounded-2xl p-7 flex flex-col gap-5"
                style={{
                  background: p.highlight ? D.accent : D.surface,
                  border: `1px solid ${p.highlight ? D.accent : D.border}`,
                  boxShadow: p.highlight ? '0 20px 48px rgba(37,99,235,0.22)' : undefined,
                }}>
                {p.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="default"
                      className="text-[11px] font-bold px-3 py-0.5"
                      style={{ background: D.dark, color: '#fff', border: 'none' }}>
                      {p.badge}
                    </Badge>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center"
                      style={{ background: p.highlight ? 'rgba(255,255,255,0.15)' : p.iconBg }}>
                      <p.icon className="h-4.5 w-4.5" style={{ color: p.highlight ? '#fff' : p.iconColor }} />
                    </div>
                    <span className="font-bold" style={{ color: p.highlight ? '#fff' : D.text }}>{p.name}</span>
                  </div>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-4xl font-extrabold" style={{ color: p.highlight ? '#fff' : D.text }}>
                      {p.price}
                    </span>
                    <span className="text-sm mb-1.5" style={{ color: p.highlight ? 'rgba(255,255,255,0.6)' : D.textMuted }}>
                      {p.period}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: p.highlight ? 'rgba(255,255,255,0.7)' : D.textSub, fontFamily: D.fontBody }}>
                    {p.desc}
                  </p>
                </div>

                <Link to="/login">
                  <Button className="w-full font-semibold rounded-xl py-5"
                    style={p.highlight
                      ? { background: '#fff', color: D.accent }
                      : { background: D.accent, color: '#fff' }}>
                    {p.cta}
                  </Button>
                </Link>

                <ul className="space-y-2.5" style={{ fontFamily: D.fontBody }}>
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <div className="h-4 w-4 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: p.highlight ? 'rgba(255,255,255,0.2)' : D.successLt }}>
                        <Check className="h-2.5 w-2.5" style={{ color: p.highlight ? '#fff' : D.success }} />
                      </div>
                      <span style={{ color: p.highlight ? 'rgba(255,255,255,0.85)' : D.textSub }}>{f}</span>
                    </li>
                  ))}
                  {p.nope.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <div className="h-4 w-4 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: '#F3F4F6' }}>
                        <X className="h-2.5 w-2.5 text-slate-400" />
                      </div>
                      <span style={{ color: D.textMuted }}>{f}</span>
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

/* ─── Final CTA ──────────────────────────────────────────────────────────── */
function FinalCTA() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <section ref={ref} style={{ background: D.dark, fontFamily: D.fontDisplay }}>
      <div className="max-w-3xl mx-auto px-6 text-center py-32">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="inline-flex h-16 w-16 rounded-2xl items-center justify-center mx-auto mb-6"
            style={{ background: D.darkSurf, border: `1px solid ${D.borderDark}` }}>
            <GraduationCap className="h-8 w-8" style={{ color: D.textDark }} />
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-5 leading-tight"
            style={{ color: D.textDark }}>
            Seu próximo simulado pode ser amanhã.
          </h2>
          <p className="text-lg mb-10 max-w-lg mx-auto" style={{ color: D.textDarkSub, fontFamily: D.fontBody }}>
            Crie sua conta grátis agora e comece a estudar de forma inteligente ainda hoje.
          </p>
          <Link to="/login">
            <Button size="lg" className="font-semibold rounded-xl px-10 py-6 text-base gap-2"
              style={{
                background: D.textDark,
                color: D.dark,
                boxShadow: '0 0 40px rgba(240,239,233,0.12)',
              }}>
              Criar conta grátis
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="text-xs mt-4" style={{ color: '#3D3D3B', fontFamily: D.fontBody }}>
            Sem cartão de crédito. Gratuito para sempre no plano Free.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Footer ─────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer style={{ background: D.dark, borderTop: `1px solid ${D.borderDark}`, fontFamily: D.fontBody }}>
      <div className="max-w-5xl mx-auto px-6 md:px-14 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm"
        style={{ color: '#3D3D3B' }}>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ background: D.accent }}>
            <GraduationCap className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-semibold" style={{ color: D.textDarkSub }}>Cognora</span>
        </div>
        <p>© 2025 Cognora. Todos os direitos reservados.</p>
        <div className="flex gap-6">
          <Link to="/login" className="transition-colors hover:text-white">Entrar</Link>
          <a href="#pricing" className="transition-colors hover:text-white">Planos</a>
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
    <div style={{ background: D.bg }}>
      <NavBar />
      <div className="pt-16">
        <Hero />
        <Problem />
        <Solution />
        <Stats />
        <Pricing />
        <FinalCTA />
        <Footer />
      </div>
    </div>
  );
}
