import React, { useState, useEffect } from 'react';
import { Search, Bell, LayoutGrid, List, Trophy, Star, Zap, Target, Plus, X, Save, Trash2, Crown, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import PerfilEstudanteModal, { getClasse, getInstrumento, resolveTrophyImage } from '../components/PerfilEstudanteModal';
import { AvatarPixel } from '../components/AvatarPixel';
import { FONTS, TILES } from '../utils/avatarAssets';
import { SeasonCountdown } from '../components/SeasonCountdown';
import { HoraDuplaBanner } from '../components/HoraDuplaBanner';

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
  const [temporadaAtual, setTemporadaAtual] = useState<{ id?: number; nome: string; data_fim?: string }>({
    id: 3,
    nome: 'TEMPORADA 3',
    data_fim: '2026-09-22T23:59:59-04:00'
  });

  const [selectedAluno, setSelectedAluno] = useState<any | null>(null);
  const [isAlunoModalOpen, setIsAlunoModalOpen] = useState(false);

  const token = localStorage.getItem('acorde_token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    try {
      const [resR, resA, resC, resT] = await Promise.all([
        fetch('/api/gamificacao/ranking', { headers }).then(r => r.ok ? r.json() : []),
        fetch('/api/alunos', { headers }).then(r => r.ok ? r.json() : []),
        fetch('/api/gamificacao/conquistas', { headers }).then(r => r.ok ? r.json() : []),
        fetch('/api/temporada-atual', { headers }).then(r => r.ok ? r.json() : null),
      ]);
      const rankingData = Array.isArray(resR) ? resR : [];
      setRanking(rankingData);
      setAlunosList(Array.isArray(resA) ? resA : []);
      setConquistasList(Array.isArray(resC) ? resC : []);
      if (resT && resT.nome) {
        setTemporadaAtual(resT);
      }

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

  const getFont = (aluno: any) => {
    const f = FONTS.find(font => font.id === aluno?.avatar_config?.fontId);
    return f ? f.fontFamily : undefined;
  };

  const getTileClass = (aluno: any, defaultClass: string) => {
    const t = TILES.find(tile => tile.id === aluno?.avatar_config?.tileId);
    return t ? `border-4 ${t.className}` : defaultClass;
  };

  const getAvatarConfig = (aluno: any) => {
    if (aluno?.avatar_config && aluno.avatar_config.skinId) return { config: aluno.avatar_config, isSilhouette: false };
    return { 
      config: { skinId: 'skin_m_1', instrumentId: 'inst_gui_1', backgroundId: 'bg_1' }, 
      isSilhouette: true 
    };
  };

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
          <p className="text-[#8e7164] text-[10px] font-black uppercase tracking-widest">&gt;&gt; {temporadaAtual.nome || 'TEMPORADA 3'} (EM ANDAMENTO)</p>
        </div>
        <div className="flex items-center gap-6">
          <button className="text-black hover:text-[#ff6b00] transition-colors"><Bell className="w-7 h-7" /></button>
        </div>
      </header>

      {/* CONTENT */}
      <div className="relative z-10 flex-1 overflow-auto px-8 py-6">

        {/* BANNER DA GRANDE CAMPEÃ DA TEMPORADA 2 */}
        <div className="mb-6 relative overflow-hidden rounded-2xl border-4 border-[#ffb700] bg-gradient-to-r from-[#2b1704] via-[#422206] to-[#1a0a05] p-5 sm:p-6 shadow-[0_0_35px_rgba(255,183,0,0.3)]">
          {/* Shimmer / Glow decoration */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-radial from-amber-500/20 to-transparent blur-3xl pointer-events-none -mr-20 -mt-20" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Left: Trophy & Winner Info */}
            <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
              <div className="relative shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-4 border-[#ffb700] bg-[#120703] shadow-[4px_4px_0_#000] flex items-center justify-center overflow-hidden">
                  <AvatarPixel
                    config={{
                      skinId: 'skin_t2_3',
                      instrumentId: 'inst_gui_4',
                      backgroundId: 'bg_4',
                      tileId: 'tile_1',
                      fontId: 'font_3'
                    }}
                    isSilhouette={false}
                  />
                </div>
                <div className="absolute -top-3 -right-2 bg-[#ffeb3b] text-black border-2 border-black rounded-full p-1.5 shadow-[2px_2px_0_#000] animate-bounce">
                  <Crown className="w-4 h-4 fill-amber-500 text-black" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="bg-[#ffb700] text-black text-[10px] font-black uppercase px-2.5 py-0.5 rounded shadow-[2px_2px_0_#000] flex items-center gap-1">
                    👑 GRANDE CAMPEÃ DA TEMPORADA 2
                  </span>
                  <span className="bg-black/60 border border-[#ffb700]/40 text-[#ffeb3b] text-[10px] font-black uppercase px-2 py-0.5 rounded">
                    🏆 1º LUGAR GERAL
                  </span>
                </div>
                <h2 className="text-white text-xl sm:text-2xl font-black uppercase tracking-tight" style={{ fontFamily: FONTS.find(f => f.id === 'font_3')?.fontFamily }}>
                  KEMILY DE FARIAS OLIVEIRA
                </h2>
                <p className="text-[#feccba] text-xs font-semibold max-w-xl">
                  Parabéns Kemily pelo desempenho incrível e dedicação exemplar em todas as aulas, treinos e desafios! 🎸🔥
                </p>
              </div>
            </div>

            {/* Right: Score card */}
            <div className="flex flex-col items-center sm:items-end shrink-0">
              <span className="text-[10px] font-black text-amber-300 uppercase tracking-widest">PONTUAÇÃO FINAL</span>
              <div className="bg-black/80 border-2 border-[#ffb700] px-5 py-2.5 rounded-xl shadow-[4px_4px_0_#000] text-center sm:text-right mt-1">
                <div className="text-2xl sm:text-3xl font-black text-[#ffeb3b] tracking-wider font-mono">
                  46.217.414
                </div>
                <span className="text-[9px] font-black text-white/70 uppercase tracking-widest">PONTOS CONQUISTADOS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Season Countdown Banner */}
        <SeasonCountdown targetDate={temporadaAtual.data_fim || "2026-09-22T23:59:59-04:00"} seasonName={temporadaAtual.nome || "TEMPORADA 3"} className="mb-4" />

        {/* Hora Dupla Banner */}
        <HoraDuplaBanner className="mb-6" />

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
          /* ── CARDS VIEW (PODIUM) ── */
          <div className="flex items-end justify-center gap-6 mb-12 mt-20 h-[520px]">
            {mockRanking.length > 0 ? (
              <>
                {/* 2nd Place */}
                {mockRanking[1] && (
                  <div 
                    onClick={() => handleOpenAlunoModal(mockRanking[1])}
                    className="w-64 h-[82%] flex flex-col items-center justify-end relative cursor-pointer group hover:-translate-y-2 transition-transform"
                  >
                     <div className="w-full h-[350px] relative z-10 flex items-end pb-2 border-x-4 border-t-4 border-[#261812] bg-[#1a0a05]">
                        <AvatarPixel config={getAvatarConfig(mockRanking[1]).config} isSilhouette={getAvatarConfig(mockRanking[1]).isSilhouette} />
                     </div>
                     <div className={`w-full h-36 bg-[#3d2d26] border-4 border-[#261812] shadow-[4px_4px_0_#000] z-20 flex flex-col items-center justify-center p-2 relative ${getTileClass(mockRanking[1], '')}`}>
                        <div className="absolute -top-5 bg-gray-300 border-2 border-black px-4 py-1 font-black text-sm shadow-[2px_2px_0_#000] z-30">2ND PLACE</div>
                        <div className="font-black text-white text-xl sm:text-2xl uppercase truncate w-full text-center mt-1" style={{ fontFamily: getFont(mockRanking[1]) }}>{mockRanking[1].nome}</div>
                        <div className="text-[#ffeb3b] text-sm sm:text-base font-black uppercase mt-1 tracking-wider bg-black/60 border border-[#ffeb3b] px-3 py-0.5 rounded">{(mockRanking[1].xp || 0).toLocaleString('pt-BR')} PTS</div>
                     </div>
                  </div>
                )}

                {/* 1st Place */}
                {mockRanking[0] && (
                  <div 
                    onClick={() => handleOpenAlunoModal(mockRanking[0])}
                    className="w-80 h-full flex flex-col items-center justify-end relative cursor-pointer group hover:-translate-y-2 transition-transform"
                  >
                     <div className="w-full h-[400px] relative z-10 flex items-end pb-2 border-x-4 border-t-4 border-[#261812] bg-[#1a0a05]">
                        <AvatarPixel config={getAvatarConfig(mockRanking[0]).config} isSilhouette={getAvatarConfig(mockRanking[0]).isSilhouette} />
                     </div>
                     <div className={`w-full h-44 bg-[#ff6b00] border-4 border-[#261812] shadow-[6px_6px_0_#000] z-20 flex flex-col items-center justify-center p-2 relative ${getTileClass(mockRanking[0], '')}`}>
                        <div className="absolute -top-5 bg-[#ffeb3b] border-2 border-black px-6 py-1 font-black text-lg shadow-[2px_2px_0_#000] z-30 animate-pulse">👑 1ST PLACE</div>
                        <div className="font-black text-black text-2xl sm:text-3xl uppercase truncate w-full text-center mt-1" style={{ fontFamily: getFont(mockRanking[0]) }}>{mockRanking[0].nome}</div>
                        <div className="text-black text-base sm:text-xl font-black uppercase mt-1.5 tracking-wider bg-white border-2 border-black px-4 py-1 rounded shadow-[2px_2px_0_#000]">{(mockRanking[0].xp || 0).toLocaleString('pt-BR')} PTS</div>
                     </div>
                  </div>
                )}

                {/* 3rd Place */}
                {mockRanking[2] && (
                  <div 
                    onClick={() => handleOpenAlunoModal(mockRanking[2])}
                    className="w-64 h-[75%] flex flex-col items-center justify-end relative cursor-pointer group hover:-translate-y-2 transition-transform"
                  >
                     <div className="w-full h-[300px] relative z-10 flex items-end pb-2 border-x-4 border-t-4 border-[#261812] bg-[#1a0a05]">
                        <AvatarPixel config={getAvatarConfig(mockRanking[2]).config} isSilhouette={getAvatarConfig(mockRanking[2]).isSilhouette} />
                     </div>
                     <div className={`w-full h-32 bg-[#5a4136] border-4 border-[#261812] shadow-[4px_4px_0_#000] z-20 flex flex-col items-center justify-center p-2 relative ${getTileClass(mockRanking[2], '')}`}>
                        <div className="absolute -top-4 bg-orange-800 border-2 border-black px-4 py-1 font-black text-xs text-white shadow-[2px_2px_0_#000] z-30">3RD PLACE</div>
                        <div className="font-black text-[#feccba] text-lg sm:text-xl uppercase truncate w-full text-center mt-1" style={{ fontFamily: getFont(mockRanking[2]) }}>{mockRanking[2].nome}</div>
                        <div className="text-white text-xs sm:text-sm font-black uppercase mt-1 tracking-wider bg-black/60 border border-[#feccba] px-3 py-0.5 rounded">{(mockRanking[2].xp || 0).toLocaleString('pt-BR')} PTS</div>
                     </div>
                  </div>
                )}
              </>
            ) : (
              <div className="col-span-3 py-20 flex flex-col items-center justify-center rounded-lg border-4 border-dashed border-[#5a4136] bg-[#1a0a05]/50 w-full">
                <Trophy className="w-16 h-16 text-[#5a4136] mb-4" />
                <p className="text-[#8e7164] font-black uppercase tracking-widest text-lg">Nenhum aluno no ranking ainda</p>
                <p className="text-[#5a4136] font-bold uppercase text-[10px] mt-2">Comece a atribuir conquistas para ver o progresso</p>
              </div>
            )}
          </div>
        ) : (
          /* ── LIST VIEW ── */
          <div className="rounded-lg overflow-x-auto max-w-full" style={{ background: '#fff8f6', border: '3px solid #261812', boxShadow: '6px 6px 0 #000' }}>
            <table className="w-full min-w-[500px]">
              <thead>
                <tr style={{ background: '#3d2d26' }}>
                  <th className="px-3 py-3 text-left text-[#feccba] font-black text-[10px] uppercase tracking-widest"># RANK</th>
                  <th className="px-3 py-3 text-left text-[#feccba] font-black text-[10px] uppercase tracking-widest">ESTUDANTE</th>
                  <th className="px-3 py-3 text-left text-[#feccba] font-black text-[10px] uppercase tracking-widest">CLASSE</th>
                  <th className="px-3 py-3 text-left text-[#feccba] font-black text-[10px] uppercase tracking-widest">INSTRUMENTO</th>
                  <th className="px-3 py-3 text-right text-[#feccba] font-black text-[10px] uppercase tracking-widest">XP</th>
                </tr>
              </thead>
              <tbody>
                {mockRanking.map((aluno, i) => (
                  <tr key={aluno.id} onClick={() => handleOpenAlunoModal(aluno)} style={{ borderBottom: '2px solid #f8ddd2' }} className="hover:bg-[#ffeae1] transition-colors cursor-pointer">
                    <td className="px-3 py-3">
                      <span className="font-black text-xl sm:text-2xl" style={{ color: i === 0 ? '#ff6b00' : '#261812' }}>
                        #{String(i + 1).padStart(2, '0')}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-16 h-16 rounded overflow-hidden bg-black shrink-0 relative flex items-start justify-center pt-2 ${getTileClass(aluno, 'border-2 border-[#7b5647]')}`}>
                           <AvatarPixel config={getAvatarConfig(aluno).config} isSilhouette={getAvatarConfig(aluno).isSilhouette} />
                        </div>
                        <div className="flex flex-col gap-1 w-full max-w-[150px] sm:max-w-xs">
                          <span className="font-black text-[#261812] uppercase text-sm" style={{ fontFamily: getFont(aluno) }}>{aluno.nome}</span>
                          {/* Miniaturas de troféu reais abaixo do nome */}
                          <div className="flex flex-wrap gap-1.5">
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
                    <td className="px-3 py-3">
                      <span className="text-[#261812] font-bold text-xs uppercase">{getClasse(aluno.xp)}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-[#261812] font-bold text-xs uppercase">{getInstrumento(aluno)}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="font-black text-[#261812] text-sm font-mono">{(aluno.xp || 0).toLocaleString('pt-BR')} PTS</span>
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
