import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, senha);
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background font-body-md text-on-background min-h-screen overflow-x-hidden relative">
      {/* Chaotic Sticker Background Decor - Denser and Maximalist */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Solid Stickers */}
        <div className="absolute top-10 left-10 rotate-[-12deg] w-24 h-24 bg-white p-2 border-2 border-secondary sticker-card">
          <img alt="Vinyl record pixel art sticker" className="w-full h-full object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDg72Eh06UrpXuvMqcLqPpConv7ggeuqwubmjGDXsA0jFHgbFwzc1lU3HpnFR_jFN95FNpIXAFKU-FGsg034xu3reHP3xZjpjAWsdINGlvRyh7SZGDjEi-xwNqHu1DRZjYVBmHxIGRzrKR7LitpDqs_he8JLY6gpB7jTzw2iolnTMXfVyIr1EpzEkhZuyap4kYFBfQ1l6FNCO9Xxj-Fmms0MuTwR6LJPLSkOiP36Qn_-0g_UBEqif7CMCwmE4Q30ALIJZIxKj78VRMm"/>
        </div>
        <div className="absolute bottom-20 left-[5%] rotate-[8deg] w-32 h-32 bg-white p-2 border-2 border-secondary sticker-card">
          <img alt="Cassette tape pixel art" className="w-full h-full object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDCXIvuFwEUsUFh-xH_8nRo0eSlzEcwUuxZCXuJevHefp9cCMveMiZFbH3rW-X3sKT1fQUgLJmKfSumNDqj5ZHeoA4tNjEYdZOHtwi95zg1JJ_rx-BKjsitJJ_uBQYzRBq3B7qYmNcNZl4ReKMXqUoau1-09872zyuBx_3NqyWzy8bYUUm4o2cZtMnKQItxiyCmIMbdTNPtniWJXyBbMKH3EO88LpzPhZVbom-9kDooKmG8HKvDMzAbWOK8y5-FyJRG_wZxlEpPlD6"/>
        </div>
        <div className="absolute top-[55%] right-[5%] rotate-[-5deg] w-28 h-28 bg-white p-2 border-2 border-secondary sticker-card">
          <img alt="Piano keys doodle" className="w-full h-full object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD_3KZHOrlAATLil1pzqLW5hryAf7nIFbCtTt4p3hx8LusiijLuTOpMwLIaNVPo7UyegNDyis9Yf5ZAZ9D4Y0t7i6LQjfWWBRnTeX_DlYyemSxxXSm9Hvi31nHF5i-dszga6tApKQdaNOYCM9kd16EZG_V0B9YcA4Q4cP-1ZWvnhsUCD2H-TH7urSWAlUVyakAFy1wP0NCXoVA8j82MuHAw5B1Gah5o4UBzl5ZL0NSjsXsSdnbsdMPnPYq9WQ6kIGI3lFYADd56dITO"/>
        </div>
        <div className="absolute bottom-10 right-20 rotate-[15deg] w-36 h-36 bg-white p-2 border-2 border-secondary sticker-card">
          <img alt="Boombox sticker" className="w-full h-full object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDaJ74pbuq-ZNiHXI4_A7mDY4ADPqj_ch6k7hy7HlAbrpiH8_eX8hq1bH8DGuOeRFEeP2T--50B86LhpjsbUIbMfXHhGxecwTUHBjLJVvdqq916hLKv8j5Hs505pU8VKMxkUz8fEetCXvNnQgCR2e7CEkW7zgvltdVtsm-NMdYHSoWAe-2jbVzj8PUsaoPUN1SMGi5Z2JVG2fEipDLUOuDb8jah2CSSHjmJSW0aRzf7TOP_6kELhwf5hROhHzJfIZb9dQEA0uUVve4u"/>
        </div>
        
        {/* Hollow/Vazado Stickers & 8-bit Musical Elements */}
        <div className="absolute top-[15%] right-[25%] rotate-[20deg] w-20 h-20 flex items-center justify-center sticker-hollow">
          <span className="material-symbols-outlined text-white text-[48px]">piano</span>
        </div>
        <div className="absolute top-[40%] left-[8%] rotate-[-15deg] w-16 h-16 flex items-center justify-center sticker-hollow">
          <span className="material-symbols-outlined text-primary-container text-[40px]">album</span>
        </div>
        <div className="absolute bottom-[40%] right-[10%] rotate-[10deg] w-24 h-24 flex items-center justify-center sticker-hollow">
          <span className="material-symbols-outlined text-white text-[56px]">surround_sound</span>
        </div>
        <div className="absolute top-[5%] left-[45%] rotate-[-5deg] w-14 h-14 flex items-center justify-center sticker-hollow">
          <span className="material-symbols-outlined text-primary-container text-[32px]">mic_external_on</span>
        </div>
        <div className="absolute bottom-[5%] left-[30%] rotate-[25deg] w-20 h-20 flex items-center justify-center sticker-hollow">
          <span className="material-symbols-outlined text-white text-[48px]">headphones</span>
        </div>
        
        {/* Scattered Pixel Notes & Symbols */}
        <span className="material-symbols-outlined absolute top-1/4 left-1/4 text-primary-container text-[64px] opacity-40 rotate-12">music_note</span>
        <span className="material-symbols-outlined absolute top-[60%] left-[20%] text-white text-[42px] opacity-30 -rotate-45">audiotrack</span>
        <span className="material-symbols-outlined absolute bottom-1/3 right-1/3 text-secondary-container text-[82px] opacity-40 -rotate-12">graphic_eq</span>
        <span className="material-symbols-outlined absolute top-[10%] right-[10%] text-white text-[54px] opacity-20 rotate-45">equalizer</span>
        <span className="material-symbols-outlined absolute bottom-[20%] left-[15%] text-primary-container text-[48px] opacity-30 rotate-12">music_video</span>
        <span className="material-symbols-outlined absolute top-[30%] right-[5%] text-white text-[32px] opacity-40 -rotate-12">radio</span>
        <span className="material-symbols-outlined absolute bottom-[10%] right-[40%] text-primary-container text-[40px] opacity-30 rotate-[60deg]">speaker</span>
      </div>

      {/* Main Container */}
      <main className="relative z-10 flex items-center justify-center min-h-screen px-gutter">
        {/* Retro Game Window Login Box */}
        <div className="w-full max-auto max-w-[440px] bg-white border-4 border-secondary sticker-card relative rotate-1">
          {/* Window Header (Title Bar) */}
          <div className="bg-secondary text-on-secondary px-4 py-2 flex justify-between items-center border-b-4 border-secondary">
            <span className="font-headline-lg text-label-sm tracking-tighter uppercase">ACORDE_CRM_V1.0.EXE</span>
            <div className="flex gap-1">
              <div className="w-4 h-4 bg-primary-container border-2 border-secondary"></div>
              <div className="w-4 h-4 bg-secondary-container border-2 border-secondary"></div>
              <div className="w-4 h-4 bg-white border-2 border-secondary"></div>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-8">
            {/* Branding */}
            <div className="mb-8 text-center relative">
              <h1 className="font-headline-xl text-headline-xl text-primary uppercase italic tracking-tighter mb-0 leading-none">
                LOGIN
              </h1>
              <p className="font-label-sm text-on-surface-variant uppercase tracking-[0.2em] -mt-2">ACESSO AO ESTÚDIO</p>
              
              {/* Doodle Overlay */}
              <div className="hand-drawn-arrow -right-4 -top-4 rotate-[135deg] text-primary-container">
                <span className="material-symbols-outlined text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>trending_flat</span>
              </div>
            </div>
            
            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="font-headline-lg text-label-sm text-secondary block uppercase">E-MAIL DO MÚSICO</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary">person_filled</span>
                  <input 
                    className="w-full bg-surface-container-low border-2 border-secondary p-4 pl-12 font-headline-lg text-[14px] focus:ring-4 focus:ring-primary-container focus:outline-none retro-input-alt" 
                    placeholder="email@acorde.com" 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="font-headline-lg text-label-sm text-secondary block uppercase">CHAVE DE ACESSO</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary">key</span>
                  <input 
                    className="w-full bg-surface-container-low border-2 border-secondary p-4 pl-12 font-headline-lg text-[14px] focus:ring-4 focus:ring-primary-container focus:outline-none retro-input-alt" 
                    placeholder="********" 
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between py-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input className="w-6 h-6 border-2 border-secondary text-primary focus:ring-0 rounded-none bg-white" type="checkbox"/>
                  <span className="font-label-sm text-secondary uppercase text-[10px]">LEMBRAR EQUIPE</span>
                </label>
                <a className="font-label-sm text-primary uppercase text-[10px] underline decoration-2 underline-offset-4 hover:text-primary-container transition-colors" href="#">PERDI A SENHA</a>
              </div>
              
              {/* Login Button */}
              <button 
                className="w-full bg-primary-container text-on-primary-container font-headline-lg text-headline-lg-mobile py-4 border-b-8 border-r-4 border-primary hover:translate-y-1 hover:border-b-4 hover:border-r-2 active:scale-95 transition-all uppercase italic tracking-widest sticker-card flex items-center justify-center gap-4" 
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'CONECTANDO...' : 'ENTRAR'} 
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {isLoading ? 'hourglass_empty' : 'play_arrow'}
                </span>
              </button>
            </form>
            
            {/* Alternative Actions */}
            <div className="mt-8 flex flex-col items-center gap-4">
              <p className="font-label-sm text-on-surface-variant uppercase text-[10px]">Ainda não tem registro?</p>
              <Link to="/register" className="px-6 py-2 border-2 border-secondary font-headline-lg text-label-sm uppercase hover:bg-secondary-container transition-transform hover:rotate-[-2deg] flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">group_add</span>
                CRIAR CONTA DE ALUNO
              </Link>
            </div>
          </div>
          
          {/* Footer-ish info */}
          <div className="bg-surface-container-highest p-3 border-t-4 border-secondary flex justify-center">
            <p className="font-label-sm text-[10px] text-secondary tracking-widest text-center uppercase">
              ©2024 STUDIO_ACORDE_CRM // NO_SLEEP_RECORDS
            </p>
          </div>
        </div>
        
        {/* Extra Floating Decor elements */}
        <div className="absolute top-[20%] right-[15%] pointer-events-none hidden lg:block">
          <div className="bg-primary text-white font-headline-lg text-label-sm px-4 py-2 rotate-12 sticker-card">
            100% ANALOG!
          </div>
        </div>
        <div className="absolute bottom-[15%] left-[10%] pointer-events-none hidden lg:block">
          <div className="bg-secondary-container text-secondary font-headline-lg text-label-sm px-4 py-2 -rotate-[15deg] border-2 border-secondary sticker-card">
            MASTER_MODE_ON
          </div>
        </div>
      </main>

      {/* Support Floating UI Item */}
      <div className="fixed bottom-6 right-6 z-50">
        <button className="bg-white p-4 border-4 border-secondary sticker-card hover:scale-110 active:scale-90 transition-transform group">
          <span className="material-symbols-outlined text-primary group-hover:rotate-12 transition-transform text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>support_agent</span>
        </button>
      </div>
    </div>
  );
}
