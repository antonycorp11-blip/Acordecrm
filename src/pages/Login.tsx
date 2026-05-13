import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Lock, Mail, Loader2, Music, Headphones, Mic2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao fazer login');
      }

      login(data.token, data.user);
      toast.success('Login realizado com sucesso!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Left Panel - Musical Theme */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-black items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=2070&auto=format&fit=crop")' }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
        <div className="absolute inset-0 bg-blue-600/10 mix-blend-overlay"></div>
        
        {/* Animated Elements */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/30 blur-[100px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/30 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>

        <div className="relative z-10 p-12 text-center">
          <div className="inline-flex items-center justify-center p-4 bg-white/10 backdrop-blur-md rounded-2xl mb-8 border border-white/20 shadow-2xl">
            <Music className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-black text-white tracking-tight mb-6">
            O ritmo perfeito para <br/>a sua escola.
          </h1>
          <p className="text-lg text-slate-300 max-w-md mx-auto leading-relaxed">
            Gerencie alunos, horários e financeiro em uma plataforma afinada com as necessidades da sua escola de música.
          </p>

          <div className="mt-12 flex justify-center gap-6">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3 backdrop-blur-sm">
                <Headphones className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-xs text-slate-400 font-medium tracking-wider uppercase">Portal de Alunos</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3 backdrop-blur-sm">
                <Mic2 className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-xs text-slate-400 font-medium tracking-wider uppercase">Agenda Dinâmica</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-slate-50 relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-400/5 blur-[120px] rounded-full mix-blend-multiply pointer-events-none"></div>
        
        <div className="max-w-md w-full relative z-10">
          <div className="text-center lg:text-left mb-10">
            <div className="lg:hidden inline-flex items-center justify-center p-3 bg-blue-600 rounded-xl mb-6 shadow-lg shadow-blue-600/30">
              <Music className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Bem-vindo de volta!</h2>
            <p className="text-slate-500">Acesse sua conta para continuar.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">E-mail</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="email"
                  required
                  className="block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-slate-900 transition-all outline-none shadow-sm placeholder:text-slate-400"
                  placeholder="contato@escola.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">Senha</label>
                <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">Esqueceu a senha?</a>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="password"
                  required
                  className="block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-slate-900 transition-all outline-none shadow-sm placeholder:text-slate-400"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-lg shadow-blue-600/30 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/50 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Entrar no Sistema'
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-200 text-center">
            <p className="text-sm text-slate-600">
              Primeira vez por aqui?{' '}
              <Link to="/register" className="font-bold text-blue-600 hover:text-blue-700 transition-colors">
                Crie sua conta agora
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
