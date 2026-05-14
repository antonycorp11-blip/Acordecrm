import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Music, CreditCard, Settings, LogOut, Trophy,
  Briefcase, BookOpen, FileText, MessageCircle, UserCheck, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '@/src/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Início', path: '/' },
  { icon: Users, label: 'Alunos', path: '/alunos' },
  { icon: Music, label: 'Aulas', path: '/agenda' },
  { icon: CreditCard, label: 'Financeiro', path: '/financeiro' },
  { icon: Settings, label: 'Ajustes', path: '/usuarios' },
];

const adminItems = [
  { icon: MessageCircle, label: 'Atendimento', path: '/atendimento' },
  { icon: Briefcase, label: 'Professores', path: '/professores' },
  { icon: BookOpen, label: 'Cursos', path: '/cursos' },
  { icon: FileText, label: 'Contratos', path: '/contratos' },
  { icon: Trophy, label: 'Conquistas', path: '/conquistas' },
  { icon: Trophy, label: 'Ranking', path: '/ranking' },
  { icon: UserCheck, label: 'Portal Prof', path: '/area-professor', hideFor: ['admin'] },
];

export function Sidebar() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div
      className={cn('flex flex-col h-screen sticky top-0 shrink-0 transition-all duration-300 relative group border-r-4', isCollapsed ? 'w-[72px]' : 'w-64')}
      style={{ background: '#fff8f6', borderColor: '#261812', fontFamily: "'Space Mono', monospace" }}
    >
      {/* Toggle button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-4 top-10 z-50 w-8 h-8 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: '#ff6b00', border: '2px solid #261812', boxShadow: '2px 2px 0 #261812' }}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Logo */}
      <div className={cn('p-6 pb-4 border-b-4 border-[#261812]', isCollapsed && 'px-3 flex justify-center')}>
        {!isCollapsed ? (
          <>
            <h1 className="font-black text-[#a04100] leading-none tracking-tighter uppercase" style={{ fontSize: '2rem', lineHeight: 1.1 }}>
              STUDIO<br />MASTER
            </h1>
            <p className="text-[#7b5647] text-[9px] font-black uppercase tracking-widest mt-1">CONSOLE DE COMANDO</p>
          </>
        ) : (
          <div className="w-10 h-10 bg-[#a04100] rounded flex items-center justify-center">
            <span className="text-white font-black text-sm">SM</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            title={isCollapsed ? item.label : ''}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-4 py-3 rounded font-black text-sm transition-all uppercase tracking-wide',
              isCollapsed && 'justify-center px-0',
              isActive
                ? 'bg-[#ff6b00] text-white'
                : 'text-[#261812] hover:bg-[#feccba]'
            )}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
          </NavLink>
        ))}

        {/* Admin divider */}
        <div className="pt-3 mt-3 border-t-2 border-[#e2bfb0] space-y-1">
          {!isCollapsed && (
            <p className="px-4 text-[9px] font-black uppercase tracking-widest text-[#8e7164] mb-2">Admin</p>
          )}
          {adminItems.filter(item => !item.hideFor || !item.hideFor.includes(user?.role || '')).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              title={isCollapsed ? item.label : ''}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-4 py-2.5 rounded font-black text-xs transition-all uppercase tracking-wide',
                isCollapsed && 'justify-center px-0',
                isActive
                  ? 'bg-[#ff6b00] text-white'
                  : 'text-[#7b5647] hover:bg-[#feccba]'
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t-4 border-[#261812] space-y-2">
        {/* Nova Matrícula */}
        {!isCollapsed && (
          <button
            onClick={() => navigate('/atendimento')}
            className="w-full py-3 rounded font-black text-xs uppercase tracking-widest text-white transition-all pressable-btn"
            style={{ background: '#261812', border: '2px solid #261812' }}
          >
            Nova Matrícula
          </button>
        )}
        {/* Sair */}
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-2 py-2 px-4 rounded text-[#7b5647] hover:text-[#ff6b00] transition-all text-xs font-black uppercase tracking-widest w-full',
            isCollapsed && 'justify-center px-0'
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Sair (v2.0)</span>}
        </button>
      </div>
    </div>
  );
}
