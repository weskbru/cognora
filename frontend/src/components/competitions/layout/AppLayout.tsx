import { Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import MobileNav from './MobileNav';
import LimitReachedCard from '@/components/freemium/LimitReachedCard';
import { consumeGenerationLimitAfterLogin } from '@/lib/postLoginNotice';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showGenerationLimit, setShowGenerationLimit] = useState(() => consumeGenerationLimitAfterLogin());
  const location = useLocation();

  // Close sidebar on mobile when route changes
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="app-typography min-h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} />
      <TopBar onMenuClick={toggleSidebar} sidebarOpen={sidebarOpen} />
      <MobileNav />
      {showGenerationLimit && (
        <LimitReachedCard
          code="GENERATION_LIMIT_REACHED"
          onDismiss={() => setShowGenerationLimit(false)}
        />
      )}
      <main className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'} pt-[70px] min-h-screen`}>
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
