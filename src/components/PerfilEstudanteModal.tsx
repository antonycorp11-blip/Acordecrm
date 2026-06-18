import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, Trash2, Flame, ChevronRight, Award } from 'lucide-react';
import { toast } from 'sonner';
import { AvatarPixel } from './AvatarPixel';

export const resolveTrophyImage = (instrumento: string, classe: string) => {
  const normalize = (str: any) => String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  
  let slugInst = normalize(instrumento || 'teoria-musical')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (slugInst === 'cordas-violao-guitarra-baixo') slugInst = 'cordas';
  if (slugInst === 'teclado-piano') slugInst = 'teclado';
  if (slugInst === 'tecnica-vocal') slugInst = 'vocal';

  const slugClasse = normalize(classe || 'raro').replace(/\s+/g, '-');
  return `/trofeus/${slugInst}-${slugClasse}.jpg`;
};

interface PerfilEstudanteModalProps {
  selectedAluno: any;
  user: any; // The logged-in user to check roles
  onClose: () => void;
  onConquistaRemoved?: () => void;
}

export const getClasse = (xp: number) => {
  if (xp >= 9000) return 'MASTER_PRO';
  if (xp >= 5000) return 'ADVANCED';
  if (xp >= 2000) return 'INTERMEDIATE';
  if (xp >= 500) return 'BEGINNER_PLUS';
  return 'STUDENT';
};

export const getInstrumento = (aluno: any) => aluno.curso || aluno.curso_ativo || aluno.instrumento || aluno.curso_nome || 'MÚSICA';

