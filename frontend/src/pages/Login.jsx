import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Loader2, Brain, Zap, Trophy, ArrowRight, User, Sparkles } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL
if (!API_URL) {
  throw new Error('[Cognora] VITE_API_URL não configurada. Crie um arquivo .env.local com VITE_API_URL=http://localhost:8001')
}
const TOKEN_KEY = 'cognora_token'

// ── Painel Showcase (mesmo conteúdo em ambos os modos) ────────────────────────
function ShowcasePanel() {
  return (
    <div className="relative hidden lg:flex flex-col p-10 bg-indigo-950/80 backdrop-blur-sm overflow-hidden h-full">
      {/* Glows */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Logo */}
      <div className="relative flex items-center gap-3 mb-7">
        <div className="h-12 w-12 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
          <Brain className="h-6 w-6 text-indigo-400" />
        </div>
        <span className="text-2xl font-extrabold text-white tracking-tight">
          PDF{' '}
          <span className="bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
            Quest
          </span>
        </span>
      </div>

      {/* Descrição */}
      <p className="relative text-indigo-200/80 text-base leading-relaxed mb-8">
        Transforme seus PDFs chatos em missões épicas. Gere resumos com IA,
        responda quizzes e suba no ranking contra seus amigos.
      </p>

      {/* Card: IA Ativada */}
      <div className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mb-4 backdrop-blur-sm -translate-x-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-emerald-400 text-xs font-semibold uppercase tracking-widest">
              IA Ativada
            </span>
          </div>
          <span className="text-slate-500 text-xs">Há 2 min</span>
        </div>
        <p className="text-slate-200 text-sm font-medium leading-snug">
          "Capítulo 4: Fisiologia Humana" resumido em 3 tópicos principais e 5 flashcards gerados.
        </p>
        <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
          <span>📄 45 págs</span>
          <span>→</span>
          <span>⏱ 5 min de leitura</span>
        </div>
      </div>

      {/* Card: Ranking */}
      <div className="w-full bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm translate-x-5">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="h-4 w-4 text-amber-400" />
          <span className="text-slate-200 text-sm font-semibold">Ranking da Semana</span>
        </div>
        <div className="space-y-2.5">
          <div className="flex items-center gap-3">
            <span className="text-amber-400 font-bold text-sm w-4">1</span>
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs text-white font-bold flex-shrink-0">
              VC
            </div>
            <span className="text-slate-200 text-sm font-medium flex-1">Você</span>
            <span className="text-emerald-400 text-xs font-semibold">↗ 2.450 XP</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 font-bold text-sm w-4">2</span>
            <div className="h-7 w-7 rounded-full bg-slate-600 flex items-center justify-center text-xs text-white font-bold flex-shrink-0">
              MA
            </div>
            <span className="text-slate-300 text-sm flex-1">Marcos A.</span>
            <span className="text-slate-400 text-xs">2.100 XP</span>
          </div>
        </div>
      </div>

      {/* Social proof */}
      <div className="relative mt-auto pt-8">
        <p className="text-slate-400 text-sm">
          Junte-se a{' '}
          <span className="text-white font-bold">12.400+</span>{' '}
          estudantes evoluindo agora.
        </p>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Login() {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [confirmPassword, setConfirm]   = useState('');
  const [heroName, setHeroName]         = useState('');
  const [mode, setMode]                 = useState('login');
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  const isLogin = mode === 'login';

  const switchMode = (next) => {
    setError('');
    setMode(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isLogin && password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || 'Erro ao processar solicitação');
        return;
      }
      localStorage.setItem(TOKEN_KEY, data.access_token);
      setTimeout(() => { window.location.href = '/'; }, 300);
    } catch {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  // ── Painel de formulário ────────────────────────────────────────────────────
  const FormPanel = (
    <div className="flex flex-col justify-center p-8 lg:p-10 bg-slate-900/90 backdrop-blur-sm h-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, x: isLogin ? 40 : -40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isLogin ? -40 : 40 }}
          transition={{ duration: 0.28, ease: 'easeInOut' }}
        >
          {/* Título */}
          <div className="mb-8">
            <div className="h-14 w-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mb-5">
              <Brain className="h-7 w-7 text-indigo-400" />
            </div>
            <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">
              {isLogin ? 'Bem-vindo de volta!' : 'Sua jornada começa aqui'}
            </h1>
            <p className="text-slate-400 text-base">
              {isLogin
                ? 'Bora estudar ou vai fugir de novo? 😅'
                : 'Seu cérebro agradece esse cadastro. Prepare-se para evoluir!'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo Nome (só no registro) */}
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-200 tracking-wide">
                  Nome de Herói (ou o seu mesmo)
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Ex: Mago dos PDFs"
                    value={heroName}
                    onChange={(e) => setHeroName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-sm bg-slate-800 border border-slate-700 text-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 placeholder:text-slate-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-200 tracking-wide">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 text-sm bg-slate-800 border border-slate-700 text-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 placeholder:text-slate-500 transition-colors"
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-200 tracking-wide">Senha</label>
                {isLogin && (
                  <button type="button" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  className="w-full pl-10 pr-4 py-3 text-sm bg-slate-800 border border-slate-700 text-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 placeholder:text-slate-500 transition-colors"
                />
              </div>
            </div>

            {/* Confirmar Senha (só no registro) */}
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-200 tracking-wide">Confirmar Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="w-full pl-10 pr-4 py-3 text-sm bg-slate-800 border border-slate-700 text-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 placeholder:text-slate-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/50 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            {/* CTA */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-3 rounded-xl transition-colors disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isLogin ? (
                <>Entrar na Arena <ArrowRight className="h-4 w-4" /></>
              ) : (
                <>Começar a Evoluir <Sparkles className="h-4 w-4" /></>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-xs text-slate-500">ou</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          {/* Google */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 border border-slate-700 bg-slate-800 hover:bg-slate-700 rounded-xl py-3 text-sm font-medium text-slate-300 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.96l3.007 2.332C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            {isLogin ? 'Entrar com Google' : 'Cadastrar com Google'}
          </button>

          {/* Footer */}
          <p className="text-center text-sm text-slate-500 mt-6">
            {isLogin ? (
              <>
                Ainda não tem uma conta?{' '}
                <button onClick={() => switchMode('register')} className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                  Criar conta agora
                </button>
              </>
            ) : (
              <>
                Já é um veterano?{' '}
                <button onClick={() => switchMode('login')} className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                  Fazer login
                </button>
              </>
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
        {/* Layout espelhado: login=[showcase|form], register=[form|showcase] */}
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {isLogin ? (
            <>
              <ShowcasePanel />
              {FormPanel}
            </>
          ) : (
            <>
              {FormPanel}
              <ShowcasePanel />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
