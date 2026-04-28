import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  GraduationCap, Brain, Zap, Crown, FileText,
  ArrowRight, Check, ChevronDown, Flame,
  BookOpen, BarChart3, Swords, BookX, Target, X, Star, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const FONT_URL =
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap';

/* ─── i18n ───────────────────────────────────────────────────────────────── */
type Lang = 'pt' | 'en' | 'es';

const scrollTo = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
};

const TRANSLATIONS = {
  pt: {
    nav: { features: 'Recursos', how: 'Como funciona', pricing: 'Planos', login: 'Entrar', cta: 'Começar grátis' },
    hero: {
      badge: 'IA para concursos e ENEM',
      h1a: 'Pare de esquecer', h1b: 'o que estudou.',
      desc: 'Envie seu PDF, gere questões e resumos com IA e revise automaticamente o que você precisa lembrar — até a véspera da prova.',
      ctaPrimary: 'Começar grátis agora', ctaSecondary: 'Ver recursos',
      social: '+500 estudantes já usam o Cognora',
    },
    features: {
      badge: 'Tudo que você precisa para estudar melhor',
      h2a: 'Uma plataforma completa para', h2b: 'concurseiros exigentes',
      desc: 'Do upload do documento à conquista do ranking — o Cognora cobre toda a sua jornada.',
      hub: { name: 'Cognora', desc: 'Sua inteligência de estudos em um só lugar.' },
      left: [
        { title: 'Questões por IA',  desc: 'Múltipla escolha e V/F gerados automaticamente do seu PDF.' },
        { title: 'Caderno de Erros', desc: 'Erros salvos automaticamente. Revisão no momento certo.' },
        { title: 'Progresso & XP',   desc: 'Nível, streak e taxa de acerto por matéria. Você sabe onde está.' },
      ],
      right: [
        { title: 'Resumo inteligente',  desc: 'Resumo estruturado do conteúdo, sem você escrever uma palavra.' },
        { title: 'Competições ao vivo', desc: 'Duele com colegas em tempo real. A pressão fixa o conteúdo.' },
        { title: 'Revisão automática',  desc: 'O sistema prioriza o que você precisa rever com base nos seus erros.' },
      ],
    },
    how: {
      label: 'Como funciona', h2a: 'De zero ao domínio em', h2b: '3 passos',
      desc: 'Comece a estudar de forma inteligente em menos de 2 minutos.',
      steps: [
        { title: 'Envie seu material',  desc: 'Upload de PDFs, apostilas ou cole o texto. O Cognora organiza por matéria automaticamente.' },
        { title: 'IA gera em segundos', desc: 'Questões, resumo estruturado e flashcards criados automaticamente do seu conteúdo.' },
        { title: 'Pratique e retenha', desc: 'Responda questões, veja seus erros e o sistema revisita o que você precisa fixar.' },
      ],
    },
    stats: [
      { n: '+18.4k', l: 'Concurseiros ativos' }, { n: '+2.5M', l: 'Questões geradas' },
      { n: '+1.2M', l: 'Dias de estudo registrados' }, { n: '+860', l: 'Competições realizadas' },
    ],
    pricing: {
      label: 'Planos', h2a: 'Simples. Justo.', h2b: 'Sem surpresas.',
      desc: 'Comece grátis. Faça upgrade quando precisar. Cancele quando quiser.',
      plans: [
        { name: 'Free', price: 'R$0', period: 'para sempre', desc: 'Para começar sem compromisso.',
          features: ['3 gerações de IA por dia','2 matérias','1 documento por matéria','Upload até 5 MB','1 competição ativa','Questões ilimitadas'],
          nope: ['Sem suporte prioritário'], cta: 'Começar grátis' },
        { name: 'Pro', price: 'R$9,90', period: '/mês', badge: 'Mais popular', desc: 'Para quem estuda de verdade.',
          features: ['20 gerações de IA por dia','Matérias ilimitadas','Documentos ilimitados','Upload até 25 MB','Competições ilimitadas','Suporte prioritário'],
          nope: [] as string[], cta: 'Assinar Pro' },
        { name: 'Ilimitado', price: 'R$19,90', period: '/mês', desc: 'Poder total. Zero restrições.',
          features: ['Gerações ilimitadas','Tudo do Pro','Upload até 50 MB','Acesso antecipado a novidades'],
          nope: [] as string[], cta: 'Assinar Ilimitado' },
      ],
    },
    testimonials: {
      h2: 'O que nossos estudantes dizem', desc: 'Resultados reais de quem usa o Cognora no dia a dia.',
      items: [
        { name:'Lucas M.', role:'Concurseiro',  initial:'L', avatarBg:'bg-indigo-100', avatarColor:'text-indigo-700',  text:'A geração de questões do PDF da apostila foi um divisor de águas. Passei no concurso depois de 3 meses usando o Cognora.' },
        { name:'Ana C.',   role:'Medicina',      initial:'A', avatarBg:'bg-violet-100',  avatarColor:'text-violet-700',  text:'O caderno de erros me ajudou a identificar exatamente onde falhava. Minha nota em fisiologia subiu 30%.' },
        { name:'Pedro R.', role:'Universitário', initial:'P', avatarBg:'bg-emerald-100', avatarColor:'text-emerald-700', text:'As competições me mantêm motivado toda semana. Aprendo competindo de um jeito que não conseguia estudando sozinho.' },
      ],
    },
    cta: { h2a: 'Seu próximo simulado', h2b: 'pode ser amanhã.', desc: 'Crie sua conta grátis agora e comece a estudar de forma inteligente ainda hoje.', btn: 'Criar conta grátis', fine: 'Sem cartão de crédito. Gratuito para sempre no plano Free.' },
    footer: { copy: '© 2025 Cognora. Todos os direitos reservados.', login: 'Entrar', pricing: 'Planos' },
  },
  en: {
    nav: { features: 'Features', how: 'How it works', pricing: 'Pricing', login: 'Sign in', cta: 'Get started free' },
    hero: {
      badge: 'AI for competitive exams',
      h1a: 'Stop forgetting', h1b: 'what you studied.',
      desc: 'Upload your PDF, generate questions and summaries with AI, and automatically review what you need to remember — right up to exam day.',
      ctaPrimary: 'Get started free', ctaSecondary: 'See features',
      social: '+500 students already use Cognora',
    },
    features: {
      badge: 'Everything you need to study better',
      h2a: 'A complete platform for', h2b: 'serious students',
      desc: 'From document upload to ranking conquest — Cognora covers your entire journey.',
      hub: { name: 'Cognora', desc: 'Your study intelligence, all in one place.' },
      left: [
        { title: 'AI Questions',    desc: 'Multiple choice and T/F generated automatically from your PDF.' },
        { title: 'Error Notebook',  desc: 'Mistakes saved automatically. Review them at the right moment.' },
        { title: 'Progress & XP',   desc: 'Level, streak and accuracy by subject. You always know where you stand.' },
      ],
      right: [
        { title: 'Smart Summary',      desc: 'Structured content summary generated without you writing a word.' },
        { title: 'Live Competitions',  desc: 'Duel with classmates in real time. The pressure makes it stick.' },
        { title: 'Auto Review',        desc: 'The system prioritizes what you need to review based on your errors.' },
      ],
    },
    how: {
      label: 'How it works', h2a: 'From zero to mastery in', h2b: '3 steps',
      desc: 'Start studying smarter in less than 2 minutes.',
      steps: [
        { title: 'Upload your material',    desc: 'Upload PDFs, textbooks or paste text. Cognora organizes by subject automatically.' },
        { title: 'AI generates in seconds', desc: 'Questions, structured summaries and flashcards created automatically from your content.' },
        { title: 'Practice and retain',     desc: 'Answer questions, see your mistakes and the system revisits what you need to fix.' },
      ],
    },
    stats: [
      { n: '+18.4k', l: 'Active students' }, { n: '+2.5M', l: 'Questions generated' },
      { n: '+1.2M', l: 'Study days logged' }, { n: '+860', l: 'Competitions held' },
    ],
    pricing: {
      label: 'Pricing', h2a: 'Simple. Fair.', h2b: 'No surprises.',
      desc: 'Start free. Upgrade when you need. Cancel whenever.',
      plans: [
        { name: 'Free', price: '$0', period: 'forever', desc: 'Start with no commitment.',
          features: ['3 AI generations/day','2 subjects','1 document per subject','Upload up to 5 MB','1 active competition','Unlimited questions'],
          nope: ['No priority support'], cta: 'Get started free' },
        { name: 'Pro', price: '$9.90', period: '/month', badge: 'Most popular', desc: 'For serious students.',
          features: ['20 AI generations/day','Unlimited subjects','Unlimited documents','Upload up to 25 MB','Unlimited competitions','Priority support'],
          nope: [] as string[], cta: 'Subscribe Pro' },
        { name: 'Unlimited', price: '$19.90', period: '/month', desc: 'Full power. Zero limits.',
          features: ['Unlimited generations','Everything in Pro','Upload up to 50 MB','Early access to new features'],
          nope: [] as string[], cta: 'Subscribe Unlimited' },
      ],
    },
    testimonials: {
      h2: 'What our students say', desc: 'Real results from people who use Cognora every day.',
      items: [
        { name:'Lucas M.', role:'Exam candidate', initial:'L', avatarBg:'bg-indigo-100', avatarColor:'text-indigo-700',  text:'Generating questions from my study material PDF was a game changer. I passed the exam after 3 months using Cognora.' },
        { name:'Ana C.',   role:'Medicine',        initial:'A', avatarBg:'bg-violet-100',  avatarColor:'text-violet-700',  text:'The error notebook helped me identify exactly where I was failing. My physiology score went up 30%.' },
        { name:'Pedro R.', role:'University',      initial:'P', avatarBg:'bg-emerald-100', avatarColor:'text-emerald-700', text:'The competitions keep me motivated every week. I learn by competing in a way I never could studying alone.' },
      ],
    },
    cta: { h2a: 'Your next mock exam', h2b: 'can be tomorrow.', desc: 'Create your free account now and start studying smarter today.', btn: 'Create free account', fine: 'No credit card required. Free forever on the Free plan.' },
    footer: { copy: '© 2025 Cognora. All rights reserved.', login: 'Sign in', pricing: 'Pricing' },
  },
  es: {
    nav: { features: 'Recursos', how: 'Cómo funciona', pricing: 'Planes', login: 'Entrar', cta: 'Comenzar gratis' },
    hero: {
      badge: 'IA para concursos y exámenes',
      h1a: 'Deja de olvidar', h1b: 'lo que estudiaste.',
      desc: 'Sube tu PDF, genera preguntas y resúmenes con IA y repasa automáticamente lo que necesitas recordar — hasta la víspera del examen.',
      ctaPrimary: 'Comenzar gratis ahora', ctaSecondary: 'Ver recursos',
      social: '+500 estudiantes ya usan Cognora',
    },
    features: {
      badge: 'Todo lo que necesitas para estudiar mejor',
      h2a: 'Una plataforma completa para', h2b: 'estudiantes exigentes',
      desc: 'Desde la carga del documento hasta el ranking — Cognora cubre todo tu camino.',
      hub: { name: 'Cognora', desc: 'Tu inteligencia de estudio en un solo lugar.' },
      left: [
        { title: 'Preguntas por IA',     desc: 'Opción múltiple y V/F generados automáticamente desde tu PDF.' },
        { title: 'Cuaderno de Errores',  desc: 'Errores guardados automáticamente. Repaso en el momento correcto.' },
        { title: 'Progreso & XP',        desc: 'Nivel, racha y tasa de acierto por materia. Siempre sabes dónde estás.' },
      ],
      right: [
        { title: 'Resumen inteligente',    desc: 'Resumen estructurado del contenido, sin que escribas una sola palabra.' },
        { title: 'Competiciones en vivo',  desc: 'Duele con compañeros en tiempo real. La presión fija el contenido.' },
        { title: 'Repaso automático',      desc: 'El sistema prioriza lo que necesitas repasar según tus errores.' },
      ],
    },
    how: {
      label: 'Cómo funciona', h2a: 'De cero al dominio en', h2b: '3 pasos',
      desc: 'Empieza a estudiar de forma inteligente en menos de 2 minutos.',
      steps: [
        { title: 'Sube tu material',        desc: 'Carga PDFs, apuntes o pega el texto. Cognora organiza por materia automáticamente.' },
        { title: 'La IA genera en segundos', desc: 'Preguntas, resúmenes estructurados y flashcards creados automáticamente.' },
        { title: 'Practica y retén',         desc: 'Responde preguntas, ve tus errores y el sistema revisita lo que necesitas fijar.' },
      ],
    },
    stats: [
      { n: '+18.4k', l: 'Estudiantes activos' }, { n: '+2.5M', l: 'Preguntas generadas' },
      { n: '+1.2M', l: 'Días de estudio registrados' }, { n: '+860', l: 'Competiciones realizadas' },
    ],
    pricing: {
      label: 'Planes', h2a: 'Simple. Justo.', h2b: 'Sin sorpresas.',
      desc: 'Empieza gratis. Actualiza cuando lo necesites. Cancela cuando quieras.',
      plans: [
        { name: 'Free', price: 'R$0', period: 'para siempre', desc: 'Para comenzar sin compromiso.',
          features: ['3 generaciones de IA/día','2 materias','1 documento por materia','Subida hasta 5 MB','1 competición activa','Preguntas ilimitadas'],
          nope: ['Sin soporte prioritario'], cta: 'Comenzar gratis' },
        { name: 'Pro', price: 'R$9,90', period: '/mes', badge: 'Más popular', desc: 'Para quienes estudian de verdad.',
          features: ['20 generaciones de IA/día','Materias ilimitadas','Documentos ilimitados','Subida hasta 25 MB','Competiciones ilimitadas','Soporte prioritario'],
          nope: [] as string[], cta: 'Suscribirse Pro' },
        { name: 'Ilimitado', price: 'R$19,90', period: '/mes', desc: 'Poder total. Cero restricciones.',
          features: ['Generaciones ilimitadas','Todo de Pro','Subida hasta 50 MB','Acceso anticipado a novedades'],
          nope: [] as string[], cta: 'Suscribirse Ilimitado' },
      ],
    },
    testimonials: {
      h2: 'Lo que dicen nuestros estudiantes', desc: 'Resultados reales de quienes usan Cognora a diario.',
      items: [
        { name:'Lucas M.', role:'Opositor',     initial:'L', avatarBg:'bg-indigo-100', avatarColor:'text-indigo-700',  text:'Generar preguntas del PDF del temario fue un cambio de juego. Aprobé la oposición tras 3 meses usando Cognora.' },
        { name:'Ana C.',   role:'Medicina',      initial:'A', avatarBg:'bg-violet-100',  avatarColor:'text-violet-700',  text:'El cuaderno de errores me ayudó a identificar exactamente dónde fallaba. Mi nota en fisiología subió un 30%.' },
        { name:'Pedro R.', role:'Universitario', initial:'P', avatarBg:'bg-emerald-100', avatarColor:'text-emerald-700', text:'Las competiciones me mantienen motivado cada semana. Aprendo compitiendo de una forma que no podía estudiando solo.' },
      ],
    },
    cta: { h2a: 'Tu próximo simulacro', h2b: 'puede ser mañana.', desc: 'Crea tu cuenta gratis ahora y empieza a estudiar de forma inteligente hoy mismo.', btn: 'Crear cuenta gratis', fine: 'Sin tarjeta de crédito. Gratis para siempre en el plan Free.' },
    footer: { copy: '© 2025 Cognora. Todos los derechos reservados.', login: 'Entrar', pricing: 'Planes' },
  },
};

