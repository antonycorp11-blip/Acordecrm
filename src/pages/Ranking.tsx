import React, { useState, useEffect } from 'react';
import { Search, Bell, LayoutGrid, List, Trophy, Star, Zap, Target, Plus, X, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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

  const token = localStorage.getItem('acorde_token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    try {
      const [resR, resA, resC] = await Promise.all([
        fetch('/api/gamificacao/ranking', { headers }).then(r => r.ok ? r.json() : []),
        fetch('/api/alunos', { headers }).then(r => r.ok ? r.json() : []),
        fetch('/api/gamificacao/conquistas', { headers }).then(r => r.ok ? r.json() : []),
      ]);
      setRanking(Array.isArray(resR) ? resR : []);
      setAlunosList(Array.isArray(resA) ? resA : []);
      setConquistasList(Array.isArray(resC) ? resC : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/gamificacao/atribuir', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(assignData)
    });
    setIsModalOpen(false);
    setAssignData({ aluno_id: '', conquista_id: '' });
    fetchData();
  };

  const getClasse = (xp: number) => {
    if (xp >= 9000) return 'MASTER_PRO';
    if (xp >= 5000) return 'ADVANCED';
    if (xp >= 2000) return 'INTERMEDIATE';
    if (xp >= 500) return 'BEGINNER_PLUS';
    return 'STUDENT';
  };

  const getInstrumento = (aluno: any) => aluno.instrumento || aluno.curso_nome || 'MÚSICA';

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
      <header className="relative z-10 flex items-center gap-4 px-6 py-4 border-b-2 border-[#3d2d26] shrink-0" style={{ background: '#1a0a05' }}>
        <div className="flex-1">
          <h1 className="text-[#ff6b00] font-black text-xl tracking-widest uppercase">BEAT_LAB_CRM</h1>
        </div>
        <div className="flex items-center gap-2 border-2 border-[#5a4136] rounded px-3 py-2 flex-1 max-w-sm" style={{ background: '#261812' }}>
          <Search className="w-4 h-4 text-[#8e7164]" />
          <input placeholder="BUSCAR_ALUNO..." className="bg-transparent text-sm text-[#fff8f6] placeholder:text-[#8e7164] outline-none flex-1 uppercase" style={{ fontFamily: "'Space Mono', monospace" }} />
        </div>
        <div className="flex items-center gap-3">
          <button className="text-[#8e7164] hover:text-[#ff6b00]"><Bell className="w-5 h-5" /></button>
          <span className="text-[#ff6b00] font-black text-xs uppercase tracking-widest">CERTIFICATE</span>
          <div className="w-9 h-9 rounded-full border-2 border-[#ff6b00] bg-[#261812] flex items-center justify-center text-[#ff6b00] font-black text-sm">
            {(user?.nome || 'A').charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div className="relative z-10 flex-1 overflow-auto px-8 py-6">

        {/* Season + Title + View Toggle */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="inline-block border-2 border-[#5a4136] rounded px-3 py-1 mb-3">
              <span className="text-[#ff6b00] font-black text-[10px] uppercase tracking-widest">TEMPORADA_04</span>
            </div>
            <h2 className="font-black text-white uppercase" style={{ fontSize: '3rem', lineHeight: 1, letterSpacing: '-1px' }}>
              HALL_DA_FAMA
            </h2>
          </div>

          <div className="flex items-center rounded overflow-hidden" style={{ border: '3px solid #5a4136' }}>
            <button
              onClick={() => setViewMode('cards')}
              className="flex items-center gap-2 px-5 py-3 font-black text-xs uppercase tracking-widest transition-all"
              style={{ background: viewMode === 'cards' ? '#261812' : 'transparent', color: viewMode === 'cards' ? '#fff8f6' : '#8e7164' }}
            >
              <LayoutGrid className="w-4 h-4" /> CARDS
            </button>
            <button
              onClick={() => setViewMode('lista')}
              className="flex items-center gap-2 px-5 py-3 font-black text-xs uppercase tracking-widest transition-all"
              style={{ background: viewMode === 'lista' ? '#ff6b00' : 'transparent', color: viewMode === 'lista' ? '#fff' : '#8e7164', borderLeft: '2px solid #5a4136' }}
            >
              <List className="w-4 h-4" /> LISTA
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
                  <div className="col-span-2 rounded-lg overflow-hidden relative" style={{ background: '#fff8f6', border: '3px solid #261812', boxShadow: '6px 6px 0 #000' }}>
                    {/* Rank badge */}
                    <div className="absolute top-4 left-4 w-10 h-10 flex items-center justify-center font-black text-white text-sm z-10" style={{ background: '#ff6b00', border: '2px solid #261812', boxShadow: '2px 2px 0 #261812' }}>
                      #1
                    </div>
                    <div className="flex h-full">
                      {/* Photo area */}
                      <div className="w-64 bg-gradient-to-b from-[#261812] to-[#1a0a05] flex items-center justify-center shrink-0" style={{ minHeight: '340px', borderRight: '3px solid #261812' }}>
                        <div className="w-40 h-48 bg-[#3d2d26] rounded border-2 border-[#ff6b00] flex items-center justify-center" style={{ boxShadow: '0 0 30px rgba(255,107,0,0.3)' }}>
                          <span className="text-[#ff6b00] font-black text-5xl">{(mockRanking[0].nome || 'R').charAt(0)}</span>
                        </div>
                      </div>
                      {/* Info */}
                      <div className="flex-1 p-8">
                        <h3 className="font-black text-[#261812] text-3xl uppercase tracking-tight mb-3">{mockRanking[0].nome}</h3>
                        <div className="flex items-center gap-2 mb-6">
                          <span className="bg-[#261812] text-white font-black text-[10px] px-3 py-1 rounded uppercase tracking-widest">RANKING_ATIVO</span>
                          <span className="bg-[#ff6b00] text-white font-black text-[10px] px-3 py-1 rounded uppercase tracking-widest">{getInstrumento(mockRanking[0])}</span>
                        </div>
                        <p className="text-[#7b5647] text-sm font-bold leading-relaxed mb-6">
                          Desempenho excepcional nesta temporada. Continue evoluindo suas habilidades musicais!
                        </p>
                        {/* Achievements */}
                        <p className="text-[#ff6b00] font-black text-[10px] uppercase tracking-widest mb-3">CONQUISTAS_DESBLOQUEADAS</p>
                        <div className="flex gap-3 mb-6">
                          {(mockRanking[0].conquistas?.slice(0, 4) || []).map((_: any, i: number) => (
                            <div key={i} className="w-14 h-14 rounded border-2 border-[#7b5647] flex items-center justify-center text-[#7b5647]" style={{ background: '#ffeae1' }}>
                              {achievementIcons[i % 4]}
                            </div>
                          ))}
                          {(!mockRanking[0].conquistas || mockRanking[0].conquistas.length === 0) && (
                            <div className="text-[10px] font-black text-[#8e7164] uppercase opacity-50">Nenhuma conquista ainda</div>
                          )}
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
                )}

                {/* Side cards #2, #3 */}
                <div className="flex flex-col gap-5">
                  {mockRanking.slice(1, 3).map((aluno, i) => (
                    <div key={aluno.id} className="rounded-lg overflow-hidden relative flex-1" style={{ background: '#fff1eb', border: '3px solid #261812', boxShadow: '4px 4px 0 #000', minHeight: '150px' }}>
                      <div className="absolute top-3 left-3 flex items-center justify-center font-black text-[#261812] text-sm border-2 border-[#261812] w-9 h-9" style={{ background: '#fff8f6' }}>
                        #{i + 2}
                      </div>
                      <div className="flex h-full p-4 pt-12">
                        <div className="w-20 h-24 bg-[#261812] rounded border border-[#ff6b00] flex items-center justify-center shrink-0 mr-4">
                          <span className="text-[#ff6b00] font-black text-2xl">{(aluno.nome || '?').charAt(0)}</span>
                        </div>
                        <div>
                          <h4 className="font-black text-[#261812] text-lg uppercase leading-tight truncate max-w-[120px]">{aluno.nome}</h4>
                          <span className="text-[#8e7164] font-black text-[10px] uppercase">LEVEL_{Math.floor(aluno.xp / 200)}</span>
                          <span className="ml-2 text-[#7b5647] font-black text-[10px] uppercase">{getInstrumento(aluno)}</span>
                          <div className="flex gap-2 mt-3">
                            {(aluno.conquistas?.slice(0, 3) || []).map((_: any, j: number) => (
                              <div key={j} className="w-8 h-8 rounded border border-[#7b5647] flex items-center justify-center text-[#8e7164]" style={{ background: '#ffeae1' }}>
                                {achievementIcons[j % 4] && React.cloneElement(achievementIcons[j % 4] as React.ReactElement, { className: 'w-4 h-4' })}
                              </div>
                            ))}
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
                  <th className="px-6 py-4 text-left text-[#feccba] font-black text-[10px] uppercase tracking-widest">CONQUISTAS</th>
                  <th className="px-6 py-4 text-right text-[#feccba] font-black text-[10px] uppercase tracking-widest">XP</th>
                </tr>
              </thead>
              <tbody>
                {mockRanking.map((aluno, i) => (
                  <tr key={aluno.id} style={{ borderBottom: '2px solid #f8ddd2' }} className="hover:bg-[#ffeae1] transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-black text-2xl" style={{ color: i === 0 ? '#ff6b00' : '#261812' }}>
                        #{String(i + 1).padStart(2, '0')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded border-2 border-[#7b5647] flex items-center justify-center font-black text-[#261812] shrink-0" style={{ background: '#feccba' }}>
                          {(aluno.nome || '?').charAt(0)}
                        </div>
                        <span className="font-black text-[#261812] uppercase text-sm">{aluno.nome}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[#261812] font-bold text-xs uppercase">{getClasse(aluno.xp)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[#261812] font-bold text-xs uppercase">{getInstrumento(aluno)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {(aluno.conquistas?.slice(0, 3) || []).map((_: any, j: number) => (
                          <span key={j} className="text-[#8e7164]">
                            {j === 0 ? '☆' : j === 1 ? '⚙' : '✦'}
                          </span>
                        ))}
                        {(!aluno.conquistas || aluno.conquistas.length === 0) && <span className="text-[#c6c6c7] text-xs">–</span>}
                      </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="rounded-lg p-8 w-full max-w-md" style={{ background: '#fff8f6', border: '4px solid #261812', boxShadow: '8px 8px 0 #000', fontFamily: "'Space Mono', monospace" }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[#261812] font-black text-lg uppercase tracking-widest">Atribuir Conquista</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#7b5647] hover:text-[#ff6b00]"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAssign} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-[#8e7164] uppercase tracking-widest mb-1 block">Aluno</label>
                <select required className="retro-input w-full px-4 py-3 rounded text-sm" value={assignData.aluno_id} onChange={e => setAssignData({ ...assignData, aluno_id: e.target.value })}>
                  <option value="">Selecione um aluno...</option>
                  {alunosList.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-[#8e7164] uppercase tracking-widest mb-1 block">Conquista</label>
                <select required className="retro-input w-full px-4 py-3 rounded text-sm" value={assignData.conquista_id} onChange={e => setAssignData({ ...assignData, conquista_id: e.target.value })}>
                  <option value="">Selecione...</option>
                  {conquistasList.map(c => <option key={c.id} value={c.id}>{c.nome} (+{c.pontos} XP)</option>)}
                </select>
              </div>
              <button type="submit" className="w-full py-4 rounded font-black text-white uppercase tracking-widest pressable-btn" style={{ background: '#ff6b00', border: '2px solid #261812' }}>
                <Save className="w-4 h-4 inline mr-2" />Atribuir
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
