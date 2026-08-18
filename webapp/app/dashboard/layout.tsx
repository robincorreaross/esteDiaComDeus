'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Users,
  Clock,
  History,
  FlaskConical,
  LogOut,
  Sparkles,
  ShieldCheck,
  Menu,
  X
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('robincorrea@gmail.com');

  useEffect(() => {
    const userRaw = localStorage.getItem('este_dia_user');
    if (!userRaw) {
      router.push('/login');
      return;
    }
    try {
      const u = JSON.parse(userRaw);
      if (!u.authenticated) {
        router.push('/login');
      } else {
        setUserEmail(u.email || 'robincorrea@gmail.com');
      }
    } catch {
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('este_dia_user');
    router.push('/login');
  };

  const navItems = [
    { label: 'Visão Geral', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Prompt da IA', href: '/dashboard/prompt', icon: FileText },
    { label: 'Contatos & Grupos', href: '/dashboard/contacts', icon: Users },
    { label: 'Horário & Alertas', href: '/dashboard/schedule', icon: Clock },
    { label: 'Histórico de Logs', href: '/dashboard/logs', icon: History },
    { label: 'Área de Testes', href: '/dashboard/test', icon: FlaskConical },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0b0f19] text-slate-100">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-[#131b2e]/90 border-r border-slate-800/80 p-5 shrink-0 justify-between min-h-screen">
        <div>
          <div className="flex items-center gap-3 px-2 py-3 mb-6 border-b border-slate-800/60 pb-5">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white tracking-tight text-sm">Este Dia Com Deus</h2>
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Painel Ativo
              </span>
            </div>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-800/80 space-y-3">
          <div className="px-3 py-2 bg-slate-900/60 rounded-xl border border-slate-800/60">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-xs text-slate-300 truncate font-medium">{userEmail}</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair da Conta</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Navbar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#131b2e] border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-white">Este Dia Com Deus</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-300 hover:bg-slate-800 rounded-lg"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#131b2e] border-b border-slate-800 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                  isActive ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold text-red-400"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
