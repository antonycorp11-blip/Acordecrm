import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  Music, 
  Users, 
  Calendar, 
  BookOpen, 
  CreditCard, 
  BarChart3, 
  FileText, 
  LogOut,
  Briefcase,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  User,
  Trophy
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { icon: BarChart3, label: 'Dashboard', path: '/' },
  { icon: MessageCircle, label: 'Atendimento', path: '/atendimento' },
  { icon: Users, label: 'Alunos', path: '/alunos' },
  { icon: Calendar, label: 'Agenda', path: '/agenda' },
  { icon: Trophy, label: 'Ranking Geral', path: '/ranking' },
  { icon: User, label: 'Portal Prof', path: '/area-professor' },
];

const adminItems = [
  { icon: Briefcase, label: 'Professores', path: '/professores' },
  { icon: BookOpen, label: 'Cursos', path: '/cursos' },
  { icon: CreditCard, label: 'Financeiro', path: '/financeiro' },
  { icon: FileText, label: 'Contratos', path: '/contratos' },
  { icon: Trophy, label: 'Conquistas', path: '/conquistas' },
  { icon: Users, label: 'Acessos e Usuários', path: '/usuarios' },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  React.useEffect(() => {
    if (location.pathname === '/agenda') {
      setIsCollapsed(true);
    }
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={cn(
      "bg-sidebar text-sidebar-foreground flex flex-col h-screen sticky top-0 shrink-0 transition-all duration-300 relative group",
      isCollapsed ? "w-20" : "w-64"
    )}>
      {/* Botão de colapso */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-10 bg-primary text-white p-1 rounded-full shadow-lg z-50 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className={cn("p-6 flex items-center gap-3 overflow-hidden", isCollapsed && "justify-center px-0")}>
        <div className="bg-primary p-2 rounded-lg shadow-lg shadow-primary/20 shrink-0">
          <Music className="text-white w-6 h-6" />
        </div>
        {!isCollapsed && <h1 className="text-xl font-black tracking-tighter whitespace-nowrap">Studio<span className="text-primary">Acorde</span></h1>}
      </div>

      <nav className="flex-1 px-4 py-4 space-y-4 overflow-y-auto custom-scrollbar">
        <div className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              title={isCollapsed ? item.label : ""}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium",
                isCollapsed && "justify-center px-0",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </NavLink>
          ))}
        </div>

        <div className="space-y-1 pt-4 border-t border-slate-800/50">
          {!isCollapsed && (
            <p className="px-4 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
              Administração
            </p>
          )}
          {adminItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              title={isCollapsed ? item.label : ""}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium",
                isCollapsed && "justify-center px-0",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </NavLink>
          ))}
        </div>
      </nav>

      {!isCollapsed && (
        <div className="p-6">
          <div className="bg-slate-800/50 rounded-2xl p-4">
            <p className="text-[10px] text-slate-500 uppercase font-black mb-2 tracking-widest">Licença SaaS</p>
            <p className="text-sm font-bold text-slate-300">Studio Acorde Pro</p>
            <div className="mt-3 h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-primary w-3/4"></div>
            </div>
          </div>
        </div>
      )}

      <div className={cn("px-4 py-4 border-t border-slate-800/50", isCollapsed && "flex justify-center px-0")}>
        <button 
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800/50 transition-all text-sm font-bold w-full",
            isCollapsed && "justify-center px-0 w-fit"
          )}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span>Sair da Conta</span>}
        </button>
      </div>
    </div>
  );
}
