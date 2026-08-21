import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Lock, Loader2, Brain, Zap, Trophy,
  ArrowLeft, ArrowRight, User, Sparkles, AtSign, CheckCircle2, Eye, EyeOff, X, Heart,
} from 'lucide-react';
// Loader2 é usado no botão de submit
import { rememberGenerationLimitAfterLogin } from '@/lib/postLoginNotice';
import { useAuth, type AuthUser } from '@/lib/AuthContext';
import { API_URL } from '@/api/apiUrl';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

type Mode = 'login' | 'register' | 'forgot';
type PublicRankingEntry = {
  display_name: string;
  xp: number;
};

type AuthResponse = {
  user: AuthUser;
  is_new_user?: boolean;
  generations_remaining?: number;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void;
          renderButton: (el: HTMLElement, config: object) => void;
          cancel: () => void;
        };
      };
    };
  }
}

// ── Painel Showcase ───────────────────────────────────────────────────────────
function ShowcasePanel() {
  const [ranking, setRanking] = useState<PublicRankingEntry[]>([]);
  const [rankingLoading, setRankingLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/api/leaderboard/public?limit=2`, { signal: controller.signal })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setRanking(Array.isArray(data) ? data : []))
      .catch(() => {
        if (!controller.signal.aborted) setRanking([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setRankingLoading(false);
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="relative hidden min-h-[590px] overflow-hidden border-r border-indigo-300/20 bg-[#110b31]/90 p-10 lg:flex flex-col">
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(167,139,250,0.45) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(135deg, rgba(124,58,237,0.18), transparent 42%), radial-gradient(ellipse at 55% 78%, rgba(79,70,229,0.35), transparent 58%)',
        }}
      />
      <Link to="/" className="relative flex items-center gap-3 w-fit">
        <div className="h-10 w-10 rounded-xl bg-violet-500/15 border border-violet-400/45 flex items-center justify-center shadow-lg shadow-violet-950/40">
          <Brain className="h-5 w-5 text-violet-300" />
        </div>
        <span className="text-lg font-extrabold text-white tracking-tight">Cognora</span>
      </Link>
      <div className="relative mt-9 max-w-md">
        <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-white">
          Transforme seus PDFs
          <br />
          em <span className="text-violet-400">missões épicas.</span>
        </h2>
      </div>
      <p className="relative mt-4 max-w-sm text-sm leading-6 text-slate-300">
        Gere resumos com IA,
        responda quizzes e suba no ranking contra seus amigos.
      </p>
      <motion.div
        className="relative mt-8 w-full max-w-[330px] rounded-xl border border-indigo-300/20 bg-slate-950/35 p-4 shadow-xl shadow-violet-950/30 backdrop-blur"
        initial={{ opacity: 0, y: 18, rotate: -1.5 }}
        animate={{ opacity: 1, y: [0, -8, 0], rotate: [-1.5, -0.5, -1.5] }}
        transition={{
          opacity: { duration: 0.45, delay: 0.15 },
          y: { duration: 5.8, repeat: Infinity, ease: 'easeInOut' },
          rotate: { duration: 5.8, repeat: Infinity, ease: 'easeInOut' },
        }}
      >
        <motion.div
          className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/70 to-transparent"
          animate={{ opacity: [0.25, 1, 0.25], x: [-34, 34, -34] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.18, 1], rotate: [0, -8, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Zap className="h-3.5 w-3.5 text-violet-400" />
            </motion.div>
            <span className="text-violet-400 text-xs font-bold uppercase tracking-widest">IA Ativada</span>
          </div>
          <motion.span
            className="text-slate-500 text-xs"
            animate={{ opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            Há 2 min
          </motion.span>
        </div>
        <motion.p
          className="text-sm font-semibold leading-snug text-white"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.35 }}
        >
          "Capítulo 4: Fisiologia Humana" resumido em 3 tópicos e 5 flashcards gerados.
        </motion.p>
        <motion.div
          className="flex items-center gap-3 mt-4 text-xs text-slate-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.55 }}
        >
          <motion.span animate={{ y: [0, -2, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}>📄 45 págs</motion.span>
          <motion.span animate={{ x: [0, 5, 0], opacity: [0.45, 1, 0.45] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>→</motion.span>
          <motion.span animate={{ y: [0, -2, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.25 }}>⏱ 5 min de leitura</motion.span>
        </motion.div>
      </motion.div>
      <motion.div
        className="relative mt-5 w-full max-w-[330px] rounded-xl border border-indigo-300/20 bg-slate-950/35 p-4 shadow-xl shadow-violet-950/20 backdrop-blur"
        initial={{ opacity: 0, y: 16, rotate: 1.2 }}
        animate={{ opacity: 1, y: [0, 7, 0], rotate: [1.2, 0.4, 1.2] }}
        transition={{
          opacity: { duration: 0.45, delay: 0.35 },
          y: { duration: 6.4, repeat: Infinity, ease: 'easeInOut' },
          rotate: { duration: 6.4, repeat: Infinity, ease: 'easeInOut' },
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <motion.div
            animate={{ y: [0, -3, 0], scale: [1, 1.08, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Trophy className="h-4 w-4 text-violet-400" />
          </motion.div>
          <span className="text-white text-sm font-semibold">Ranking da Semana</span>
        </div>
        <div className="space-y-2.5">
          {rankingLoading ? (
            <p className="text-xs text-slate-500">Carregando estudantes...</p>
          ) : ranking.length > 0 ? (
            ranking.map((entry, index) => {
              const gold = index === 0;
              const initials = entry.display_name
                .split(/\s+/)
                .slice(0, 2)
                .map(part => part[0])
                .join('')
                .toUpperCase();
              return (
                <div key={`${entry.display_name}-${index}`} className="flex items-center gap-3">
                  <span className={`font-bold text-sm w-4 ${gold ? 'text-amber-400' : 'text-slate-500'}`}>{index + 1}</span>
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs text-white font-bold flex-shrink-0 ${gold ? 'bg-gradient-to-br from-indigo-500 to-purple-500' : 'bg-slate-600'}`}>{initials}</div>
                  <span className={`text-sm flex-1 truncate ${gold ? 'text-slate-200 font-medium' : 'text-slate-300'}`}>{entry.display_name}</span>
                  <span className={`text-xs font-semibold ${gold ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {entry.xp.toLocaleString('pt-BR')} XP
                  </span>
                </div>
              );
            })
          ) : (
            <motion.p
              className="text-xs text-slate-500"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              O ranking começa com o próximo estudante.
            </motion.p>
          )}
        </div>
      </motion.div>
      <div className="relative mt-auto flex items-center gap-4 pt-10">
        <div className="flex -space-x-2">
          {['L', 'A', 'P', 'W'].map((initial, index) => (
            <div
              key={`${initial}-${index}`}
              className="h-9 w-9 rounded-full border-2 border-[#110b31] bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-xs font-bold text-white"
            >
              {initial}
            </div>
          ))}
        </div>
        <p className="text-sm leading-tight text-slate-400">
          Junte-se a
          <br />
          <span className="text-lg font-extrabold text-violet-400">12.400+</span>
          <br />
          estudantes evoluindo agora.
        </p>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate();
  const { completeLogin } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showSupportModal, setShowSupportModal] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const googleInitializedRef = useRef(false);
  const googleCallbackRef = useRef<({ credential }: { credential: string }) => void>(() => {});

  const handleGoogleCallback = useCallback(async ({ credential }: { credential: string }) => {
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Cognora-CSRF': '1' },
        body: JSON.stringify({ credential, remember }),
      });
      const data = await res.json() as AuthResponse & { detail?: string };
      if (!res.ok) { setError(data.detail || 'Erro ao autenticar com Google'); return; }
      if (!data.user) {
        setError('O servidor ainda esta atualizando. Aguarde um instante e tente novamente.');
        return;
      }
      rememberGenerationLimitAfterLogin(data.generations_remaining);
      completeLogin(data.user);
      navigate(data.user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    } catch {
      setError('Não foi possível conectar ao servidor.');
    }
  }, [completeLogin, navigate, remember]);

  useEffect(() => {
    googleCallbackRef.current = handleGoogleCallback;
  }, [handleGoogleCallback]);

  // Renderiza o botao oficial do Google depois que o script carregar.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || mode === 'forgot') return;

    const renderBtn = () => {
      const container = googleButtonRef.current;
      if (!window.google || !container) return;
      container.replaceChildren();
      const w = container.offsetWidth || container.parentElement?.offsetWidth || 400;
      if (!googleInitializedRef.current) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response: { credential: string }) => googleCallbackRef.current(response),
        });
        googleInitializedRef.current = true;
      }
      window.google.accounts.id.renderButton(container, {
        theme: 'filled_black',
        size: 'large',
        width: w,
        text: mode === 'login' ? 'signin_with' : 'signup_with',
        locale: 'pt-BR',
      });
    };

    // Aguarda o DOM pintar antes de pegar offsetWidth
    const raf = requestAnimationFrame(() => {
      if (window.google) {
        renderBtn();
      } else {
        const scriptId = 'google-gsi';
        if (!document.getElementById(scriptId)) {
          const script = document.createElement('script');
          script.id = scriptId;
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
          script.onload = renderBtn;
          script.onerror = () => setError('Não foi possível carregar o login com Google.');
          document.head.appendChild(script);
        } else {
          const interval = setInterval(() => {
            if (window.google) { clearInterval(interval); renderBtn(); }
          }, 100);
          return () => clearInterval(interval);
        }
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [mode]);

  const switchMode = (next: Mode) => {
    setError('');
    setSuccessMsg('');
    setMode(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (mode === 'forgot') {
      setShowSupportModal(true);
      return;
    }

    if (mode === 'register') {
      if (password !== confirmPassword) { setError('As senhas não coincidem.'); return; }
      if (username.length < 3) { setError('Nome de usuário deve ter ao menos 3 caracteres.'); return; }
    }

    setLoading(true);
    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const body = mode === 'login'
      ? { identifier, password, remember }
      : { email, username, password, remember };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Cognora-CSRF': '1' },
        body: JSON.stringify(body),
      });
      const data = await res.json() as AuthResponse & { detail?: string };
      if (!res.ok) { setError(data.detail || 'Erro ao processar solicitação'); return; }
      if (!data.user) {
        setError('O servidor ainda esta atualizando. Aguarde um instante e tente novamente.');
        return;
      }
      rememberGenerationLimitAfterLogin(data.generations_remaining);
      completeLogin(data.user);
      navigate(data.user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    } catch {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full pl-10 pr-4 py-3 text-sm bg-slate-950/40 border border-slate-700/80 text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 placeholder:text-slate-500 transition-colors';
  const passwordInputCls = 'w-full pl-10 pr-10 py-3 text-sm bg-slate-950/40 border border-slate-700/80 text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 placeholder:text-slate-500 transition-colors';

  const FormPanel = (
    <div className="relative flex min-h-[590px] flex-col justify-center bg-slate-950/90 p-8 backdrop-blur-sm lg:p-12">
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, x: mode === 'login' ? 40 : -40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: mode === 'login' ? -40 : 40 }}
          transition={{ duration: 0.28, ease: 'easeInOut' }}
        >
          {/* Título */}
          <div className="mb-7">
            <div className="h-12 w-12 rounded-xl bg-violet-500/15 border border-violet-400/40 flex items-center justify-center mb-6 shadow-lg shadow-violet-950/40">
              <Brain className="h-6 w-6 text-violet-300" />
            </div>
            <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">
              {mode === 'login' && 'Bem-vindo de volta!'}
              {mode === 'register' && 'Sua jornada começa aqui'}
              {mode === 'forgot' && 'Recuperar senha'}
            </h1>
            <p className="text-slate-400 text-base">
              {mode === 'login' && 'Bora estudar ou vai fugir de novo? 😅'}
              {mode === 'register' && 'Seu cérebro agradece esse cadastro.'}
              {mode === 'forgot' && 'Informe seu email e enviaremos um link de redefinição.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'login' && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-200 tracking-wide">Email ou nome de usuário</label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input type="text" placeholder="seu@email.com ou @usuario"
                    value={identifier} onChange={e => setIdentifier(e.target.value)}
                    required autoComplete="username" className={inputCls} />
                </div>
              </div>
            )}

            {(mode === 'register' || mode === 'forgot') && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-200 tracking-wide">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input type="email" placeholder="seu@email.com"
                    value={email} onChange={e => setEmail(e.target.value)}
                    required autoComplete="email" className={inputCls} />
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-200 tracking-wide">Nome de usuário</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input type="text" placeholder="Ex: mago_dos_pdfs"
                    value={username} onChange={e => setUsername(e.target.value)}
                    required minLength={3} maxLength={30} pattern="[a-zA-Z0-9_]+"
                    autoComplete="username" className={inputCls} />
                </div>
                <p className="text-xs text-slate-500">3-30 caracteres: letras, números e _</p>
              </div>
            )}

            {mode !== 'forgot' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-200 tracking-wide">Senha</label>
                  {mode === 'login' && (
                    <button type="button" onClick={() => switchMode('forgot')}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)}
                    required minLength={6}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className={passwordInputCls} />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-200 tracking-wide">Confirmar senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input type={showConfirmPassword ? 'text' : 'password'} placeholder="••••••••"
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    required minLength={6} autoComplete="new-password" className={passwordInputCls} />
                  <button type="button" onClick={() => setShowConfirmPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'login' && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500" />
                <span className="text-sm text-slate-400">Lembrar de mim</span>
              </label>
            )}

            {error && (
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/50 px-3 py-2 rounded-lg">{error}</p>
            )}
            {successMsg && (
              <div className="flex items-start gap-2 text-sm text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-3 py-2 rounded-lg">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /><span>{successMsg}</span>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold py-3 rounded-xl transition-colors shadow-lg shadow-violet-950/40 disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'login' ? (
                <>Entrar na Arena <ArrowRight className="h-4 w-4" /></>
              ) : mode === 'register' ? (
                <>Começar a Evoluir <Sparkles className="h-4 w-4" /></>
              ) : 'Enviar link de recuperação'}
            </button>
          </form>

          {/* Google OAuth */}
          {mode !== 'forgot' && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-slate-700" />
                <span className="text-xs text-slate-500">ou</span>
                <div className="flex-1 h-px bg-slate-700" />
              </div>
              {GOOGLE_CLIENT_ID ? (
                <div ref={googleButtonRef} className="w-full min-h-10" />
              ) : (
                <p className="text-center text-sm text-amber-400">
                  Login com Google indisponível: configuração ausente.
                </p>
              )}
            </>
          )}

          {/* Footer links */}
          <p className="text-center text-sm text-slate-500 mt-6">
            {mode === 'login' && (
              <>Ainda não tem conta?{' '}
                <button onClick={() => switchMode('register')} className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">Criar conta agora</button>
              </>
            )}
            {mode === 'register' && (
              <>Já é um veterano?{' '}
                <button onClick={() => switchMode('login')} className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">Fazer login</button>
              </>
            )}
            {mode === 'forgot' && (
              <button onClick={() => switchMode('login')} className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">← Voltar ao login</button>
            )}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#040817] px-4 py-8">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 100%, rgba(79,70,229,0.32), transparent 60%), linear-gradient(180deg, rgba(15,23,42,0.2), rgba(2,6,23,0.85))',
        }}
      />
      <div
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.42) 1px, transparent 1px)', backgroundSize: '32px 32px' }}
      />
      <Link
        to="/"
        className="absolute left-4 top-4 z-20 inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/45 px-3 py-2 text-xs font-semibold text-slate-300 backdrop-blur transition-colors hover:border-violet-400/40 hover:text-white sm:left-6 sm:top-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para inicio
      </Link>

      <div className="relative z-10 w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-indigo-200/20 bg-slate-950/60">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {mode !== 'register' ? (
            <><ShowcasePanel />{FormPanel}</>
          ) : (
            <>{FormPanel}<ShowcasePanel /></>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showSupportModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSupportModal(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="support-modal-title"
              className="relative w-full max-w-md rounded-2xl border border-indigo-400/30 bg-slate-900 p-7 shadow-2xl shadow-indigo-950/60"
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              onClick={e => e.stopPropagation()}
            >
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setShowSupportModal(false)}
                className="absolute right-4 top-4 text-slate-500 transition-colors hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-500/15">
                <Heart className="h-6 w-6 text-indigo-300" />
              </div>
              <h2 id="support-modal-title" className="mb-3 text-2xl font-extrabold text-white">
                Plot twist: faltou o domínio.
              </h2>
              <p className="mb-3 text-sm leading-relaxed text-slate-300">
                O Cognora é um projeto solo feito por uma pessoa só, muito café e zero investidores 😭
              </p>
              <p className="mb-3 text-sm leading-relaxed text-slate-400">
                Pra existir recuperação de senha por email, eu ainda preciso pagar um domínio próprio e o
                serviço que envia os emails.
              </p>
              <p className="mb-3 text-sm leading-relaxed text-slate-400">
                Então sim... nesse exato momento o botão “esqueci minha senha” ainda depende da minha conta
                bancária ou da sua ajuda.
              </p>
              <p className="mb-6 text-sm font-medium leading-relaxed text-slate-300">
                Quer ajudar esse botão a parar de ser enfeite?
              </p>

              <a
                href="/#pricing"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
              >
                <Sparkles className="h-4 w-4" />
                Ver planos
              </a>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="mt-3 w-full py-2 text-sm text-slate-500 transition-colors hover:text-slate-300"
              >
                Tudo bem, vou tentar lembrar minha senha
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