type T = typeof TRANSLATIONS.pt;

/* ─── Feature icon/style definitions (text comes from translations) ───────── */
const LEFT_ICONS = [
  { icon: Brain,    bg: 'bg-indigo-50',  color: 'text-indigo-600', floatAnim: 'fcard1 5.2s ease-in-out infinite' },
  { icon: BookX,    bg: 'bg-rose-50',    color: 'text-rose-500',   floatAnim: 'fcard2 6.4s ease-in-out 0.5s infinite' },
  { icon: BarChart3,bg: 'bg-emerald-50', color: 'text-emerald-600',floatAnim: 'fcard3 5.8s ease-in-out 1s infinite' },
];
const RIGHT_ICONS = [
  { icon: FileText, bg: 'bg-indigo-50',  color: 'text-indigo-600', floatAnim: 'fcard4 4.8s ease-in-out 0.3s infinite' },
  { icon: Swords,   bg: 'bg-amber-50',   color: 'text-amber-500',  floatAnim: 'fcard5 5.6s ease-in-out 0.8s infinite' },
  { icon: Target,   bg: 'bg-cyan-50',    color: 'text-cyan-600',   floatAnim: 'fcard6 6.2s ease-in-out 1.3s infinite' },
];

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
function NavBar({ t, lang, setLang }: { t: T; lang: Lang; setLang: (l: Lang) => void }) {
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
        <a href="#features" onClick={scrollTo('features')} className="hover:text-slate-900 transition-colors">{t.nav.features}</a>
        <a href="#how"      onClick={scrollTo('how')}      className="hover:text-slate-900 transition-colors">{t.nav.how}</a>
        <a href="#pricing"  onClick={scrollTo('pricing')}  className="hover:text-slate-900 transition-colors">{t.nav.pricing}</a>
      </div>
      <div className="flex items-center gap-3">
        {/* Language switcher */}
        <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
          <SelectTrigger className="hidden sm:flex h-8 w-[64px] text-xs font-bold uppercase border-slate-200 bg-white text-slate-700 rounded-lg shadow-none focus:ring-1 focus:ring-indigo-400">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pt" className="text-xs font-semibold uppercase">PT</SelectItem>
            <SelectItem value="en" className="text-xs font-semibold uppercase">EN</SelectItem>
            <SelectItem value="es" className="text-xs font-semibold uppercase">ES</SelectItem>
          </SelectContent>
        </Select>
        <Link to="/login" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">
          {t.nav.login}
        </Link>
        <Link to="/login">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg px-4">
            {t.nav.cta}
          </Button>
        </Link>
      </div>
    </motion.nav>
  );
}

