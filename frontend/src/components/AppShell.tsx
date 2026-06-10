import { LayoutDashboard, LogOut, Plus } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';

export function AppShell({ children, onNewProject }: { children: React.ReactNode; onNewProject?: () => void }) {
  const { session, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-white/10 bg-surface-800/80 backdrop-blur-xl">
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-xs font-bold">TF</div>
          <div className="min-w-0">
            <p className="truncate font-display font-semibold">{session?.tenant.name}</p>
            <p className="truncate text-xs text-slate-500">{session?.tenant.slug}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          <Link
            to="/dashboard"
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
              location.pathname === '/dashboard'
                ? 'bg-brand-500/20 text-brand-400'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Projects
          </Link>
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 truncate text-sm">
            <p className="font-medium text-white">{session?.user.fullName}</p>
            <p className="text-xs text-slate-500">{session?.user.role.replace('_', ' ')}</p>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={logout}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="ml-64 flex flex-1 flex-col">
        {onNewProject && (
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-surface-900/80 px-8 py-4 backdrop-blur-xl">
            <h1 className="font-display text-xl font-semibold">Projects</h1>
            <Button size="sm" onClick={onNewProject}>
              <Plus className="h-4 w-4" /> New project
            </Button>
          </header>
        )}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
