import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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
import Conquistas from './pages/Conquistas';
import Ranking from './pages/Ranking';
import Login from './pages/Login';
import Register from './pages/Register';

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
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800 overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col relative overflow-auto">
        {/* BACKGROUND ACCENT (FROST EFFECT) */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-400/10 blur-[120px] -z-10 rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/5 blur-[100px] -z-10 rounded-full"></div>
        {children}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" richColors />
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Rotas Privadas */}
          <Route path="/*" element={
            <PrivateRoute>
              <MainLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
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
                  <Route path="/area-professor" element={<AreaProfessor />} />
                </Routes>
              </MainLayout>
            </PrivateRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
