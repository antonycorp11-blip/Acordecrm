import React from 'react';
import { motion } from 'motion/react';
import { X, Trophy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#fff8f6] border-8 border-black w-full max-w-2xl shadow-[12px_12px_0_#000] flex flex-col relative my-8"
      >
        <header className="p-6 border-b-8 border-black flex items-center justify-between bg-[#feccba] shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-[#ff6b00] p-2 border-4 border-black shadow-[4px_4px_0_#000]"><Trophy className="w-6 h-6 text-white" /></div>
            <div>
              <h2 className="text-xl font-black text-black uppercase italic tracking-tighter">Perfil_do_Estudante</h2>
              <p className="text-[10px] font-black text-[#8e7164] uppercase tracking-widest">&gt;&gt; PLAYER_STATS</p>
            </div>
          </div>
          <button onClick={onClose} className="bg-black text-white p-2 border-2 border-white shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none"><X className="w-6 h-6" /></button>
        </header>

        <div className="p-8 overflow-y-auto max-h-[calc(85vh-120px)] space-y-8">
          {/* Top Section: Photo & Basic stats */}
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-stretch bg-[#fff1eb] border-4 border-black p-6 shadow-[6px_6px_0_#000]">
            {/* Photo */}
            <div className="w-32 h-36 bg-[#261812] border-4 border-[#ff6b00] rounded overflow-hidden flex items-center justify-center shrink-0 shadow-[4px_4px_0_#000]">
              {selectedAluno.foto_url ? (
                <img src={selectedAluno.foto_url} alt={selectedAluno.nome} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[#ff6b00] font-black text-4xl">{String(selectedAluno.nome || '?').charAt(0)}</span>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 flex flex-col justify-between min-w-0 text-center sm:text-left">
              <div>
                <h3 className="text-2xl font-black text-[#261812] uppercase tracking-tight leading-none mb-2 break-words">{selectedAluno.nome}</h3>
                <p className="text-[#7b5647] font-bold text-xs uppercase tracking-wider mb-4 sm:mb-1">
                  CLASSE: <span className="text-[#ff6b00] font-black">{getClasse(selectedAluno.xp)}</span>
                </p>
                <p className="text-[#7b5647] font-bold text-xs uppercase tracking-wider">
                  INSTRUMENTO: <span className="text-[#261812] font-black">{getInstrumento(selectedAluno)}</span>
                </p>
              </div>

              {/* Level & XP */}
              <div className="mt-4 pt-4 border-t border-[#f8ddd2]/80 flex flex-wrap items-center justify-between gap-4">
                <div className="px-4 py-2 bg-black text-white font-black text-xs uppercase tracking-widest border-2 border-[#ff6b00]">
                  LVL {Math.floor((selectedAluno.xp || 0) / 100) + 1}
                </div>
                <div className="flex-1 min-w-[120px]">
                  <div className="flex justify-between text-[9px] font-black text-[#7b5647] uppercase mb-1">
                    <span>Progresso de XP</span>
                    <span>{selectedAluno.xp?.toLocaleString()} XP</span>
                  </div>
                  <div className="w-full h-3 bg-black border-2 border-black rounded overflow-hidden">
                    <div className="h-full bg-[#ff6b00]" style={{ width: `${Math.min(100, ((selectedAluno.xp || 0) % 1000) / 10)}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Achievements Gallery */}
          <div>
            <h4 className="text-xs font-black text-black uppercase tracking-widest mb-4 border-b-4 border-black pb-2 flex items-center justify-between">
              <span>Conquistas_Desbloqueadas</span>
              <span className="bg-[#ff6b00] text-white px-2 py-0.5 text-[9px] font-bold">{(Array.isArray(selectedAluno.conquistas) ? selectedAluno.conquistas : []).length} TROFÉUS</span>
            </h4>

            {(Array.isArray(selectedAluno.conquistas) ? selectedAluno.conquistas : []).length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {(Array.isArray(selectedAluno.conquistas) ? selectedAluno.conquistas : []).map((c: any, index: number) => (
                  <div 
                    key={`${c.id}-${index}`} 
                    className="bg-[#ffeae1] border-4 border-black p-2 flex flex-col items-center relative shadow-[4px_4px_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_#000] transition-all group w-24 h-28"
                  >
                    {/* Trophy Icon */}
                    <div className="w-12 h-12 rounded border-2 border-[#7b5647] flex items-center justify-center bg-white overflow-hidden shrink-0 shadow-[2px_2px_0_#000] mb-2">
                      {c.icone_url || resolveTrophyImage(c.instrumento, c.classe) ? (
                        <img src={c.icone_url || resolveTrophyImage(c.instrumento, c.classe)} alt={c.nome} className="w-full h-full object-contain p-1" />
                      ) : (
                        <Trophy className="w-6 h-6 text-[#ff6b00]" />
                      )}
                    </div>

                    {/* Title */}
                    <h5 className="font-black text-[#261812] text-[8px] uppercase text-center leading-tight line-clamp-2 w-full px-1">{c.nome}</h5>

                    {/* XP Badge */}
                    <div className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-[#feccba] border-2 border-black font-black text-[7px] uppercase tracking-wider text-[#ff6b00] shadow-[1px_1px_0_#000]">
                      +{c.pontos}
                    </div>

                    {/* Delete Button (Visible for Admins/Professors) */}
                    {(user?.role === 'professor' || user?.role === 'admin') && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoverConquistaLocal(selectedAluno.id, c.id, c.nome);
                        }}
                        title="Remover conquista do aluno"
                        className="absolute -top-2 -left-2 p-1 bg-white border-2 border-black text-[#7b5647] hover:bg-red-500 hover:text-white transition-all shadow-[1px_1px_0_#000] opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 border-4 border-dashed border-[#5a4136] bg-[#1a0a05]/10 rounded">
                <Trophy className="w-12 h-12 text-[#5a4136] mx-auto mb-2 opacity-55" />
                <p className="text-[#7b5647] font-black uppercase text-xs tracking-widest">Nenhuma conquista ainda</p>
                <p className="text-[#8e7164] font-bold uppercase text-[9px] mt-1">Este aluno ainda não recebeu troféus nesta temporada.</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
