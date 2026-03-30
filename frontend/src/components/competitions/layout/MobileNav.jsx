import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, FileText, HelpCircle, GraduationCap, Menu, X, Swords, Trophy, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/subjects', label: 'Matérias', icon: BookOpen },
  { path: '/documents', label: 'Documentos', icon: FileText },
  { path: '/quiz', label: 'Questões', icon: HelpCircle },
  { path: '/competitions', label: 'Competições', icon: Swords },
  { path: '/leaderboard', label: 'Ranking', icon: Trophy },
  { path: '/profile', label: 'Meu Progresso', icon: User },
];

export default function MobileNav() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-30 flex items-center justify-between px-4">
      <Link to="/" className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <GraduationCap className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-foreground">StudyAI</span>
      </Link>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="p-6 border-b border-border">
            <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-lg font-bold">StudyAI</h1>
            </Link>
          </div>
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}