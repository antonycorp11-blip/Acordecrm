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

      <main className="relative px-margin-page py-12 flex flex-col items-center">
        {/* Maximalist Background Decor (Stickers Collage) */}
        {/* Top Left */}
        <div className="sticker-element top-10 left-5 rotate-[-15deg]">
          <img alt="Pixel Guitar" className="w-24 h-24" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAOlrGU0yevtWu7Z84VRmnl-y3S8rglWj8zrkZWXDncK0dLnDcPSc6amReHXVOH2IkwSf6ER0GH8QjmWTpiC2gVtqpeWXoTl_fR0HhMd_WLTafiA3aOna0S3TMFUdBHHuLtWSwdBOaQNgMqjJgA0Esgnh3M_mkaCowREk7rw3GhQTTYYdi8eHHE8isFT3jmE_DdllE0hcMqvKhrMC29F_KtnW4bav9G25cJ8AxXbE-QfnpiNZ3xseuwSrT0jbjTiJjLc5ua_JJqbFmZ"/>
        </div>
        <div className="sticker-element top-40 left-20 rotate-[10deg] hidden lg:block">
          <span className="material-symbols-outlined text-8xl hollow-sticker">album</span>
        </div>
        <div className="sticker-element top-[500px] left-[-20px] rotate-[-5deg] hidden lg:block">
          <span className="material-symbols-outlined text-7xl solid-sticker">cassette</span>
        </div>
        <div className="sticker-element top-[700px] left-32 rotate-[20deg] hidden lg:block">
          <span className="material-symbols-outlined text-6xl text-secondary-container opacity-40">music_note</span>
        </div>
        
        {/* Top Right */}
        <div className="sticker-element top-20 right-10 rotate-[15deg]">
          <img alt="Pixel Synth" className="w-24 h-24" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCHqkynhDFAxbIJ6RDm398J2Ckqg8ZHIKv3yzyG-oXi4jZRSlEgEPO5zTIwE0lGj9PCEcU1pTUZiegSJDQ8YyLjrpgt6oBLhw2o7yGFCMSwi3hGcmyDi1-81r95Jr-BkroMyifZ0rFNL3-i2Fdr3hCQJ98zElqxwvmoOvbQAVWq8KBw1yEM_WahKKIgcCknFAiJ2k0InYSH8pKb_hDXJMb60dlPya-HS-t0nb0iqraXwhDZaCSTZkDmWAA6E4kUu96Tor9Fh5pMrM23"/>
        </div>
        <div className="sticker-element top-60 right-32 rotate-[-10deg] hidden lg:block">
          <span className="material-symbols-outlined text-8xl solid-sticker">surround_sound</span>
        </div>
        <div className="sticker-element top-[400px] right-5 rotate-[25deg] hidden lg:block">
          <span className="material-symbols-outlined text-9xl hollow-sticker">speaker</span>
        </div>
        <div className="sticker-element top-[800px] right-20 rotate-[-15deg] hidden lg:block">
          <span className="material-symbols-outlined text-7xl text-primary-container opacity-50">keyboard</span>
        </div>

        {/* Center Stickers (Vazados e Preenchidos) */}
        <div className="sticker-element top-[20%] left-[15%] rotate-[-45deg] opacity-20 hidden 2xl:block">
          <span className="material-symbols-outlined text-[200px] hollow-sticker">music_video</span>
        </div>
        <div className="sticker-element bottom-[10%] right-[10%] rotate-[30deg] opacity-20 hidden 2xl:block">
          <span className="material-symbols-outlined text-[150px] solid-sticker">graphic_eq</span>
        </div>

        {/* Main Form Container */}
        <div className="max-w-xl w-full z-10 relative">
          <div className="sticker-card p-gutter md:p-10 rotate-cw mb-12">
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary uppercase leading-none mb-2">BORALÁ_CRIAR</h2>
                  <p className="font-label-sm text-secondary-fixed-dim bg-secondary px-2 py-1 inline-block text-white">STEP_01: INFO_BÁSICA</p>
                </div>
                <span className="material-symbols-outlined text-primary text-5xl rotate-[-10deg]">auto_fix_high</span>
              </div>
              <p className="text-body-lg text-on-surface-variant font-bold">Pronto pra dominar o estúdio? Preenche aí os dados pra gente começar o setup.</p>
              
              <form onSubmit={handleRegister} className="flex flex-col gap-8 mt-4">
                <div className="flex flex-col gap-4">
                  <div className="relative">
                    <label className="font-headline-lg text-label-sm text-secondary mb-1 block uppercase">NOME_DO_ARTISTA</label>
                    <input 
                      className="retro-input w-full p-4 font-label-sm text-on-surface placeholder:opacity-50" 
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
                      className="retro-input w-full p-4 font-label-sm text-on-surface placeholder:opacity-50" 
                      placeholder="EX: FLOW@ACORDE.XYZ" 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <label className="font-headline-lg text-label-sm text-secondary mb-1 block uppercase">SENHA_SECRETA</label>
                      <input 
                        className="retro-input w-full p-4 font-label-sm text-on-surface" 
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
                        className="retro-input w-full p-4 font-label-sm text-on-surface" 
                        placeholder="••••••••" 
                        type="password"
                        value={confirmSenha}
                        onChange={(e) => setConfirmSenha(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
                
                <div className="relative py-4">
                  <button 
                    disabled={isLoading}
                    className="pressable-btn w-full bg-primary-container text-white py-6 font-headline-lg text-headline-lg-mobile uppercase italic tracking-tighter border-2 border-secondary shadow-[6px_6px_0px_0px_rgba(123,86,71,1)] hover:bg-primary transition-colors flex justify-center items-center gap-4" 
                    type="submit"
                  >
                    {isLoading ? 'CRIANDO CONTA...' : 'CRIAR CONTA'}
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {isLoading ? 'hourglass_empty' : 'bolt'}
                    </span>
                  </button>
                  <div className="absolute -bottom-8 -right-4 rotate-[15deg] hidden md:block">
                    <span className="material-symbols-outlined text-primary text-6xl opacity-40">double_arrow</span>
                  </div>
                </div>
              </form>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-center gap-6 text-center">
            <Link to="/login" className="font-label-sm text-secondary hover:text-primary-container border-b-2 border-dashed border-secondary py-1 transition-all">JÁ TENHO LOGIN</Link>
            <a className="font-label-sm text-secondary hover:text-primary-container border-b-2 border-dashed border-secondary py-1 transition-all" href="#">PRECISO DE HELP</a>
          </div>
        </div>

        {/* Extra Aesthetic Elements */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl px-gutter z-10 relative">
          <div className="sticker-card p-4 rotate-ccw bg-surface-container-low flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-secondary-container bg-secondary rounded-full p-2" style={{ fontVariationSettings: "'FILL' 1" }}>music_note</span>
            <span className="font-label-sm text-secondary text-center uppercase">+500 BEATS</span>
          </div>
          <div className="sticker-card p-4 rotate-cw bg-surface-container-low flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-secondary-container bg-secondary rounded-full p-2" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
            <span className="font-label-sm text-secondary text-center uppercase">10k ALUNOS</span>
          </div>
          <div className="sticker-card p-4 rotate-ccw bg-surface-container-low flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-secondary-container bg-secondary rounded-full p-2" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            <span className="font-label-sm text-secondary text-center uppercase">PRO QUALITY</span>
          </div>
          <div className="sticker-card p-4 rotate-cw bg-surface-container-low flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-secondary-container bg-secondary rounded-full p-2" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
            <span className="font-label-sm text-secondary text-center uppercase">24/7 ACCESS</span>
          </div>
        </div>
      </main>

      <footer className="bg-secondary w-full border-t-4 border-primary px-margin-page py-8 mt-24 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center w-full gap-4 max-w-6xl mx-auto">
          <div className="flex flex-col">
            <span className="font-headline-lg text-secondary-container uppercase">ACORDE_CRM</span>
            <p className="font-label-sm text-secondary-fixed-dim opacity-80 uppercase tracking-widest">©2024 STUDIO_ACORDE // NO_SLEEP_RECORDS</p>
          </div>
          <nav className="flex gap-8">
            <a className="font-label-sm text-secondary-fixed-dim opacity-80 hover:text-primary-container transition-all" href="#">PATCH_NOTES</a>
            <a className="font-label-sm text-secondary-fixed-dim opacity-80 hover:text-primary-container transition-all" href="#">SERVER_STATUS</a>
            <a className="font-label-sm text-secondary-fixed-dim opacity-80 hover:text-primary-container transition-all" href="#">SUPPORT_AI</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
