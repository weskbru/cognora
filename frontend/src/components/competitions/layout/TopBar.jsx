import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell, LogOut, User, ChevronDown, Menu } from 'lucide-react';
import { Sun, Moon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useRewardsContext } from '@/context/RewardsContext';
import { getLevelInfo } from '@/hooks/useRewards';
import { useTheme } from '@/hooks/useTheme';

const LEVEL_EMOJIS = ['🌱','📖','💡','🎯','🚀','⚡','🏆','🧠','🌟','👑'];

function getInitials(email) {
  if (!email) return '?';
  return email.split('@')[0].slice(0, 2).toUpperCase();
}

export default function TopBar({ onMenuClick = () => {}, sidebarOpen = true }) {
  const { user } = useAuth();
  const { progress } = useRewardsContext();
  const level = progress ? getLevelInfo(progress.xp || 0) : null;
  const { isDark, toggle } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const initials = getInitials(user?.email);
  const username = user?.email?.split('@')[0] ?? '';

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/quiz?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <header className={`fixed top-0 h-[70px] bg-card border-b border-border z-20 flex items-center justify-between px-5 gap-4 right-0 transition-all duration-300 ${sidebarOpen ? 'left-64' : 'left-0'}`}>

      {/* Lado esquerdo — hamburguer + busca */}
      <div className="flex items-center gap-3 flex-1">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar ou digitar comando..."
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-14 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground pointer-events-none">
              ⌘K
            </kbd>
          </div>
        </form>
      </div>

      {/* Lado direito — tema, notificações, usuário */}
      <div className="flex items-center gap-1">

        {/* Tema */}
        <button
          onClick={toggle}
          title={isDark ? 'Modo Claro' : 'Modo Escuro'}
          className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notificações */}
        <button
          title="Notificações"
          className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors relative"
        >
          <Bell className="h-5 w-5" />
        </button>

        {/* Separador */}
        <div className="w-px h-6 bg-border mx-1" />

        {/* Menu do usuário */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(v => !v)}
            className="flex items-center gap-2.5 pl-1 pr-2 py-1.5 rounded-xl hover:bg-secondary transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0 overflow-hidden">
              <span className="text-xs font-bold text-primary leading-none">{initials}</span>
            </div>
            <span className="hidden sm:block text-sm font-medium text-foreground capitalize">{username}</span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-lg z-20 overflow-hidden">
                {/* Header do menu */}
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold text-foreground capitalize truncate">{username}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{user?.email}</p>
                  {level && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {LEVEL_EMOJIS[Math.min(level.level - 1, 9)]} Nível {level.level} · {progress?.xp ?? 0} XP
                    </p>
                  )}
                </div>

                {/* Itens */}
                <div className="py-1">
                  <Link
                    to="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    Meu Perfil
                  </Link>
                  <button
                    onClick={() => { setUserMenuOpen(false); base44.auth.logout(); }}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors w-full"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </header>
  );
}
