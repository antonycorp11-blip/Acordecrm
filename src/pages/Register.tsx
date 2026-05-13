import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function Register() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha !== confirmSenha) {
      toast.error('As senhas não coincidem!');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nome, email, password: senha }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao realizar cadastro');
      }

      toast.success('Cadastro realizado com sucesso!');
      navigate('/login');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background min-h-screen font-body-md text-on-background overflow-x-hidden selection:bg-primary-container selection:text-white">
      {/* Header */}
      <header className="w-full px-gutter py-8 sticky top-0 z-50 bg-black flex justify-between items-center border-b-4 border-secondary shadow-[4px_4px_0px_0px_rgba(123,86,71,1)]">
        <h1 className="font-headline-xl text-headline-lg text-primary uppercase italic tracking-tighter">
          ACORDE_CRM
        </h1>
        <div className="hidden md:flex gap-4">
          <span className="font-label-sm text-secondary-fixed-dim bg-secondary p-2 rotate-[-2deg]">NO_SLEEP_RECORDS</span>
        </div>
      </header>

      <main className="relative px-margin-page py-4 flex flex-col items-center flex-1 justify-center">
        {/* Maximalist Background Decor (Stickers Collage) */}
        {/* Top Left */}
        <div className="sticker-element top-10 left-5 rotate-[-15deg]">
          <img alt="Pixel Guitar" className="w-16 h-16 md:w-24 md:h-24" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAOlrGU0yevtWu7Z84VRmnl-y3S8rglWj8zrkZWXDncK0dLnDcPSc6amReHXVOH2IkwSf6ER0GH8QjmWTpiC2gVtqpeWXoTl_fR0HhMd_WLTafiA3aOna0S3TMFUdBHHuLtWSwdBOaQNgMqjJgA0Esgnh3M_mkaCowREk7rw3GhQTTYYdi8eHHE8isFT3jmE_DdllE0hcMqvKhrMC29F_KtnW4bav9G25cJ8AxXbE-QfnpiNZ3xseuwSrT0jbjTiJjLc5ua_JJqbFmZ"/>
        </div>
        <div className="sticker-element top-[15%] left-[20%] rotate-[10deg] hidden lg:block">
          <span className="material-symbols-outlined text-6xl hollow-sticker">album</span>
        </div>
        
        {/* Top Right */}
        <div className="sticker-element top-12 right-10 rotate-[15deg]">
          <img alt="Pixel Synth" className="w-16 h-16 md:w-24 md:h-24" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCHqkynhDFAxbIJ6RDm398J2Ckqg8ZHIKv3yzyG-oXi4jZRSlEgEPO5zTIwE0lGj9PCEcU1pTUZiegSJDQ8YyLjrpgt6oBLhw2o7yGFCMSwi3hGcmyDi1-81r95Jr-BkroMyifZ0rFNL3-i2Fdr3hCQJ98zElqxwvmoOvbQAVWq8KBw1yEM_WahKKIgcCknFAiJ2k0InYSH8pKb_hDXJMb60dlPya-HS-t0nb0iqraXwhDZaCSTZkDmWAA6E4kUu96Tor9Fh5pMrM23"/>
        </div>
        <div className="sticker-element top-[15%] right-[20%] rotate-[-10deg] hidden lg:block">
          <span className="material-symbols-outlined text-6xl solid-sticker">surround_sound</span>
        </div>

        {/* Main Form Container */}
        <div className="max-w-xl w-full z-10 relative">
          <div className="sticker-card p-6 md:p-8 rotate-cw mb-6">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="font-headline-lg text-[24px] md:text-headline-lg text-primary uppercase leading-none mb-1">BORALÁ_CRIAR</h2>
                  <p className="font-label-sm text-secondary-fixed-dim bg-secondary px-2 py-1 inline-block text-white">STEP_01: INFO_BÁSICA</p>
                </div>
                <span className="material-symbols-outlined text-primary text-4xl rotate-[-10deg]">auto_fix_high</span>
              </div>
              <p className="text-body-md text-on-surface-variant font-bold leading-tight">Pronto pra dominar o estúdio? Preencha os dados abaixo.</p>
              
              <form onSubmit={handleRegister} className="flex flex-col gap-5 mt-2">
                <div className="flex flex-col gap-3">
                  <div className="relative">
                    <label className="font-headline-lg text-label-sm text-secondary mb-1 block uppercase">NOME_DO_ARTISTA</label>
                    <input 
                      className="retro-input w-full p-3 font-headline-lg text-[14px] text-on-surface placeholder:opacity-50" 
                      placeholder="COMO TE CHAMAM NO PALCO?" 
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      required
                    />
                    <div className="absolute -right-2 -top-2 bg-primary-container text-white p-1 text-[10px] font-bold px-2 rotate-[5deg] border-2 border-secondary shadow-[2px_2px_0px_0px_rgba(123,86,71,1)]">OBRIGATÓRIO</div>
                  </div>
                  
                  <div className="relative">
                    <label className="font-headline-lg text-label-sm text-secondary mb-1 block uppercase">E-MAIL_DE_CONTATO</label>
                    <input 
                      className="retro-input w-full p-3 font-headline-lg text-[14px] text-on-surface placeholder:opacity-50" 
                      placeholder="EX: FLOW@ACORDE.XYZ" 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="relative">
                      <label className="font-headline-lg text-label-sm text-secondary mb-1 block uppercase">SENHA_SECRETA</label>
                      <input 
                        className="retro-input w-full p-3 font-headline-lg text-[14px] text-on-surface" 
                        placeholder="••••••••" 
                        type="password"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        required
                      />
                    </div>
                    <div className="relative">
                      <label className="font-headline-lg text-label-sm text-secondary mb-1 block uppercase">REPETE_A_SENHA</label>
                      <input 
                        className="retro-input w-full p-3 font-headline-lg text-[14px] text-on-surface" 
                        placeholder="••••••••" 
                        type="password"
                        value={confirmSenha}
                        onChange={(e) => setConfirmSenha(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
                
                <div className="relative py-2">
                  <button 
                    disabled={isLoading}
                    className="pressable-btn w-full bg-primary-container text-white py-4 font-headline-lg text-headline-lg-mobile uppercase italic tracking-tighter border-2 border-secondary shadow-[4px_4px_0px_0px_rgba(123,86,71,1)] hover:bg-primary transition-colors flex justify-center items-center gap-3" 
                    type="submit"
                  >
                    {isLoading ? 'CRIANDO CONTA...' : 'CRIAR CONTA'}
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {isLoading ? 'hourglass_empty' : 'bolt'}
                    </span>
                  </button>
                  <div className="absolute -bottom-6 -right-2 rotate-[15deg] hidden md:block">
                    <span className="material-symbols-outlined text-primary text-4xl opacity-40">double_arrow</span>
                  </div>
                </div>
              </form>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-center gap-6 text-center">
            <Link to="/login" className="font-label-sm text-secondary hover:text-primary-container border-b-2 border-dashed border-secondary py-1 transition-all">JÁ TENHO LOGIN</Link>
          </div>
        </div>
      </main>

      <footer className="bg-secondary w-full border-t-4 border-primary px-margin-page py-4 mt-auto relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center w-full gap-2 max-w-6xl mx-auto">
          <div className="flex flex-col items-center md:items-start">
            <span className="font-headline-lg text-secondary-container uppercase text-sm">ACORDE_CRM</span>
            <p className="font-label-sm text-secondary-fixed-dim opacity-80 uppercase tracking-widest text-[10px]">©2024 STUDIO_ACORDE</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
