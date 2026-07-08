import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { OneSignalService } from './services/OneSignalService';
import { Sidebar } from './components/layout/Sidebar';
import { Menu, X, LayoutDashboard, Users, Music, CreditCard, LogOut, RefreshCcw } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Alunos from './pages/Alunos';
import Professores from './pages/Professores';
import Agenda from './pages/Agenda';
import Financeiro from './pages/Financeiro';
import Atendimento from './pages/Atendimento';
import Cursos from './pages/Cursos';
import Contratos from './pages/Contratos';
import AlunoPerfil from './pages/AlunoPerfil';
import AreaProfessor from './pages/AreaProfessor';
import AreaAluno from './pages/AreaAluno';
import Conquistas from './pages/Conquistas';
import Ranking from './pages/Ranking';
import Login from './pages/Login';
import Register from './pages/Register';
import Usuarios from './pages/Usuarios';
import Migracao from './pages/Migracao';
import { Reposicoes } from './pages/Reposicoes';
import Assinatura from './pages/Assinatura';
import { GlobalUpdater } from './components/GlobalUpdater';
import EadTrilhaAdmin from './pages/EadTrilhaAdmin';

import { Toaster } from 'sonner';

// Componente para proteger rotas que exigem login
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-slate-100">Carregando...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Layout principal do sistema
const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  // Fecha o menu mobile quando a rota muda
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Início', path: '/' },
    { icon: Users, label: 'Alunos', path: '/alunos' },
    { icon: Music, label: 'Aulas', path: '/agenda' },
    { icon: RefreshCcw, label: 'Reposições', path: '/reposicoes' },
    { icon: CreditCard, label: 'Financeiro', path: '/financeiro' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getPageTitle = () => {
    const current = menuItems.find(item => item.path === location.pathname);
    if (current) return current.label;
    if (location.pathname.startsWith('/alunos/')) return 'Perfil Aluno';
    return 'Studio Master';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-black text-white">
      {/* Sidebar para Desktop */}
      <Sidebar />

      {/* Container Principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Header Mobile (visível apenas em telas pequenas) */}
        <header className="flex md:hidden items-center justify-between px-4 py-3 bg-[#fff8f6] border-b-4 border-[#261812] sticky top-0 z-30 w-full shrink-0">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1 text-[#261812] active:scale-95 transition-transform"
            title="Abrir Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <span className="text-[12px] font-black uppercase text-[#261812] tracking-wider">
            {getPageTitle()}
          </span>

          <div className="w-8 h-8 bg-[#a04100] rounded flex items-center justify-center text-white font-black text-xs">
            SM
          </div>
        </header>

        {/* Corpo da Página */}
        <main className="flex-1 overflow-auto relative flex flex-col min-w-0">
          {children}
        </main>
      </div>

      {/* Gaveta Mobile Sidebar (Drawer) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Overlay Escuro */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Conteúdo da Gaveta */}
          <div className="relative w-64 max-w-xs bg-[#fff8f6] border-r-4 border-[#261812] h-full flex flex-col p-4 shadow-hard-black transition-transform duration-300 z-10 flex-shrink-0">
            {/* Topo da Gaveta */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b-2 border-[#261812]/20">
              <div>
                <h2 className="font-black text-[#a04100] leading-none uppercase text-lg">
                  STUDIO MASTER
                </h2>
                <p className="text-[#7b5647] text-[8px] font-black uppercase tracking-wider mt-1">Console Mobile</p>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 text-[#261812] hover:text-[#ff6b00]"
                title="Fechar Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Itens de Navegação Gaveta */}
            <nav className="flex-1 space-y-1.5 overflow-y-auto">
              {menuItems.map((item) => {
                const isActive = item.path === '/' 
                  ? location.pathname === '/' 
                  : location.pathname.startsWith(item.path);

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded font-black text-xs uppercase tracking-wide transition-colors ${
                      isActive
                        ? 'bg-[#ff6b00] text-white shadow-hard'
                        : 'text-[#261812] hover:bg-[#feccba]'
                    }`}
                  >
                    <item.icon className="w-4.5 h-4.5 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* Rodapé Gaveta */}
            <div className="pt-4 border-t-2 border-[#261812]/20 space-y-2">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  navigate('/atendimento');
                }}
                className="w-full py-2.5 rounded font-black text-xs uppercase tracking-wider text-white bg-[#261812] hover:bg-[#40281e] active:translate-y-1 transition-all"
              >
                Nova Matrícula
              </button>
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 py-2 px-4 rounded text-[#7b5647] hover:text-[#ff6b00] transition-colors text-xs font-black uppercase tracking-widest w-full"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente para redirecionamento baseado em Role
const RoleRedirect = ({ children, defaultPath }: { children: React.ReactNode, defaultPath: string }) => {
  const { user } = useAuth();
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  if (user?.role === 'professor') return <Navigate to="/area-professor" />;
  if (user?.role === 'aluno') return <Navigate to="/area-aluno" />;
  
  // Para Admins no Mobile, redirecionar do Dashboard (raiz) direto para a Agenda
  if (isMobile && defaultPath === '/') return <Navigate to="/agenda" />;

  return <>{children}</>;
};

export default function App() {
  React.useEffect(() => {
    OneSignalService.init();
  }, []);

  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" richColors />
        <GlobalUpdater />
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/assinatura/:id" element={<Assinatura />} />

          {/* Rotas Privadas */}
          <Route path="/*" element={
            <PrivateRoute>
              <Routes>
                <Route path="/area-professor" element={<AreaProfessor />} />
                <Route path="/area-aluno" element={<AreaAluno />} />
                <Route path="*" element={
                  <MainLayout>
                    <Routes>
                      <Route path="/" element={
                        <RoleRedirect defaultPath="/">
                          <Dashboard />
                        </RoleRedirect>
                      } />
                      <Route path="/atendimento" element={<Atendimento />} />
                      <Route path="/alunos" element={<Alunos />} />
                      <Route path="/alunos/:id" element={<AlunoPerfil />} />
                      <Route path="/agenda" element={<Agenda />} />
                      <Route path="/professores" element={<Professores />} />
                      <Route path="/cursos" element={<Cursos />} />
                      <Route path="/financeiro" element={<Financeiro />} />
                      <Route path="/contratos" element={<Contratos />} />
                      <Route path="/conquistas" element={<Conquistas />} />
                      <Route path="/ranking" element={<Ranking />} />
                      <Route path="/usuarios" element={<Usuarios />} />
                      <Route path="/migracao" element={<Migracao />} />
                      <Route path="/trilha-ead" element={<EadTrilhaAdmin />} />
                <Route path="/reposicoes" element={<Reposicoes />} />
                    </Routes>
                  </MainLayout>
                } />
              </Routes>
            </PrivateRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