/* ─── Hero product cards ─────────────────────────────────────────────────── */
function MockSubjectCard() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { const t = setTimeout(() => setLoaded(true), 700); return () => clearTimeout(t); }, []);

  if (!loaded) return (
    <div className="rounded-2xl p-4 shadow-lg w-60 bg-white border border-slate-200">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <div className="space-y-1.5"><Skeleton className="h-3 w-32" /><Skeleton className="h-2 w-20" /></div>
      </div>
      <Skeleton className="h-1.5 w-full rounded-full mb-1.5" />
      <div className="flex justify-between"><Skeleton className="h-2 w-16" /><Skeleton className="h-2 w-10" /></div>
    </div>
  );

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
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { const t = setTimeout(() => setLoaded(true), 1050); return () => clearTimeout(t); }, []);

  const opts = [
    { l: 'A', t: 'A lei não se aplica à administração pública', ok: false },
    { l: 'B', t: 'A administração só pode fazer o que a lei permite', ok: true },
    { l: 'C', t: 'O agente tem discricionariedade total', ok: false },
  ];

  if (!loaded) return (
    <div className="rounded-2xl p-4 shadow-lg bg-white border border-slate-200" style={{ width: '272px' }}>
      <div className="flex items-center gap-1.5 mb-2"><Skeleton className="h-3 w-3 rounded" /><Skeleton className="h-2 w-24" /></div>
      <Skeleton className="h-3 w-full mb-1" /><Skeleton className="h-3 w-3/4 mb-3" />
      <div className="space-y-1.5">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-7 w-full rounded-lg" style={{ opacity: 1 - i * 0.15 }} />)}
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl p-4 shadow-lg bg-white border border-slate-200" style={{ width: '272px' }}>
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
      <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
        <Flame className="h-4 w-4 text-amber-500" />
      </div>
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
function Hero({ t }: { t: T }) {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16 bg-gradient-to-b from-slate-50 to-white">
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, #CBD5E1 1px, transparent 1px)', backgroundSize: '36px 36px', opacity: 0.4 }} />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full pointer-events-none bg-indigo-100 blur-3xl opacity-50" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-14 w-full grid md:grid-cols-2 gap-16 items-center py-20"
        style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>

        <div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Badge variant="outline" className="mb-6 text-xs font-semibold rounded-full px-3 py-1 bg-indigo-50 text-indigo-600 border-indigo-200">
              {t.hero.badge}
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl md:text-6xl font-extrabold leading-[1.06] tracking-tight text-slate-900 mb-5">
            {t.hero.h1a}<br />
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              {t.hero.h1b}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="text-lg text-slate-500 leading-relaxed mb-8">
            {t.hero.desc}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.28 }}
            className="flex flex-col sm:flex-row gap-3 mb-10">
            <Link to="/login">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl px-7 py-6 text-base gap-2 shadow-lg shadow-indigo-200">
                {t.hero.ctaPrimary} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#features" onClick={scrollTo('features')}>
              <Button size="lg" variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-50 font-medium rounded-xl px-7 py-6 text-base">
                {t.hero.ctaSecondary} <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </a>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="flex items-center gap-4 text-sm text-slate-400">
            <div className="flex -space-x-2">
              {['bg-indigo-300','bg-violet-300','bg-emerald-300','bg-amber-300'].map((bg, i) => (
                <span key={i} className={`w-7 h-7 rounded-full ${bg} border-2 border-white shadow-sm block`} />
              ))}
            </div>
            <span><strong className="text-slate-700">{t.hero.social}</strong></span>
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
            style={{ position: 'absolute', top: 60, left: 10, animation: 'floatA 5.5s ease-in-out infinite 1s' }}>
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

