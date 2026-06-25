import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { OneSignalService } from './services/OneSignalService';
import { Sidebar } from './components/layout/Sidebar';
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
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col relative overflow-auto">
        {children}
      </main>
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
