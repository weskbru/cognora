import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Lock, Loader2, Brain, Zap, Trophy,
  ArrowRight, User, Sparkles, AtSign, CheckCircle2, Eye, EyeOff,
} from 'lucide-react';
// Loader2 é usado no botão de submit
import { setToken } from '@/lib/tokenStorage';

const API_URL = import.meta.env.VITE_API_URL as string;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

type Mode = 'login' | 'register' | 'forgot';

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
  return (
    <div className="relative hidden lg:flex flex-col p-10 bg-indigo-950/80 backdrop-blur-sm overflow-hidden h-full">
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative flex items-center gap-3 mb-7">
        <div className="h-12 w-12 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
          <Brain className="h-6 w-6 text-indigo-400" />
        </div>
        <span className="text-2xl font-extrabold text-white tracking-tight">Cognora</span>
      </div>
      <p className="relative text-indigo-200/80 text-base leading-relaxed mb-8">
        Transforme seus PDFs em missões épicas. Gere resumos com IA,
        responda quizzes e suba no ranking contra seus amigos.
      </p>
      <div className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mb-4 backdrop-blur-sm -translate-x-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-emerald-400 text-xs font-semibold uppercase tracking-widest">IA Ativada</span>
          </div>
          <span className="text-slate-500 text-xs">Há 2 min</span>
        </div>
        <p className="text-slate-200 text-sm font-medium leading-snug">
          "Capítulo 4: Fisiologia Humana" resumido em 3 tópicos e 5 flashcards gerados.
        </p>
        <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
          <span>📄 45 págs</span><span>→</span><span>⏱ 5 min de leitura</span>
        </div>
      </div>
      <div className="w-full bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm translate-x-5">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="h-4 w-4 text-amber-400" />
          <span className="text-slate-200 text-sm font-semibold">Ranking da Semana</span>
        </div>
        <div className="space-y-2.5">
          {[
            { pos: '1', initials: 'VC', name: 'Você', xp: '↗ 2.450 XP', gold: true },
            { pos: '2', initials: 'MA', name: 'Marcos A.', xp: '2.100 XP', gold: false },
          ].map(r => (
            <div key={r.pos} className="flex items-center gap-3">
              <span className={`font-bold text-sm w-4 ${r.gold ? 'text-amber-400' : 'text-slate-500'}`}>{r.pos}</span>
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs text-white font-bold flex-shrink-0 ${r.gold ? 'bg-gradient-to-br from-indigo-500 to-purple-500' : 'bg-slate-600'}`}>{r.initials}</div>
              <span className={`text-sm flex-1 ${r.gold ? 'text-slate-200 font-medium' : 'text-slate-300'}`}>{r.name}</span>
              <span className={`text-xs font-semibold ${r.gold ? 'text-emerald-400' : 'text-slate-400'}`}>{r.xp}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="relative mt-auto pt-8">
        <p className="text-slate-400 text-sm">
          Junte-se a <span className="text-white font-bold">12.400+</span> estudantes evoluindo agora.
        </p>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Login() {
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

  const handleGoogleCallback = useCallback(async ({ credential }: { credential: string }) => {
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || 'Erro ao autenticar com Google'); return; }
      setToken(data.access_token, remember);
      if (data.is_new_user) {
        setSuccessMsg('Conta criada com sucesso! Redirecionando...');
        setTimeout(() => { window.location.href = '/'; }, 1500);
      } else {
        window.location.href = '/';
      }
    } catch {
      setError('Não foi possível conectar ao servidor.');
    }
  }, [remember]);

  // Renderiza o iframe do Google no overlay após o script carregar
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || mode === 'forgot') return;

    const renderBtn = () => {
      const container = document.getElementById('google-signin-btn');
      if (!window.google || !container) return;
      // Usa a largura real do container depois do layout
      const w = container.offsetWidth || container.parentElement?.offsetWidth || 400;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
      });
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
  }, [mode, handleGoogleCallback]);

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
      setLoading(true);
      try {
        await fetch(`${API_URL}/api/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        setSuccessMsg('Se o email existir, você receberá um link em instantes. Verifique sua caixa de entrada.');
      } catch {
        setError('Não foi possível conectar ao servidor.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'register') {
      if (password !== confirmPassword) { setError('As senhas não coincidem.'); return; }
      if (username.length < 3) { setError('Nome de usuário deve ter ao menos 3 caracteres.'); return; }
    }

    setLoading(true);
    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const body = mode === 'login'
      ? { identifier, password }
      : { email, username, password };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || 'Erro ao processar solicitação'); return; }
      setToken(data.access_token, remember);
      window.location.href = '/';
    } catch {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full pl-10 pr-4 py-3 text-sm bg-slate-800 border border-slate-700 text-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 placeholder:text-slate-500 transition-colors';
  const passwordInputCls = 'w-full pl-10 pr-10 py-3 text-sm bg-slate-800 border border-slate-700 text-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 placeholder:text-slate-500 transition-colors';

  const FormPanel = (
    <div className="flex flex-col justify-center p-8 lg:p-10 bg-slate-900/90 backdrop-blur-sm h-full">
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
            <div className="h-14 w-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mb-5">
              <Brain className="h-7 w-7 text-indigo-400" />
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
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-3 rounded-xl transition-colors disabled:opacity-60">
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
              {/* Botão visual + iframe do Google invisível sobreposto */}
              <div className="relative w-full">
                {/* Botão visual — pointer-events-none, o iframe do Google fica em cima */}
                <button
                  type="button"
                  tabIndex={-1}
                  style={{ pointerEvents: 'none' }}
                  className="w-full flex items-center justify-center gap-3 border border-slate-700 bg-slate-800 hover:bg-slate-700 rounded-xl py-3 text-sm font-medium text-slate-300 select-none"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                    <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.96l3.007 2.332C4.672 5.163 6.656 3.58 9 3.58z"/>
                  </svg>
                  {mode === 'login' ? 'Entrar com Google' : 'Cadastrar com Google'}
                </button>
                {/* Iframe do Google: opacity 0, cobre 100% do botão acima e captura os cliques */}
                <div
                  id="google-signin-btn"
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0 }}
                />
              </div>
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
    <div
      className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-8"
      style={{
        backgroundImage: `
          linear-gradient(rgba(99,102,241,0.07) 1px, transparent 1px),
          linear-gradient(90deg, rgba(99,102,241,0.07) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }}
    >
      <div className="w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl border border-white/10">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {mode !== 'register' ? (
            <><ShowcasePanel />{FormPanel}</>
          ) : (
            <>{FormPanel}<ShowcasePanel /></>
          )}
        </div>
      </div>
    </div>
  );
}