export default function PerfilEstudanteModal({ selectedAluno, user, onClose, onConquistaRemoved }: PerfilEstudanteModalProps) {
  const [selectedTrophy, setSelectedTrophy] = useState<any>(null);
  
  const handleRemoverConquistaLocal = async (alunoId: number, conquistaId: number, conquistaNome: string) => {
    if (!confirm(`Tem certeza de que deseja retirar o troféu "${conquistaNome}" deste aluno? O XP correspondente será deduzido automaticamente.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('acorde_token');
      const res = await fetch('/api/gamificacao/remover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ aluno_id: alunoId, conquista_id: conquistaId })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Troféu "${conquistaNome}" removido com sucesso! 🗑️`);
        if (onConquistaRemoved) {
          onConquistaRemoved();
        }
        onClose(); // Fechamos o modal para forçar a re-abertura com dados atualizados (se estiver na página de Ranking)
      } else {
        toast.error(data.error || 'Erro ao remover conquista');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao remover conquista');
    }
  };

  if (!selectedAluno) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#261812] border-8 border-[#ff6b00] w-full max-w-2xl shadow-[12px_12px_0_#ff6b00] flex flex-col relative my-8 font-mono text-white"
      >
        <header className="p-4 border-b-4 border-[#ff6b00] flex items-center justify-between bg-black shrink-0 relative">
          <h2 className="text-xl font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#ff6b00]" /> MEDALHAS
          </h2>
          <button onClick={onClose} className="bg-[#ff6b00] text-black p-1 border-2 border-transparent hover:border-white transition-all active:translate-y-1"><X className="w-6 h-6" /></button>
        </header>

        <div className="p-6 overflow-y-auto max-h-[calc(85vh-100px)] space-y-6 scrollbar-thin">

          {/* AVATAR & INFO Section */}
          <div className="flex items-center gap-4 bg-black/40 border-2 border-[#ff6b00] p-4">
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-[#1a0a05] rounded overflow-hidden shrink-0 border-2 border-orange-500 relative flex items-end justify-center pb-2">
              <AvatarPixel 
                config={selectedAluno?.avatar_config?.skinId ? selectedAluno.avatar_config : { skinId: 'skin_m_1', instrumentId: '', backgroundId: 'bg_1' }}
                isSilhouette={!selectedAluno?.avatar_config?.skinId}
                hideBackground={true}
              />
            </div>
            
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <h3 className="text-xl sm:text-2xl font-black text-white uppercase truncate drop-shadow-md">
                {selectedAluno.nome}
              </h3>
              
              <div className="flex items-center gap-2 mt-2">
                <div className="bg-[#feccba] border-2 border-black px-3 py-1 flex items-center justify-center font-black text-sm text-[#3d2d26] shadow-[2px_2px_0_#000]">
                  💰 {selectedAluno.acorde_coins || 0} COINS
                </div>
                {selectedAluno.foto_url && selectedAluno.foto_url.trim() !== '' && !selectedAluno.foto_url.includes('ui-avatars.com') && (
                  <img src={selectedAluno.foto_url} alt="Foto" className="w-8 h-8 rounded-full border-2 border-white object-cover" />
                )}
              </div>
            </div>
          </div>

          {/* SEQUÊNCIA ATUAL Section */}
          <div className="bg-black/60 border-2 border-[#ff6b00] p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center shrink-0 border border-orange-500/50">
              <Flame className="w-6 h-6 text-orange-500" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <h4 className="font-black text-orange-500 uppercase text-sm">SEQUÊNCIA ATUAL</h4>
                <span className="text-white font-bold text-xs">Por 1 dia consecutivo</span>
              </div>
              <div className="w-full h-2 bg-black/80 rounded-full overflow-hidden border border-orange-900/50">
                <div className="h-full bg-orange-500" style={{ width: '25%' }}></div>
              </div>
              <p className="text-[#a0a0a0] text-[10px] mt-1 font-bold uppercase">Você começou muito bem!</p>
            </div>
          </div>

          {/* MINHAS MEDALHAS Gallery */}
          <div>
            <h4 className="text-lg font-black text-white uppercase tracking-widest mb-4 flex items-center justify-between border-b-2 border-white/20 pb-2">
              <span>MINHAS MEDALHAS</span>
              <span className="text-[#ff6b00] text-sm font-bold">{(Array.isArray(selectedAluno.conquistas) ? selectedAluno.conquistas : []).length} / 100</span>
            </h4>

            {(Array.isArray(selectedAluno.conquistas) ? selectedAluno.conquistas : []).length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                {(Array.isArray(selectedAluno.conquistas) ? selectedAluno.conquistas : []).map((c: any, index: number) => (
                  <div 
                    key={`${c.id}-${index}`} 
                    onClick={() => setSelectedTrophy(c)}
                    className="flex flex-col items-center cursor-pointer group hover:scale-105 transition-transform relative"
                  >
                    {/* Delete Button (Visible for Admins/Professors on hover) */}
                    {(user?.role === 'professor' || user?.role === 'admin') && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoverConquistaLocal(selectedAluno.id, c.id, c.nome);
                        }}
                        title="Remover conquista"
                        className="absolute -top-2 -right-2 p-1.5 z-20 bg-black border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white rounded-full transition-all shadow-[2px_2px_0_#000] opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}

                    <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mb-2 transition-all drop-shadow-[0_0_15px_rgba(255,107,0,0.5)] group-hover:drop-shadow-[0_0_25px_rgba(255,107,0,0.8)]">
                      {c.icone_url || resolveTrophyImage(c.instrumento, c.classe) ? (
                        <img src={c.icone_url || resolveTrophyImage(c.instrumento, c.classe)} alt={c.nome} className="w-full h-full object-contain hover:scale-110 transition-transform" />
                      ) : (
                        <Trophy className="w-10 h-10 text-[#ff6b00]" />
                      )}
                    </div>
                    <h5 className="font-bold text-white text-[10px] uppercase text-center leading-tight line-clamp-2 w-full">{c.nome}</h5>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 bg-black/40 border-2 border-dashed border-white/20">
                <Trophy className="w-12 h-12 text-white/30 mx-auto mb-2" />
                <p className="text-white/50 font-black uppercase text-xs tracking-widest">Nenhuma conquista ainda</p>
                <p className="text-white/40 font-bold uppercase text-[9px] mt-1">Este aluno ainda não recebeu troféus.</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Secundário: Detalhes da Medalha */}
        <AnimatePresence>
          {selectedTrophy && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="absolute inset-0 z-20 bg-[#1a0f0b] border-8 border-[#ff6b00] flex flex-col p-6 overflow-y-auto"
            >
              <button 
                onClick={() => setSelectedTrophy(null)} 
                className="absolute top-4 left-4 bg-transparent text-white p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-8 h-8" />
              </button>

              <div className="flex flex-col items-center mt-8 space-y-6">
                <div className="text-center">
                  <h3 className="text-2xl font-black uppercase text-white tracking-widest">{selectedTrophy.nome}</h3>
                  <p className="text-[#a0a0a0] text-xs font-bold uppercase mt-1">05/12/2026</p> {/* Placeholder de data, pode vir do backend */}
                </div>

                <div className="w-40 h-40 flex items-center justify-center drop-shadow-[0_0_40px_rgba(255,255,255,0.2)] scale-110 transition-all">
                  {selectedTrophy.icone_url || resolveTrophyImage(selectedTrophy.instrumento, selectedTrophy.classe) ? (
                    <img src={selectedTrophy.icone_url || resolveTrophyImage(selectedTrophy.instrumento, selectedTrophy.classe)} alt={selectedTrophy.nome} className="w-full h-full object-contain" />
                  ) : (
                    <Trophy className="w-24 h-24 text-[#ff6b00]" />
                  )}
                </div>

                <p className="text-center text-sm font-bold text-white/80 max-w-md">
                  {selectedTrophy.descricao || "Continue treinando para melhorar suas habilidades e alcançar novos patamares na sua jornada musical!"}
                </p>

                {/* Histórico / Progresso da Medalha */}
                <div className="w-full max-w-md mt-6 space-y-4">
                  <div className="flex justify-between items-center text-xs font-black uppercase text-[#a0a0a0]">
                    <span>Lv.1</span>
                    <span>Lv.2</span>
                  </div>
                  <div className="w-full h-4 bg-black/80 rounded-full overflow-hidden border border-white/20">
                    <div className="h-full bg-gradient-to-r from-blue-400 to-[#ff6b00]" style={{ width: '60%' }}></div>
                  </div>
                  <p className="text-center text-[10px] font-bold text-[#ff6b00] uppercase">Próximo Nível: 120 / 200</p>
                </div>

                <button 
                  onClick={() => setSelectedTrophy(null)}
                  className="mt-8 bg-[#ff6b00] text-black font-black uppercase px-12 py-4 border-4 border-transparent hover:border-white shadow-[6px_6px_0_#000] active:translate-y-1 active:shadow-none transition-all"
                >
                  FECHAR
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}