/* ─── Features ───────────────────────────────────────────────────────────── */
type FeatureItem = { icon: React.ElementType; bg: string; color: string; floatAnim: string; title: string; desc: string };

function FeatureHCard({ icon: Icon, bg, color, title, desc, delay = 0, floatAnim }: FeatureItem & { delay?: number }) {
  return (
    <Reveal delay={delay}>
      <div
        className="flex items-center gap-4 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
        style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", animation: floatAnim }}
      >
        <div className={`h-11 w-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900 text-sm mb-1">{title}</h3>
          <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-slate-300 shrink-0" />
      </div>
    </Reveal>
  );
}

function Features({ t }: { t: T }) {
  const leftFeatures: FeatureItem[] = LEFT_ICONS.map((icon, i) => ({ ...icon, ...t.features.left[i] }));
  const rightFeatures: FeatureItem[] = RIGHT_ICONS.map((icon, i) => ({ ...icon, ...t.features.right[i] }));

  return (
    <section id="features" className="py-24 overflow-hidden bg-slate-50/60">
      <div className="max-w-6xl mx-auto px-6 md:px-14">

        <Reveal className="text-center mb-14" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" } as React.CSSProperties}>
          <Badge variant="outline" className="mb-5 text-xs font-semibold rounded-full px-3 py-1 bg-white text-indigo-600 border-indigo-200 inline-flex items-center gap-1.5">
            <Zap className="h-3 w-3" /> {t.features.badge}
          </Badge>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            {t.features.h2a}<br />
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              {t.features.h2b}
            </span>
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto text-lg">{t.features.desc}</p>
        </Reveal>

        {/* Desktop: hub + spoke */}
        <div className="hidden lg:grid grid-cols-[1fr_52px_196px_52px_1fr] gap-x-3 items-stretch">

          <div className="flex flex-col gap-4">
            {leftFeatures.map((f, i) => <FeatureHCard key={f.title} {...f} delay={i * 0.1} />)}
          </div>

          <div className="flex flex-col self-stretch">
            {leftFeatures.map((f, i) => (
              <div key={i} className="flex-1 flex items-center justify-end gap-1.5">
                <div className={`h-9 w-9 rounded-full border-2 border-dashed border-slate-200 ${f.bg} flex items-center justify-center shrink-0`}>
                  <f.icon className={`h-4 w-4 ${f.color} opacity-70`} />
                </div>
                <div className="flex-1 border-t-2 border-dashed border-slate-200" />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center">
            <Reveal>
              <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 p-6 flex flex-col items-center text-center w-full shadow-2xl shadow-indigo-200"
                style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", animation: 'fcard0 7s ease-in-out infinite' }}>
                <div className="h-14 w-14 rounded-2xl bg-white/15 flex items-center justify-center mb-3">
                  <GraduationCap className="h-8 w-8 text-white" />
                </div>
                <span className="text-white font-bold text-lg mb-2">{t.features.hub.name}</span>
                <p className="text-indigo-200 text-xs leading-relaxed">{t.features.hub.desc}</p>
              </div>
            </Reveal>
          </div>

          <div className="flex flex-col self-stretch">
            {rightFeatures.map((f, i) => (
              <div key={i} className="flex-1 flex items-center justify-start gap-1.5">
                <div className="flex-1 border-t-2 border-dashed border-slate-200" />
                <div className={`h-9 w-9 rounded-full border-2 border-dashed border-slate-200 ${f.bg} flex items-center justify-center shrink-0`}>
                  <f.icon className={`h-4 w-4 ${f.color} opacity-70`} />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            {rightFeatures.map((f, i) => <FeatureHCard key={f.title} {...f} delay={i * 0.1 + 0.15} />)}
          </div>
        </div>

        {/* Mobile: simple grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden">
          {[...leftFeatures, ...rightFeatures].map((f) => (
            <Reveal key={f.title}>
              <div className="rounded-2xl p-5 bg-white border border-slate-100 shadow-sm"
                style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
                <div className={`h-10 w-10 rounded-xl ${f.bg} flex items-center justify-center mb-3`}>
                  <f.icon className={`h-5 w-5 ${f.color}`} />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <style>{`
          @keyframes fcard0 { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-8px)}  }
          @keyframes fcard1 { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-14px)} }
          @keyframes fcard2 { 0%,100%{transform:translateY(0)}   50%{transform:translateY(12px)}  }
          @keyframes fcard3 { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-10px)} }
          @keyframes fcard4 { 0%,100%{transform:translateY(0)}   50%{transform:translateY(14px)}  }
          @keyframes fcard5 { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-12px)} }
          @keyframes fcard6 { 0%,100%{transform:translateY(0)}   50%{transform:translateY(10px)}  }
        `}</style>
      </div>
    </section>
  );
}

/* ─── How it works ───────────────────────────────────────────────────────── */
function HowItWorks({ t }: { t: T }) {
  const icons = [FileText, Brain, Target];
  const colors = ['text-indigo-600','text-violet-600','text-emerald-600'];
  const bgs    = ['bg-indigo-50','bg-violet-50','bg-emerald-50'];
  return (
    <div className="bg-slate-50">
      <section id="how" className="py-28 px-6 max-w-5xl mx-auto">
        <Reveal className="text-center mb-16" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" } as React.CSSProperties}>
          <p className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-3">{t.how.label}</p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            {t.how.h2a}{' '}
            <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">{t.how.h2b}</span>
          </h2>
          <p className="text-slate-500 max-w-lg mx-auto text-lg">{t.how.desc}</p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-12 left-[22%] right-[22%] h-px bg-gradient-to-r from-indigo-200 via-violet-200 to-emerald-200" />
          {t.how.steps.map((s, i) => {
            const Icon = icons[i];
            return (
              <Reveal key={i} delay={i * 0.12} className="flex flex-col items-center text-center">
                <div className={`relative h-24 w-24 rounded-2xl ${bgs[i]} border border-slate-100 flex items-center justify-center mb-6 shadow-sm`}>
                  <Icon className={`h-9 w-9 ${colors[i]}`} />
                  <span className="absolute -top-2.5 -right-2.5 h-6 w-6 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-500 flex items-center justify-center shadow-sm"
                    style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>0{i + 1}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2"
                  style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{s.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed max-w-xs">{s.desc}</p>
              </Reveal>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* ─── Stats ──────────────────────────────────────────────────────────────── */
function Stats({ t }: { t: T }) {
  const icons  = [Users, Check, Flame, Crown];
  const bgs    = ['bg-indigo-100','bg-emerald-100','bg-orange-100','bg-violet-100'];
  const colors = ['text-indigo-600','text-emerald-600','text-orange-500','text-violet-600'];
  return (
    <div className="border-y border-slate-100 bg-white">
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100">
        {t.stats.map((s, i) => {
          const Icon = icons[i];
          return (
            <Reveal key={i} delay={i * 0.08} className="flex flex-col items-center text-center py-8 px-6">
              <div className={`h-11 w-11 rounded-full ${bgs[i]} flex items-center justify-center mb-3`}>
                <Icon className={`h-5 w-5 ${colors[i]}`} />
              </div>
              <p className={`text-3xl font-extrabold ${colors[i]} mb-1`}
                style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{s.n}</p>
              <p className="text-sm text-slate-500">{s.l}</p>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Pricing ────────────────────────────────────────────────────────────── */
const PLAN_ICONS = [BookOpen, Zap, Crown];
const PLAN_ICON_BG    = ['bg-slate-100','bg-indigo-50','bg-amber-50'];
const PLAN_ICON_COLOR = ['text-slate-400','text-indigo-600','text-amber-500'];
const PLAN_HIGHLIGHT  = [false, true, false];

function Pricing({ t }: { t: T }) {
  return (
    <section id="pricing" className="py-28 px-6 bg-white"
      style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
      <div className="max-w-5xl mx-auto">
        <Reveal className="text-center mb-14">
          <p className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-3">{t.pricing.label}</p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-3">
            {t.pricing.h2a}{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">{t.pricing.h2b}</span>
          </h2>
          <p className="text-slate-500 text-lg">{t.pricing.desc}</p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-5 items-stretch">
          {t.pricing.plans.map((p, i) => {
            const Icon = PLAN_ICONS[i];
            const highlight = PLAN_HIGHLIGHT[i];
            return (
              <Reveal key={p.name} delay={i * 0.1} className="h-full">
                <div className={`h-full relative rounded-2xl p-7 flex flex-col gap-5 transition-all ${
                  highlight ? 'bg-indigo-600 border border-indigo-600 shadow-xl shadow-indigo-200' : 'bg-white border border-slate-200 hover:shadow-md'
                }`}>
                  {'badge' in p && p.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge variant="default" className="bg-slate-900 text-white text-[11px] font-bold px-3 py-0.5 border-none">
                        {p.badge}
                      </Badge>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${highlight ? 'bg-white/15' : PLAN_ICON_BG[i]}`}>
                        <Icon className={`h-4 w-4 ${highlight ? 'text-white' : PLAN_ICON_COLOR[i]}`} />
                      </div>
                      <span className={`font-bold ${highlight ? 'text-white' : 'text-slate-900'}`}>{p.name}</span>
                    </div>
                    <div className="flex items-end gap-1 mb-1">
                      <span className={`text-4xl font-extrabold ${highlight ? 'text-white' : 'text-slate-900'}`}>{p.price}</span>
                      <span className={`text-sm mb-1.5 ${highlight ? 'text-indigo-200' : 'text-slate-400'}`}>{p.period}</span>
                    </div>
                    <p className={`text-sm ${highlight ? 'text-indigo-200' : 'text-slate-500'}`}>{p.desc}</p>
                  </div>
                  <Link to="/login">
                    <Button className={`w-full font-semibold rounded-xl py-5 ${
                      highlight ? 'bg-white text-indigo-600 hover:bg-indigo-50' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}>
                      {p.cta}
                    </Button>
                  </Link>
                  <ul className="space-y-2.5">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm">
                        <div className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 ${highlight ? 'bg-white/20' : 'bg-emerald-50'}`}>
                          <Check className={`h-2.5 w-2.5 ${highlight ? 'text-white' : 'text-emerald-600'}`} />
                        </div>
                        <span className={highlight ? 'text-indigo-100' : 'text-slate-600'}>{f}</span>
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
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── Testimonials ───────────────────────────────────────────────────────── */
function Testimonials({ t }: { t: T }) {
  return (
    <div className="bg-slate-50">
      <section className="py-24 px-6 max-w-5xl mx-auto">
        <Reveal className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-2"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
            {t.testimonials.h2}
          </h2>
          <p className="text-slate-500">{t.testimonials.desc}</p>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {t.testimonials.items.map((item, i) => (
            <Reveal key={item.name} delay={i * 0.1}>
              <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all">
                <div className="flex mb-3">
                  {[...Array(5)].map((_, j) => <Star key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">"{item.text}"</p>
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-full ${item.avatarBg} ${item.avatarColor} flex items-center justify-center font-bold text-sm shrink-0`}>
                    {item.initial}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900"
                      style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{item.name}</p>
                    <p className="text-xs text-slate-400">{item.role}</p>
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
function FinalCTA({ t }: { t: T }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <section ref={ref} className="py-32 px-6 bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 relative overflow-hidden"
      style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
      <div className="absolute inset-0 pointer-events-none opacity-20"
        style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-3xl mx-auto text-center relative z-10">
        <div className="h-14 w-14 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-5">
          <GraduationCap className="h-7 w-7 text-white" />
        </div>
        <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
          {t.cta.h2a}<br />{t.cta.h2b}
        </h2>
        <p className="text-indigo-100 text-lg mb-8 max-w-lg mx-auto">{t.cta.desc}</p>
        <Link to="/login">
          <Button size="lg" className="bg-white text-indigo-700 hover:bg-indigo-50 font-semibold rounded-xl px-10 py-6 text-base gap-2 shadow-lg">
            {t.cta.btn} <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <p className="text-xs text-indigo-300 mt-4">{t.cta.fine}</p>
      </motion.div>
    </section>
  );
}

/* ─── Footer ─────────────────────────────────────────────────────────────── */
function Footer({ t }: { t: T }) {
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
        <p>{t.footer.copy}</p>
        <div className="flex gap-5">
          <Link to="/login" className="hover:text-slate-600 transition-colors">{t.footer.login}</Link>
          <a href="#pricing" onClick={scrollTo('pricing')} className="hover:text-slate-600 transition-colors">{t.footer.pricing}</a>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function Landing() {
  const [lang, setLang] = useState<Lang>('pt');
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONT_URL;
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <NavBar t={t} lang={lang} setLang={setLang} />
      <div className="pt-16">
        <Hero t={t} />
        <Features t={t} />
        <HowItWorks t={t} />
        <Stats t={t} />
        <Pricing t={t} />
        <Testimonials t={t} />
        <FinalCTA t={t} />
        <Footer t={t} />
      </div>
    </div>
  );
}
