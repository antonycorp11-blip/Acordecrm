import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'password' | 'setup'>('email');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleNextStep = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Insira um e-mail válido');
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch(`/api/auth/check-student?email=${email}`);
      const data = await res.json();
      
      if (data.exists) {
        if (data.needsSetup) {
          setStep('setup');
          toast.info(`Olá ${data.nome.split(' ')[0]}! Crie sua senha de acesso.`);
        } else {
          setStep('password');
        }
      } else {
        // Se não é aluno, talvez seja admin/professor
        setStep('password');
      }
    } catch (error) {
      console.error('Error checking email:', error);
      setStep('password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (step === 'setup') {
        if (!senha || senha.length < 4) {
          toast.error('A senha deve ter pelo menos 4 caracteres');
          setIsLoading(false);
          return;
        }
        if (senha !== confirmarSenha) {
          toast.error('As senhas não coincidem!');
          setIsLoading(false);
          return;
        }
        
        const setupRes = await fetch('/api/auth/setup-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, senha })
        });
        
        if (!setupRes.ok) {
          const err = await setupRes.json();
          throw new Error(err.error || 'Erro ao criar senha');
        }
        
        toast.success('Senha criada com sucesso!');
      }

      await login(email, senha);
      
      // Redirect based on role
      const storedUser = localStorage.getItem('acorde_user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      
      if (user?.role === 'aluno') {
        navigate('/area-aluno');
      } else {
        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao entrar. Verifique seus dados.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#1a0f0a] font-body-md text-white min-h-screen overflow-x-hidden relative flex items-center justify-center p-4" style={{ fontFamily: "'Space Mono', monospace" }}>
      
      {/* 8-bit Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-20">
        <div className="absolute top-10 left-10 text-[#ff6b00] rotate-[-12deg]">
          <span className="material-symbols-outlined text-[120px]">piano</span>
        </div>
        <div className="absolute bottom-20 right-10 text-[#8e7164] rotate-[15deg]">
          <span className="material-symbols-outlined text-[150px]">album</span>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-[420px] bg-[#fff8f6] border-4 border-black shadow-[8px_8px_0_#000] relative z-10 overflow-hidden">
        
        {/* Title Bar */}
        <div className="bg-black text-white px-4 py-2 flex justify-between items-center border-b-4 border-black">
          <span className="text-[10px] font-black tracking-widest uppercase">ACORDE_CRM_V1.0</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-[#ff6b00] border border-black"></div>
            <div className="w-3 h-3 bg-white border border-black"></div>
          </div>
        </div>

        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-black uppercase italic tracking-tighter mb-1 leading-none">
              {step === 'setup' ? 'ATIVAR CONTA' : 'LOGIN'}
            </h1>
            <p className="text-[9px] font-black text-[#7b5647] uppercase tracking-[0.2em]">
              {step === 'setup' ? 'CRIE SUA SENHA DE ALUNO' : 'ACESSO AO SISTEMA'}
            </p>
          </div>

          <form onSubmit={step === 'email' ? handleNextStep : handleLogin} className="space-y-5">
            
            {/* EMAIL STEP */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-black uppercase block">E-MAIL</label>
              <input 
                className="w-full bg-white border-4 border-black p-3 font-black text-sm text-black focus:bg-[#ffeae1] outline-none transition-all disabled:opacity-50" 
                placeholder="SEU@EMAIL.COM" 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={step !== 'email' || isLoading}
                required
              />
            </div>

            {/* PASSWORD STEP */}
            {(step === 'password' || step === 'setup') && (
              <div className="space-y-5 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-black uppercase block">
                    {step === 'setup' ? 'ESCOLHA UMA SENHA' : 'SENHA'}
                  </label>
                  <input 
                    className="w-full bg-white border-4 border-black p-3 font-black text-sm text-black focus:bg-[#ffeae1] outline-none transition-all" 
                    placeholder="********" 
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    autoFocus
                    required
                  />
                </div>

                {step === 'setup' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-black uppercase block">CONFIRME A SENHA</label>
                    <input 
                      className="w-full bg-white border-4 border-black p-3 font-black text-sm text-black focus:bg-[#ffeae1] outline-none transition-all" 
                      placeholder="********" 
                      type="password"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>
            )}
            
            <div className="pt-2">
              <button 
                className="w-full bg-[#ff6b00] text-white font-black text-lg py-4 border-b-8 border-r-4 border-black hover:translate-y-1 hover:border-b-4 hover:border-r-2 active:scale-95 transition-all uppercase italic tracking-widest flex items-center justify-center gap-3 shadow-[4px_4px_0_#000]" 
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? '...' : (step === 'email' ? 'PROSSEGUIR' : 'ENTRAR')}
                <span className="material-symbols-outlined">
                  {isLoading ? 'hourglass_empty' : 'play_arrow'}
                </span>
              </button>

              {step !== 'email' && (
                <button 
                  type="button"
                  onClick={() => setStep('email')}
                  className="w-full mt-4 text-[10px] font-black text-[#7b5647] uppercase hover:text-black transition-colors"
                >
                  ← Alterar E-mail
                </button>
              )}
            </div>
          </form>

          {step === 'email' && (
            <div className="mt-8 pt-6 border-t-2 border-[#e2bfb0] text-center">
              <p className="text-[9px] font-black text-[#7b5647] uppercase mb-4">Problemas no acesso?</p>
              <Link to="/atendimento" className="inline-flex items-center gap-2 text-[10px] font-black text-[#ff6b00] uppercase hover:underline">
                Falar com Suporte
              </Link>
            </div>
          )}
        </div>
        
        <div className="bg-[#feccba] p-3 border-t-4 border-black flex justify-center">
          <p className="text-[8px] font-black text-[#261812] tracking-widest text-center uppercase">
            ©2026 ACORDE_ESTUDIO // CRM_SYSTEM
          </p>
        </div>
      </div>
    </div>
  );
}
