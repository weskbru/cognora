import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL
if (!API_URL) {
  throw new Error('[Cognora] VITE_API_URL não configurada. Crie um arquivo .env.local com VITE_API_URL=http://localhost:8001')
}
const TOKEN_KEY = 'cognora_token'

/* ─── Win2000 primitive components ──────────────────────────────────────────── */

function Win2kButton({ children, onClick, type = 'button', disabled = false, variant = 'default' }) {
  const base = [
    'px-4 py-1 text-sm font-normal cursor-pointer select-none',
    'border-2 active:translate-y-px',
    'focus:outline-dotted focus:outline-1 focus:outline-black focus:outline-offset-[-2px]',
    disabled ? 'opacity-60 cursor-not-allowed' : '',
  ].join(' ');

  const styles = variant === 'primary'
    ? 'bg-[#ECE9D8] text-black border-t-white border-l-white border-r-[#888] border-b-[#888] shadow-[inset_-1px_-1px_0_#444,inset_1px_1px_0_#fff]'
    : 'bg-[#ECE9D8] text-black border-t-white border-l-white border-r-[#888] border-b-[#888] shadow-[inset_-1px_-1px_0_#444,inset_1px_1px_0_#fff]';

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}

function Win2kInput({ id, type = 'text', value, onChange, placeholder, autoComplete, required, minLength }) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoComplete={autoComplete}
      required={required}
      minLength={minLength}
      className={[
        'w-full px-1.5 py-0.5 text-sm text-black',
        'bg-white',
        'border-2',
        'border-t-[#808080] border-l-[#808080] border-r-white border-b-white',
        'shadow-[inset_1px_1px_0_#444]',
        'focus:outline-none',
        'font-[Tahoma,sans-serif]',
      ].join(' ')}
    />
  );
}

/* ─── Classic Win2k dialog window ────────────────────────────────────────────── */
function Win2kWindow({ title, icon, children, className = '' }) {
  return (
    <div className={`bg-[#ECE9D8] border-2 border-t-white border-l-white border-r-[#444] border-b-[#444] shadow-[2px_2px_0_#000] ${className}`}>
      {/* Title bar */}
      <div className="flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] select-none">
        {icon && <span className="text-base">{icon}</span>}
        <span className="text-white text-xs font-bold flex-1 truncate font-[Tahoma,sans-serif]">{title}</span>
        {/* Window controls */}
        <div className="flex gap-0.5">
          {['_', '□', '×'].map((c) => (
            <div
              key={c}
              className="w-4 h-4 bg-[#ECE9D8] border border-t-white border-l-white border-r-[#444] border-b-[#444] flex items-center justify-center text-[10px] font-bold text-black cursor-default leading-none shadow-[inset_-1px_-1px_0_#888,inset_1px_1px_0_#fff]"
            >
              {c}
            </div>
          ))}
        </div>
      </div>
      {/* Content */}
      <div className="p-3">{children}</div>
    </div>
  );
}

