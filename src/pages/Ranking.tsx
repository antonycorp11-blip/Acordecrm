import React, { useState, useEffect } from 'react';
import { Search, Bell, LayoutGrid, List, Trophy, Star, Zap, Target, Plus, X, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import PerfilEstudanteModal, { getClasse, getInstrumento, resolveTrophyImage } from '../components/PerfilEstudanteModal';

type ViewMode = 'cards' | 'lista';

export default function Ranking() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [ranking, setRanking] = useState<any[]>([]);
  const [alunosList, setAlunosList] = useState<any[]>([]);
  const [conquistasList, setConquistasList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignData, setAssignData] = useState({ aluno_id: '', conquista_id: '' });

  const [selectedAluno, setSelectedAluno] = useState<any | null>(null);
  const [isAlunoModalOpen, setIsAlunoModalOpen] = useState(false);

  const token = localStorage.getItem('acorde_token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    try {
      const [resR, resA, resC] = await Promise.all([
        fetch('/api/gamificacao/ranking', { headers }).then(r => r.ok ? r.json() : []),
        fetch('/api/alunos', { headers }).then(r => r.ok ? r.json() : []),
        fetch('/api/gamificacao/conquistas', { headers }).then(r => r.ok ? r.json() : []),
      ]);
      const rankingData = Array.isArray(resR) ? resR : [];
      setRanking(rankingData);
      setAlunosList(Array.isArray(resA) ? resA : []);
      setConquistasList(Array.isArray(resC) ? resC : []);

      // Atualiza o aluno selecionado se o modal estiver aberto
      if (selectedAluno) {
        const atualizado = rankingData.find((a: any) => a.id === selectedAluno.id);
        if (atualizado) {
          setSelectedAluno(atualizado);
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleOpenAlunoModal = (aluno: any) => {
    setSelectedAluno(aluno);
    setIsAlunoModalOpen(true);
  };

  const handleRemoverConquista = async (alunoId: number, conquistaId: number, conquistaNome: string) => {
    if (!confirm(`Tem certeza de que deseja retirar o troféu "${conquistaNome}" deste aluno? O XP correspondente será deduzido automaticamente.`)) {
      return;
    }

    try {
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
        
        // Atualizar o estado do selectedAluno localmente no modal
        setSelectedAluno((prev: any) => {
          if (!prev) return null;
          const novasConquistas = [...(prev.conquistas || [])];
          const targetIdx = novasConquistas.findIndex((c: any) => Number(c.id) === Number(conquistaId));
          let pontosReduzidos = 0;
          if (targetIdx !== -1) {
            pontosReduzidos = novasConquistas[targetIdx].pontos || 0;
            novasConquistas.splice(targetIdx, 1);
          }
          return {
            ...prev,
            xp: Math.max(0, (prev.xp || 0) - pontosReduzidos),
            conquistas: novasConquistas
          };
        });

        // Recarregar os dados do ranking
        fetchData();
      } else {
        toast.error(data.error || 'Erro ao remover conquista');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao remover conquista');
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/gamificacao/atribuir', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(assignData)
      });
      if (res.ok) {
        toast.success('CONQUISTA ATRIBUÍDA COM SUCESSO! 🏆');
        setIsModalOpen(false);
        setAssignData({ aluno_id: '', conquista_id: '' });
        fetchData();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Erro ao atribuir conquista ❌');
      }
    } catch (err) {
      toast.error('Erro de conexão com o servidor ❌');
    }
  };

  const mockRanking = ranking;

  const achievementIcons = [
    <Star key="s" className="w-6 h-6" />,
    <Trophy key="t" className="w-6 h-6" />,
    <Zap key="z" className="w-6 h-6" />,
    <Target key="tg" className="w-6 h-6" />
  ];

  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden" style={{ background: '#1a0a05', fontFamily: "'Space Mono', monospace" }}>
      {/* Dot background */}
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{
        backgroundImage: 'radial-gradient(circle, #ff6b00 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }} />

      {/* TOP BAR */}
      <header className="relative z-10 flex items-center gap-6 px-8 py-6 border-b-8 border-black shrink-0 bg-[#feccba]">
        <div className="flex-1">
          <h1 className="text-black font-black text-2xl tracking-tighter uppercase italic italic">Ranking_Geral</h1>
          <p className="text-[#8e7164] text-[10px] font-black uppercase tracking-widest">&gt;&gt; TEMPORADA_ATUAL_04</p>
        </div>
        <div className="flex items-center gap-6">
          <button className="text-black hover:text-[#ff6b00] transition-colors"><Bell className="w-7 h-7" /></button>
        </div>
      </header>

      {/* CONTENT */}
      <div className="relative z-10 flex-1 overflow-auto px-8 py-6">

        {/* Controls Section */}
        <div className="flex items-center justify-end mb-10">
          <div className="flex items-center bg-black p-1 border-4 border-white shadow-[6px_6px_0_#000]">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-2 px-6 py-3 font-black text-xs uppercase tracking-widest transition-all ${viewMode === 'cards' ? 'bg-[#ff6b00] text-white' : 'text-[#8e7164] hover:text-white'}`}
            >
              <LayoutGrid className="w-4 h-4" /> GRID_VIEW
            </button>
            <button
              onClick={() => setViewMode('lista')}
              className={`flex items-center gap-2 px-6 py-3 font-black text-xs uppercase tracking-widest transition-all ${viewMode === 'lista' ? 'bg-[#ff6b00] text-white' : 'text-[#8e7164] hover:text-white'}`}
            >
              <List className="w-4 h-4" /> LIST_VIEW
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-[#8e7164] font-black uppercase animate-pulse">Carregando ranking...</div>
        ) : viewMode === 'cards' ? (
          /* ── CARDS VIEW ── */
          <div className="grid grid-cols-3 gap-5">
            {mockRanking.length > 0 ? (
              <>
                {/* Featured #1 card (left, large) */}
                {mockRanking[0] && (
                  <div onClick={() => handleOpenAlunoModal(mockRanking[0])} className="col-span-2 rounded-lg overflow-hidden relative cursor-pointer hover:scale-[1.01] transition-all" style={{ background: '#fff8f6', border: '3px solid #261812', boxShadow: '6px 6px 0 #000' }}>
                    {/* Rank badge */}
                    <div className="absolute top-4 left-4 w-10 h-10 flex items-center justify-center font-black text-white text-sm z-10" style={{ background: '#ff6b00', border: '2px solid #261812', boxShadow: '2px 2px 0 #261812' }}>
                      #1
                    </div>
                    <div className="flex h-full">
                      {/* Photo area */}
                      <div className="w-64 bg-gradient-to-b from-[#261812] to-[#1a0a05] flex items-center justify-center shrink-0" style={{ minHeight: '340px', borderRight: '3px solid #261812' }}>
                        {mockRanking[0].foto_url ? (
                          <img 
                            src={mockRanking[0].foto_url} 
                            alt={mockRanking[0].nome} 
                            className="w-40 h-48 object-cover rounded border-2 border-[#ff6b00]" 
                            style={{ boxShadow: '0 0 30px rgba(255,107,0,0.3)' }} 
                          />
                        ) : (
                          <div className="w-40 h-48 bg-[#3d2d26] rounded border-2 border-[#ff6b00] flex items-center justify-center" style={{ boxShadow: '0 0 30px rgba(255,107,0,0.3)' }}>
                            <span className="text-[#ff6b00] font-black text-5xl">{(mockRanking[0].nome || 'R').charAt(0)}</span>
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 p-8 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="font-black text-[#261812] text-3xl uppercase tracking-tight leading-none">{mockRanking[0].nome}</h3>
                            {/* Miniaturas de troféu reais ao lado do nome */}
                            <div className="flex gap-1.5 shrink-0">
                              {(mockRanking[0].conquistas || []).map((c: any, idx: number) => (
                                <div key={idx} className="w-8 h-8 rounded border border-[#7b5647] flex items-center justify-center bg-[#ffeae1] overflow-hidden" title={`${c.nome} (+${c.pontos} XP)`}>
                                  {c.icone_url || resolveTrophyImage(c.instrumento, c.classe) ? (
                                    <img src={c.icone_url || resolveTrophyImage(c.instrumento, c.classe)} alt={c.nome} className="w-full h-full object-contain p-1" />
                                  ) : (
                                    <Trophy className="w-4 h-4 text-[#ff6b00]" />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <p className="text-[#7b5647] text-xs font-bold leading-relaxed mb-4">
                            Desempenho excepcional nesta temporada. Continue evoluindo suas habilidades musicais!
                          </p>
                        </div>

                        {/* Fundo do card / Info rodapé */}
                        <div className="space-y-4 pt-4 border-t border-[#f8ddd2]">
                          <div className="flex items-center justify-between text-[10px] font-black uppercase text-[#7b5647]">
                            <div>CLASSE: <span className="text-[#ff6b00]">{getClasse(mockRanking[0].xp)}</span></div>
                            <div>INSTRUMENTO: <span className="text-[#261812]">{getInstrumento(mockRanking[0])}</span></div>
                            <div>XP: <span className="text-[#ff6b00]">{mockRanking[0].xp?.toLocaleString()}</span></div>
                          </div>
                          {/* XP Bar */}
                          <div className="rounded p-3 flex items-center gap-4" style={{ background: '#ff6b00', border: '2px solid #261812' }}>
                            <div className="flex-1 h-4 rounded overflow-hidden" style={{ background: '#261812' }}>
                              <div className="h-full bg-[#fff8f6] rounded" style={{ width: `${Math.min(100, (mockRanking[0].xp / 10000) * 100)}%` }}></div>
                            </div>
                            <span className="text-white font-black text-xs whitespace-nowrap">XP: {mockRanking[0].xp}/{mockRanking[0].xp >= 10000 ? '10000' : '10000'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Side cards #2, #3 */}
                <div className="flex flex-col gap-5">
                  {mockRanking.slice(1, 3).map((aluno, i) => (
                    <div key={aluno.id} onClick={() => handleOpenAlunoModal(aluno)} className="rounded-lg overflow-hidden relative flex-1 cursor-pointer hover:scale-[1.02] transition-all" style={{ background: '#fff1eb', border: '3px solid #261812', boxShadow: '4px 4px 0 #000', minHeight: '150px' }}>
                      <div className="absolute top-3 left-3 flex items-center justify-center font-black text-[#261812] text-sm border-2 border-[#261812] w-9 h-9" style={{ background: '#fff8f6' }}>
                        #{i + 2}
                      </div>
                      <div className="flex h-full p-4 pt-12">
                        {aluno.foto_url ? (
                          <img 
                            src={aluno.foto_url} 
                            alt={aluno.nome} 
                            className="w-20 h-24 object-cover rounded border-2 border-[#261812] shrink-0 mr-4" 
                          />
                        ) : (
                          <div className="w-20 h-24 bg-[#261812] rounded border border-[#ff6b00] flex items-center justify-center shrink-0 mr-4">
                            <span className="text-[#ff6b00] font-black text-2xl">{(aluno.nome || '?').charAt(0)}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-black text-[#261812] text-sm uppercase leading-tight truncate max-w-[120px]">{aluno.nome}</h4>
                              {/* Miniaturas de troféu reais ao lado do nome */}
                              <div className="flex gap-0.5 shrink-0">
                                {(aluno.conquistas || []).slice(0, 3).map((c: any, j: number) => (
                                  <div key={j} className="w-5 h-5 rounded border border-[#7b5647] flex items-center justify-center bg-[#ffeae1] overflow-hidden" title={c.nome}>
                                    {c.icone_url || resolveTrophyImage(c.instrumento, c.classe) ? (
                                      <img src={c.icone_url || resolveTrophyImage(c.instrumento, c.classe)} alt={c.nome} className="w-full h-full object-contain p-0.5" />
                                    ) : (
                                      <Trophy className="w-3 h-3 text-[#ff6b00]" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          {/* Fundo do card / rodapé */}
                          <div className="text-[8px] font-black uppercase text-[#8e7164] space-y-0.5 border-t border-[#f8ddd2]/60 pt-2 mt-1">
                            <div>CLASSE: <span className="text-[#ff6b00]">{getClasse(aluno.xp)}</span></div>
                            <div>INSTRUMENTO: <span className="text-[#261812]">{getInstrumento(aluno)}</span></div>
                            <div>XP: <span className="text-[#ff6b00]">{aluno.xp?.toLocaleString()}</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {mockRanking.length < 2 && (
                    <div className="flex-1 rounded-lg border-2 border-dashed border-[#5a4136] flex items-center justify-center text-[#8e7164] font-black uppercase text-[10px] tracking-widest">
                      Aguardando competidores
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="col-span-3 py-20 flex flex-col items-center justify-center rounded-lg border-4 border-dashed border-[#5a4136] bg-[#1a0a05]/50">
                <Trophy className="w-16 h-16 text-[#5a4136] mb-4" />
                <p className="text-[#8e7164] font-black uppercase tracking-widest text-lg">Nenhum aluno no ranking ainda</p>
                <p className="text-[#5a4136] font-bold uppercase text-[10px] mt-2">Comece a atribuir conquistas para ver o progresso</p>
              </div>
            )}
          </div>
        ) : (
          /* ── LIST VIEW ── */
          <div className="rounded-lg overflow-hidden" style={{ background: '#fff8f6', border: '3px solid #261812', boxShadow: '6px 6px 0 #000' }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: '#3d2d26' }}>
                  <th className="px-6 py-4 text-left text-[#feccba] font-black text-[10px] uppercase tracking-widest"># RANK</th>
                  <th className="px-6 py-4 text-left text-[#feccba] font-black text-[10px] uppercase tracking-widest">ESTUDANTE</th>
                  <th className="px-6 py-4 text-left text-[#feccba] font-black text-[10px] uppercase tracking-widest">CLASSE</th>
                  <th className="px-6 py-4 text-left text-[#feccba] font-black text-[10px] uppercase tracking-widest">INSTRUMENTO</th>
                  <th className="px-6 py-4 text-right text-[#feccba] font-black text-[10px] uppercase tracking-widest">XP</th>
                </tr>
              </thead>
              <tbody>
                {mockRanking.map((aluno, i) => (
                  <tr key={aluno.id} onClick={() => handleOpenAlunoModal(aluno)} style={{ borderBottom: '2px solid #f8ddd2' }} className="hover:bg-[#ffeae1] transition-colors cursor-pointer">
                    <td className="px-6 py-4">
                      <span className="font-black text-2xl" style={{ color: i === 0 ? '#ff6b00' : '#261812' }}>
                        #{String(i + 1).padStart(2, '0')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {aluno.foto_url ? (
                          <img 
                            src={aluno.foto_url} 
                            alt={aluno.nome} 
                            className="w-10 h-10 rounded-full border-2 border-[#7b5647] object-cover shrink-0" 
                          />
                        ) : (
                          <div className="w-10 h-10 rounded border-2 border-[#7b5647] flex items-center justify-center font-black text-[#261812] shrink-0" style={{ background: '#feccba' }}>
                            {(aluno.nome || '?').charAt(0)}
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <span className="font-black text-[#261812] uppercase text-sm">{aluno.nome}</span>
                          {/* Miniaturas de troféu reais ao lado do nome */}
                          <div className="flex items-center gap-1.5">
                            {(aluno.conquistas || []).map((c: any, idx: number) => (
                              <div key={idx} className="w-6 h-6 rounded border border-[#7b5647] flex items-center justify-center bg-[#ffeae1] overflow-hidden" title={`${c.nome} (+${c.pontos} XP)`}>
                                {c.icone_url || resolveTrophyImage(c.instrumento, c.classe) ? (
                                  <img src={c.icone_url || resolveTrophyImage(c.instrumento, c.classe)} alt={c.nome} className="w-full h-full object-contain p-0.5" />
                                ) : (
                                  <Trophy className="w-3 h-3 text-[#ff6b00]" />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[#261812] font-bold text-xs uppercase">{getClasse(aluno.xp)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[#261812] font-bold text-xs uppercase">{getInstrumento(aluno)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-black text-[#261812] text-sm">{aluno.xp?.toLocaleString() || '0'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-6 py-4 border-t-2 border-[#f8ddd2]">
              <span className="text-[#ff6b00] font-black text-xs uppercase tracking-widest">TOTAL ALUNOS: {mockRanking.length}</span>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 border-2 border-[#7b5647] rounded font-black text-xs uppercase text-[#261812] hover:bg-[#feccba] transition-all">ANTERIOR</button>
                <span className="w-10 h-10 flex items-center justify-center font-black text-white text-sm" style={{ background: '#ff6b00', border: '2px solid #261812' }}>1</span>
                <button className="px-4 py-2 border-2 border-[#7b5647] rounded font-black text-xs uppercase text-[#261812] hover:bg-[#feccba] transition-all">PRÓXIMO</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 left-20 w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-black z-20 pressable-btn"
        style={{ background: '#ff6b00', border: '3px solid #261812', boxShadow: '4px 4px 0 #000' }}
      >
        +
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#fff8f6] border-8 border-black w-full max-w-md shadow-[12px_12px_0_#000] flex flex-col"
          >
            <header className="p-6 border-b-8 border-black flex items-center justify-between bg-[#feccba]">
              <div className="flex items-center gap-3">
                <div className="bg-[#ff6b00] p-2 border-4 border-black shadow-[4px_4px_0_#000]"><Trophy className="w-6 h-6 text-white" /></div>
                <div>
                  <h2 className="text-xl font-black text-black uppercase italic italic tracking-tighter">Atribuir_Conquista</h2>
                  <p className="text-[10px] font-black text-[#8e7164] uppercase tracking-widest">&gt;&gt; NOVO_ENTRY</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="bg-black text-white p-2 border-2 border-white shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none"><X className="w-6 h-6" /></button>
            </header>

            <form onSubmit={handleAssign} className="p-8 space-y-6">
              <div>
                <label className="text-[10px] font-black text-black uppercase tracking-widest mb-2 block">SELECIONAR_PLAYER</label>
                <select 
                  required 
                  className="w-full px-4 py-3 bg-white border-4 border-black text-sm font-black uppercase italic italic focus:ring-0 outline-none" 
                  value={assignData.aluno_id} 
                  onChange={e => setAssignData({ ...assignData, aluno_id: e.target.value })}
                >
                  <option value="">PLAYER_LIST...</option>
                  {alunosList.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-black uppercase tracking-widest mb-2 block">ESCOLHER_ACHIEVEMENT</label>
                <select 
                  required 
                  className="w-full px-4 py-3 bg-white border-4 border-black text-sm font-black uppercase italic italic focus:ring-0 outline-none" 
                  value={assignData.conquista_id} 
                  onChange={e => setAssignData({ ...assignData, conquista_id: e.target.value })}
                >
                  <option value="">ACHIEVEMENTS...</option>
                  {conquistasList.map(c => <option key={c.id} value={c.id}>{c.nome} (+{c.pontos} XP)</option>)}
                </select>
              </div>
              <button type="submit" className="w-full py-5 bg-[#ff6b00] text-white font-black uppercase italic italic border-4 border-black shadow-[6px_6px_0_#000] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-3">
                <Save className="w-5 h-5" /> ATRIBUIR_PONTOS
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Aluno Profile Modal */}
      {isAlunoModalOpen && selectedAluno && (
        <PerfilEstudanteModal 
          selectedAluno={selectedAluno} 
          user={user} 
          onClose={() => setIsAlunoModalOpen(false)} 
          onConquistaRemoved={() => fetchData()} 
        />
      )}
    </div>
  );
}
