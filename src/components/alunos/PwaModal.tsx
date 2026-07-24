import React, { useState, useEffect } from 'react';
import { Download, BellRing, Sparkles, X, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { OneSignalService } from '../../services/OneSignalService';

interface PwaModalProps {
  alunoData: any;
  onRewardClaimed: (xpGanho: number) => void;
}

export function PwaModal({ alunoData, onRewardClaimed }: PwaModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const handleDismiss = () => {
    try {
      localStorage.setItem('acorde_pwa_modal_dismissed', 'true');
      sessionStorage.setItem('acorde_pwa_modal_dismissed', 'true');
    } catch (e) {}
    setIsOpen(false);
  };

  useEffect(() => {
    // Detecta se está instalado (PWA Standalone)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(standalone);

    // Se o aluno já fechou ou dispensou este aviso no dispositivo/sessão, NUNCA mais mostra automaticamente
    if (localStorage.getItem('acorde_pwa_modal_dismissed') || sessionStorage.getItem('acorde_pwa_modal_dismissed')) {
        setIsOpen(false);
        return;
    }

    // Se o aluno ainda não ganhou a recompensa de push, mostra apenas no primeiro acesso
    if (alunoData && !alunoData.push_recompensado) {
        const timer = setTimeout(() => {
            if (!localStorage.getItem('acorde_pwa_modal_dismissed') && !sessionStorage.getItem('acorde_pwa_modal_dismissed')) {
                setIsOpen(true);
            }
        }, 3000);
        return () => clearTimeout(timer);
    }
  }, [alunoData]);

  if (!isOpen) return null;

  const handleClaimPush = async () => {
      setIsClaiming(true);
      try {
          // Marca como dispensado para nunca mais aparecer
          try {
            localStorage.setItem('acorde_pwa_modal_dismissed', 'true');
            sessionStorage.setItem('acorde_pwa_modal_dismissed', 'true');
          } catch(e) {}

          // Dispara o opt-in do OneSignal (iOS/Android)
          await OneSignalService.forcePrompt();
          
          // Confirma no Backend
          const token = localStorage.getItem('acorde_token');
          const res = await fetch('/api/alunos/recompensa-push', {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${token}`
              }
          });
          
          if (!res.ok) throw new Error('Falha ao resgatar XP');
          
          const data = await res.json();
          if (data.xpGanho) {
              toast.success(`🎉 SUCESSO! Você ganhou ${data.xpGanho} XP!`);
              onRewardClaimed(data.xpGanho);
              handleDismiss();
          } else {
              toast.info('Notificações ativadas! (XP já resgatado).');
              handleDismiss();
          }
      } catch (error) {
          console.error(error);
          toast.error('Você precisa permitir as notificações no aviso do sistema para ganhar o XP!');
      } finally {
          setIsClaiming(false);
      }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[150] flex items-center justify-center p-4 font-['Space_Mono']">
      <div className="bg-[#fff8f6] border-8 border-black p-6 w-full max-w-sm relative shadow-[12px_12px_0_#000] flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
        
        <button 
          onClick={handleDismiss}
          className="absolute top-2 right-2 bg-black text-white font-black px-2 py-1 border-2 border-black hover:bg-red-500 transition-colors"
        >
          X
        </button>

        {!isStandalone ? (
            // TELA DE TUTORIAL PARA INSTALAÇÃO (Navegador normal)
            <>
                <div className="w-16 h-16 bg-[#ff6b00] rounded-full flex items-center justify-center border-4 border-black mb-4 shadow-[4px_4px_0_#000] animate-bounce">
                    <Download className="w-8 h-8 text-white" />
                </div>
                
                <h2 className="text-black font-black text-xl uppercase mb-2 leading-tight">
                    Instale o App na<br/><span className="text-[#ff6b00]">Sua Tela Inicial!</span>
                </h2>
                
                <p className="text-xs text-[#8e7164] font-bold uppercase mb-6 leading-relaxed">
                    Para ativar as notificações de aula e ganhar o bônus de 500 XP, você precisa salvar o nosso App no seu celular.
                </p>

                <div className="bg-[#feccba] border-4 border-black p-4 w-full mb-4 text-left">
                    <h3 className="font-black text-sm uppercase mb-2 flex items-center gap-2">
                        <Smartphone className="w-4 h-4" /> Passo a Passo
                    </h3>
                    <ul className="text-[10px] uppercase font-bold text-black space-y-2">
                        <li className="flex gap-2">
                            <span className="text-[#ff6b00] font-black">1.</span> 
                            No Safari (iPhone) aperte o ícone de Compartilhar <span className="border border-black px-1">⎙</span>.
                        </li>
                        <li className="flex gap-2">
                            <span className="text-[#ff6b00] font-black">2.</span> 
                            Clique em "Adicionar à Tela de Início".
                        </li>
                        <li className="flex gap-2">
                            <span className="text-[#ff6b00] font-black">3.</span> 
                            No Android (Chrome) clique nos três pontinhos e em Instalar App.
                        </li>
                        <li className="flex gap-2">
                            <span className="text-[#ff6b00] font-black">4.</span> 
                            Abra o App pela sua Tela Inicial e pegue seus 500 XP!
                        </li>
                    </ul>
                </div>

                <button 
                    onClick={handleDismiss}
                    className="w-full bg-black text-white font-black uppercase text-xs py-3 border-4 border-black shadow-[4px_4px_0_#ff6b00] active:translate-y-1 active:shadow-none transition-all"
                >
                    Entendi, vou instalar!
                </button>
            </>
        ) : (
            // TELA DE ATIVAÇÃO DE PUSH E RECOMPENSA (PWA Standalone)
            <>
                <div className="w-20 h-20 bg-[#feccba] rounded-full flex items-center justify-center border-4 border-black mb-4 shadow-[4px_4px_0_#000] relative">
                    <BellRing className="w-10 h-10 text-[#ff6b00] animate-pulse" />
                    <div className="absolute -top-2 -right-2 bg-yellow-400 text-black font-black text-[10px] px-2 py-0.5 border-2 border-black rotate-12">
                        +500 XP!
                    </div>
                </div>
                
                <h2 className="text-black font-black text-2xl uppercase mb-2 leading-tight">
                    MISSÃO: <span className="text-[#ff6b00]">PERMISSÃO!</span>
                </h2>
                
                <p className="text-xs text-[#8e7164] font-bold uppercase mb-6 leading-relaxed">
                    Ative as notificações de lembrete de aula e treino e receba instantaneamente um prêmio de 500 XP!
                </p>

                <button 
                    onClick={handleClaimPush}
                    disabled={isClaiming}
                    className="w-full bg-[#ff6b00] text-white font-black uppercase text-sm py-4 border-4 border-black shadow-[4px_4px_0_#000] hover:bg-yellow-400 hover:text-black active:translate-y-1 active:shadow-none transition-all flex justify-center items-center gap-2"
                >
                    {isClaiming ? 'ATIVANDO...' : (
                        <>
                            <Sparkles className="w-5 h-5" /> 
                            LIGAR NOTIFICAÇÕES
                        </>
                    )}
                </button>
                <p className="text-[8px] text-[#8e7164] uppercase font-bold mt-4">
                    O celular vai pedir uma confirmação na tela. Dê "Permitir" para funcionar!
                </p>
            </>
        )}
      </div>
    </div>
  );
}