/* ─── Showcase Panel ──────────────────────────────────────────────────────────── */
function ShowcasePanel() {
  return (
    <div className="hidden lg:flex flex-col gap-3 p-4 bg-[#ECE9D8] border-r-2 border-r-[#888]">
      {/* App icon + name */}
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 bg-[#ECE9D8] border-2 border-t-white border-l-white border-r-[#444] border-b-[#444] flex items-center justify-center shadow-[inset_-1px_-1px_0_#888,inset_1px_1px_0_#fff]">
          <span className="text-2xl">📄</span>
        </div>
        <div>
          <div className="text-sm font-bold text-black font-[Tahoma,sans-serif]">PDF Quest</div>
          <div className="text-xs text-[#444] font-[Tahoma,sans-serif]">Versão 2.0.0</div>
        </div>
      </div>

      {/* Separator */}
      <div className="h-px bg-[#888] shadow-[0_1px_0_white]" />

      <p className="text-xs text-black font-[Tahoma,sans-serif] leading-relaxed">
        Transforme seus PDFs em missões épicas. Gere resumos com IA,
        responda quizzes e suba no ranking.
      </p>

      {/* AI Status window */}
      <Win2kWindow title="Status da IA" icon="⚡">
        <div className="text-xs font-[Tahoma,sans-serif] space-y-1">
          <div className="flex justify-between">
            <span className="text-black">Estado:</span>
            <span className="text-[#008000] font-bold">✔ Ativa</span>
          </div>
          <div className="text-[#444] mt-1 leading-relaxed">
            &ldquo;Capítulo 4: Fisiologia Humana&rdquo; resumido em 3 tópicos e 5 flashcards.
          </div>
          <div className="flex gap-3 mt-2 text-[#444]">
            <span>📄 45 págs</span>
            <span>→</span>
            <span>⏱ 5 min</span>
          </div>
        </div>
      </Win2kWindow>

      {/* Leaderboard window */}
      <Win2kWindow title="Ranking da Semana" icon="🏆">
        <table className="w-full text-xs font-[Tahoma,sans-serif]">
          <thead>
            <tr className="bg-[#0A246A] text-white">
              <th className="px-1 py-0.5 text-left font-normal">#</th>
              <th className="px-1 py-0.5 text-left font-normal">Usuário</th>
              <th className="px-1 py-0.5 text-right font-normal">XP</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-[#316AC5] text-white">
              <td className="px-1 py-0.5">1</td>
              <td className="px-1 py-0.5">Você</td>
              <td className="px-1 py-0.5 text-right">2.450</td>
            </tr>
            <tr>
              <td className="px-1 py-0.5">2</td>
              <td className="px-1 py-0.5">Marcos A.</td>
              <td className="px-1 py-0.5 text-right">2.100</td>
            </tr>
            <tr className="bg-white/40">
              <td className="px-1 py-0.5">3</td>
              <td className="px-1 py-0.5">Juliana S.</td>
              <td className="px-1 py-0.5 text-right">1.980</td>
            </tr>
          </tbody>
        </table>
      </Win2kWindow>

      {/* Status bar */}
      <div className="mt-auto border-t-2 border-t-[#888] border-b-white pt-1 flex items-center gap-2 text-xs text-[#444] font-[Tahoma,sans-serif]">
        <div className="w-2 h-2 rounded-full bg-[#008000]" />
        12.400+ estudantes online
      </div>
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────────────────── */
export default function Login() {
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [confirmPassword, setConfirm] = useState('');
  const [heroName, setHeroName]       = useState('');
  const [mode, setMode]               = useState('login');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  const isLogin = mode === 'login';

  const switchMode = (next) => { setError(''); setMode(next); };

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
      if (!res.ok) { setError(data.detail || 'Erro ao processar solicitação'); return; }
      localStorage.setItem(TOKEN_KEY, data.access_token);
      setTimeout(() => { window.location.href = '/'; }, 300);
    } catch {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  const title = isLogin ? 'Entrar no PDF Quest' : 'Criar nova conta';

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{
        background: 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAFklEQVQImWNgYGD4z8BQDwAEgAF/QualIQAAAABJRU5ErkJggg==") repeat',
        backgroundColor: '#3A6EA5',
      }}
    >
      {/* Outer dialog chrome */}
      <div className="w-full max-w-3xl bg-[#ECE9D8] border-2 border-t-white border-l-white border-r-[#444] border-b-[#444] shadow-[3px_3px_0_#000]">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-2 py-1 bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] select-none">
          <span className="text-base">📄</span>
          <span className="text-white text-xs font-bold flex-1 font-[Tahoma,sans-serif]">
            PDF Quest — {isLogin ? 'Autenticação de Usuário' : 'Registro de Novo Usuário'}
          </span>
          <div className="flex gap-0.5">
            {['_', '□', '×'].map((c) => (
              <div key={c} className="w-4 h-4 bg-[#ECE9D8] border border-t-white border-l-white border-r-[#444] border-b-[#444] flex items-center justify-center text-[10px] font-bold text-black cursor-default leading-none shadow-[inset_-1px_-1px_0_#888,inset_1px_1px_0_#fff]">
                {c}
              </div>
            ))}
          </div>
        </div>

        {/* Menu bar */}
        <div className="flex items-center gap-0 px-1 border-b border-b-[#888] text-xs font-[Tahoma,sans-serif]">
          {['Arquivo', 'Editar', 'Exibir', 'Ajuda'].map((m) => (
            <button key={m} className="px-3 py-0.5 hover:bg-[#316AC5] hover:text-white text-black focus:outline-none">
              {m}
            </button>
          ))}
        </div>

        {/* Two-panel body */}
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {isLogin ? (
            <>
              <ShowcasePanel />
              <FormPanel
                isLogin={isLogin}
                title={title}
                email={email} setEmail={setEmail}
                password={password} setPassword={setPassword}
                confirmPassword={confirmPassword} setConfirm={setConfirm}
                heroName={heroName} setHeroName={setHeroName}
                loading={loading} error={error}
                handleSubmit={handleSubmit} switchMode={switchMode}
              />
            </>
          ) : (
            <>
              <FormPanel
                isLogin={isLogin}
                title={title}
                email={email} setEmail={setEmail}
                password={password} setPassword={setPassword}
                confirmPassword={confirmPassword} setConfirm={setConfirm}
                heroName={heroName} setHeroName={setHeroName}
                loading={loading} error={error}
                handleSubmit={handleSubmit} switchMode={switchMode}
              />
              <ShowcasePanel />
            </>
          )}
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-3 px-2 py-0.5 border-t-2 border-t-[#888] border-b-white text-xs font-[Tahoma,sans-serif]">
          <div className="flex-1 flex items-center gap-1.5 border-r border-r-[#888] pr-2">
            <div className="w-2 h-2 rounded-full bg-[#008000]" />
            <span className="text-black">Pronto</span>
          </div>
          <span className="text-[#444]">PDF Quest v2.0 © 2025</span>
        </div>
      </div>

      {/* Windows 2000 taskbar hint */}
      <div className="mt-2 text-xs text-white/70 font-[Tahoma,sans-serif]">
        Microsoft Windows 2000 Professional — Build 2195
      </div>
    </div>
  );
}

/* ─── Form panel (extracted for layout flip) ────────────────────────────────── */
function FormPanel({
  isLogin, title,
  email, setEmail,
  password, setPassword,
  confirmPassword, setConfirm,
  heroName, setHeroName,
  loading, error,
  handleSubmit, switchMode,
}) {
  return (
    <div className="flex flex-col p-4 gap-3 font-[Tahoma,sans-serif]">
      {/* Fieldset-style group box */}
      <fieldset className="border border-[#888] px-3 pb-3 pt-1">
        <legend className="px-1 text-xs text-black font-bold">{title}</legend>

        <form onSubmit={handleSubmit} className="space-y-3 mt-1">
          {/* Hero name — register only */}
          {!isLogin && (
            <div className="flex flex-col gap-0.5">
              <label htmlFor="heroName" className="text-xs text-black">
                Nome de Usuário:
              </label>
              <Win2kInput
                id="heroName"
                type="text"
                placeholder="Ex: MagoDosBooks"
                value={heroName}
                onChange={(e) => setHeroName(e.target.value)}
              />
            </div>
          )}

          {/* Email */}
          <div className="flex flex-col gap-0.5">
            <label htmlFor="email" className="text-xs text-black">
              Endereço de E-mail:
            </label>
            <Win2kInput
              id="email"
              type="email"
              placeholder="usuario@dominio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-xs text-black">Senha:</label>
              {isLogin && (
                <button type="button" className="text-[10px] text-[#0000EE] underline hover:text-[#551A8B]">
                  Esqueceu a senha?
                </button>
              )}
            </div>
            <Win2kInput
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              required
              minLength={6}
            />
          </div>

          {/* Confirm password — register only */}
          {!isLogin && (
            <div className="flex flex-col gap-0.5">
              <label htmlFor="confirm" className="text-xs text-black">Confirmar Senha:</label>
              <Win2kInput
                id="confirm"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
              />
            </div>
          )}

          {/* Error message box */}
          {error && (
            <div className="flex items-start gap-2 bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white p-2 shadow-[inset_1px_1px_0_#444]">
              <span className="text-lg leading-none">⚠️</span>
              <p className="text-xs text-black">{error}</p>
            </div>
          )}

          {/* Buttons row */}
          <div className="flex justify-end gap-2 pt-1">
            <Win2kButton type="submit" disabled={loading} variant="primary">
              {loading ? 'Aguarde...' : isLogin ? 'OK' : 'Registrar'}
            </Win2kButton>
            <Win2kButton type="button" onClick={() => switchMode(isLogin ? 'register' : 'login')}>
              {isLogin ? 'Criar Conta' : 'Voltar ao Login'}
            </Win2kButton>
          </div>
        </form>
      </fieldset>

      {/* Separator */}
      <div className="h-px bg-[#888] shadow-[0_1px_0_white]" />

      {/* Google sign in */}
      <fieldset className="border border-[#888] px-3 pb-3 pt-1">
        <legend className="px-1 text-xs text-black font-bold">Outras Opções de Acesso</legend>
        <button
          type="button"
          className="mt-2 w-full flex items-center gap-2 px-3 py-1 text-xs text-black bg-[#ECE9D8] border-2 border-t-white border-l-white border-r-[#444] border-b-[#444] shadow-[inset_-1px_-1px_0_#888,inset_1px_1px_0_#fff] hover:bg-[#d8d5c4] active:border-t-[#444] active:border-l-[#444] active:border-r-white active:border-b-white"
        >
          <svg width="14" height="14" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.96l3.007 2.332C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          {isLogin ? 'Entrar com Google' : 'Registrar com Google'}
        </button>
      </fieldset>
    </div>
  );
}
