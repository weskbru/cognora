import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell, LogOut, User, ChevronDown, Menu, Star } from 'lucide-react';
import { Sun, Moon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useRewardsContext } from '@/context/RewardsContext';
import { useTheme } from '@/hooks/useTheme';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';


function getInitials(email) {
  if (!email) return '?';
  return email.split('@')[0].slice(0, 2).toUpperCase();
}

export default function TopBar({ onMenuClick = () => {}, sidebarOpen = true }) {
  const { user } = useAuth();
  const { notifications, unreadCount, clearUnread } = useRewardsContext();
  const { isDark, toggle } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleOpenNotif = () => {
    setNotifOpen(v => !v);
    if (!notifOpen) clearUnread();
  };

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
        <div className="relative">
          <button
            title="Notificações"
            onClick={handleOpenNotif}
            className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors relative"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-lg z-20 overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Notificações</p>
                  {notifications.length > 0 && (
                    <span className="text-xs text-muted-foreground">{notifications.length} evento{notifications.length !== 1 ? 's' : ''}</span>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                      <Star className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      Nenhuma notificação ainda
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className="flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-sm ${n.levelUp ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-primary/10'}`}>
                          {n.levelUp ? '🏆' : '⭐'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground leading-snug">{n.reason}</p>
                          {n.levelUp && n.newLevel && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">Subiu para Nível {n.newLevel}!</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDistanceToNow(new Date(n.date), { addSuffix: true, locale: ptBR })}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-primary shrink-0">+{n.xp} XP</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

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
