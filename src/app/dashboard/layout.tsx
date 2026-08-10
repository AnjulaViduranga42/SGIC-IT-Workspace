'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  CheckSquare, 
  BarChart3, 
  Users, 
  FileSpreadsheet, 
  LogOut, 
  Menu, 
  X,
  User as UserIcon,
  ChevronDown,
  PanelsTopLeft,
  ClipboardCheck,
  FolderKanban,
  Wrench
} from 'lucide-react';
import ThemeToggle from '@/components/theme-toggle';

interface User {
  name: string;
  email: string;
  role: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAppProgressRoute = pathname.startsWith('/dashboard/app-progress');
  const [appProgressOpen, setAppProgressOpen] = useState(isAppProgressRoute);

  useEffect(() => {
    // Fetch logged in user profile
    fetch('/api/auth/me')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Unauthorized');
      })
      .then((data) => {
        if (data.authenticated) {
          setCurrentUser(data.user);
        } else {
          router.push('/login');
        }
      })
      .catch(() => {
        router.push('/login');
      });
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navLinks = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare },
    { name: 'KPIs', href: '/dashboard/kpis', icon: BarChart3 },
    { name: 'Admins & Staff', href: '/dashboard/users', icon: Users },
    { name: 'Reports', href: '/dashboard/reports', icon: FileSpreadsheet },
  ];

  const appProgressLinks = [
    { name: 'Virtual Assessor', href: '/dashboard/app-progress/virtual-assessor', icon: ClipboardCheck },
    { name: 'DMS', href: '/dashboard/app-progress/dms', icon: FolderKanban },
    { name: 'Salvage Management', href: '/dashboard/app-progress/salvage-management', icon: Wrench },
  ];

  return (
    <div className="flex-1 flex flex-col md:flex-row h-screen overflow-hidden relative">
      
      {/* Mobile Top Bar */}
      <header className="md:hidden glass-panel-heavy rounded-none border-t-0 border-x-0 flex items-center justify-between p-4 z-40">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center gap-2">
            <img src="/logo.png" alt="Sanasa General Insurance Logo" className="h-10 w-auto object-contain" />
            <span className="text-base font-bold bg-gradient-to-r from-white to-indigo-300 bg-clip-text text-transparent">
              Workspace
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-white cursor-pointer"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 h-dvh w-64 glass-panel-heavy rounded-none border-y-0 border-l-0 p-6 flex flex-col overflow-hidden z-50
        transition-transform duration-300 transform md:translate-x-0 md:static md:w-64 shrink-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="min-h-0 flex-1 space-y-8 overflow-y-auto overscroll-contain pr-1">
          {/* Logo */}
          <div className="hidden md:flex flex-col items-center">
            <Link href="/dashboard" className="flex justify-center hover:opacity-85 transition-opacity">
              <img 
                src="/logo.png" 
                alt="Sanasa General Insurance Logo" 
                className="h-16 w-auto object-contain max-w-[190px] drop-shadow-[0_0_8px_rgba(99,102,241,0.1)]"
              />
            </Link>
            <p className="text-xs font-bold tracking-wider uppercase text-center mt-3 text-slate-300">
              SGIC IT Workspace
            </p>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer
                    ${isActive 
                      ? 'sidebar-active-link bg-gradient-to-r from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 text-white font-semibold shadow-[0_0_12px_rgba(99,102,241,0.15)]' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                    }
                  `}
                >
                  <Icon size={18} className={isActive ? 'text-indigo-400' : 'text-slate-400'} />
                  <span>{link.name}</span>
                </Link>
              );
            })}

            <div className="pt-3">
              <button
                type="button"
                onClick={() => setAppProgressOpen((open) => !open)}
                aria-expanded={appProgressOpen}
                aria-controls="app-progress-navigation"
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer
                  ${isAppProgressRoute
                    ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 text-white font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }
                `}
              >
                <PanelsTopLeft size={18} className={isAppProgressRoute ? 'text-indigo-400' : 'text-slate-400'} />
                <span className="flex-1 text-left">App Progress Dashboard</span>
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${appProgressOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {appProgressOpen && (
                <div id="app-progress-navigation" className="mt-1 ml-5 pl-3 border-l border-white/10 space-y-1">
                  {appProgressLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;

                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`
                          flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200
                          ${isActive
                            ? 'bg-indigo-500/15 text-white border border-indigo-500/25'
                            : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                          }
                        `}
                      >
                        <Icon size={16} className={isActive ? 'text-indigo-400' : 'text-slate-500'} />
                        <span>{link.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Profile Card & Logout */}
        <div className="sidebar-account-footer mt-4 shrink-0 space-y-4 border-t border-white/5 pt-5">
          {currentUser && (
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center border border-white/20 text-white shadow-lg shrink-0">
                  <UserIcon size={16} />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-white truncate">{currentUser.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
                </div>
              </div>
              <div className="shrink-0 scale-90">
                <ThemeToggle />
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-200 hover:bg-red-500/10 hover:border-red-500/30 text-sm font-medium transition-all duration-200 cursor-pointer"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden h-full">
        {/* Dynamic Content Outlet */}
        <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto min-h-0">
          {children}
        </div>
      </main>
      
      {/* Mobile backdrop for sidebar */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        />
      )}
    </div>
  );
}
