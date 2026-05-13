import React, { useState, useEffect } from 'react';
import { Trophy, Star, Medal, Award, Crown, Plus, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Ranking() {
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [alunosList, setAlunosList] = useState<any[]>([]);
  const [conquistasList, setConquistasList] = useState<any[]>([]);
  const [assignData, setAssignData] = useState({ aluno_id: '', conquista_id: '' });

  const fetchData = async () => {
    try {
      const [resR, resA, resC] = await Promise.all([
        fetch('/api/gamificacao/ranking'),
        fetch('/api/alunos'),
        fetch('/api/gamificacao/conquistas')
      ]);
      if (resR.ok) setRanking(await resR.json());
      if (resA.ok) setAlunosList(await resA.json());
      if (resC.ok) setConquistasList(await resC.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignData.aluno_id || !assignData.conquista_id) return alert('Selecione aluno e conquista');
    try {
      const res = await fetch('/api/gamificacao/atribuir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setAssignData({ aluno_id: '', conquista_id: '' });
        fetchData();
      } else {
        alert('Erro ao atribuir conquista');
      }
    } catch (err) {
      alert('Erro de conexão');
    }
  };

  const getLevelInfo = (xp: number) => {
    if (xp >= 1000) return { level: 'Lenda', color: 'from-amber-400 to-yellow-600', icon: <Crown className="w-8 h-8 text-yellow-100" /> };
    if (xp >= 500) return { level: 'Mestre', color: 'from-purple-500 to-indigo-600', icon: <Star className="w-8 h-8 text-purple-100" /> };
    if (xp >= 200) return { level: 'Avançado', color: 'from-blue-500 to-cyan-500', icon: <Award className="w-8 h-8 text-blue-100" /> };
    if (xp >= 50) return { level: 'Intermediário', color: 'from-emerald-400 to-teal-600', icon: <Medal className="w-8 h-8 text-emerald-100" /> };
    return { level: 'Iniciante', color: 'from-slate-600 to-slate-800', icon: <Trophy className="w-8 h-8 text-slate-200" /> };
  };

  if (loading) {
    return <div className="p-8 font-bold text-slate-400">Carregando ranking...</div>;
  }

  return (
    <div className="flex flex-col flex-1 animate-in fade-in duration-500 bg-slate-50">
      <header className="h-24 px-8 frosted-bg border-b border-slate-200/50 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Trophy className="w-8 h-8 text-yellow-500" />
            Ranking Global
          </h1>
          <p className="text-sm font-medium text-slate-500">Acompanhe a evolução e o nível dos alunos.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/30 text-sm active:scale-95 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Atribuir Conquista
        </button>
      </header>

      <div className="p-8 flex-1 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {ranking.map((aluno, index) => {
            const { level, color, icon } = getLevelInfo(aluno.xp);
            return (
              <motion.div 
                key={aluno.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`relative overflow-hidden rounded-[2.5rem] p-8 shadow-2xl bg-gradient-to-br ${index === 0 ? 'from-amber-400 to-orange-500 ring-4 ring-amber-300 ring-offset-4 ring-offset-slate-50 scale-[1.02]' : index === 1 ? 'from-slate-300 to-slate-400 ring-4 ring-slate-300 ring-offset-4 ring-offset-slate-50' : index === 2 ? 'from-amber-600 to-amber-800 ring-4 ring-amber-700 ring-offset-4 ring-offset-slate-50' : color} text-white transition-all hover:scale-[1.03] hover:shadow-3xl`}
              >
                {/* Ribbon de Posição */}
                <div className="absolute top-0 right-0 w-24 h-24 overflow-hidden rounded-tr-[2.5rem]">
                  <div className={`absolute top-0 right-0 w-[141%] h-12 origin-bottom-right rotate-45 translate-x-[20%] -translate-y-full flex items-center justify-center text-sm font-black tracking-widest shadow-lg ${index === 0 ? 'bg-yellow-300 text-yellow-800' : index === 1 ? 'bg-slate-200 text-slate-600' : index === 2 ? 'bg-amber-500 text-amber-900' : 'bg-black/20 text-white/90'}`}>
                     {index + 1}º
                  </div>
                </div>
                
                <div className="absolute top-4 right-4 p-4 opacity-10 drop-shadow-2xl">
                   {index === 0 ? <Crown className="w-24 h-24" /> : icon}
                </div>
                
                <div className="flex items-center gap-5 mb-8 relative z-10">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black shadow-2xl border-4 ${index === 0 ? 'border-yellow-200 bg-amber-500 text-yellow-100' : 'border-white/20 bg-white/10 text-white'}`}>
                    {aluno.avatar_url ? (
                      <img src={aluno.avatar_url} alt={aluno.nome || 'Aluno'} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      (aluno.nome || '?').charAt(0)
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-2xl leading-tight line-clamp-1 drop-shadow-md">{aluno.nome || 'Sem Nome'}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-black uppercase tracking-widest bg-black/20 px-3 py-1 rounded-lg text-white backdrop-blur-sm shadow-inner">
                        {level}
                      </span>
                      <span className="text-lg font-black drop-shadow-sm">{aluno.xp} XP</span>
                    </div>
                  </div>
                </div>

                <div className="bg-black/10 rounded-3xl p-5 backdrop-blur-md border border-white/10 shadow-inner relative z-10">
                  <h4 className="text-[11px] font-black uppercase tracking-widest mb-4 text-white/80">Coleção de Conquistas</h4>
                  {aluno.conquistas?.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                      {aluno.conquistas.map((c: any) => (
                        <div key={c.id} className="relative group">
                          <div className="w-16 h-16 bg-white/20 hover:bg-white/30 transition-all rounded-2xl flex items-center justify-center p-2 shadow-lg backdrop-blur-sm border border-white/20 cursor-help" title={c.nome}>
                            {c.icone_url ? (
                               <img src={c.icone_url} alt={c.nome} className="w-full h-full object-contain drop-shadow-md" />
                            ) : (
                               <Trophy className="w-8 h-8 text-yellow-300 drop-shadow-md" />
                            )}
                          </div>
                          {c.count > 1 && (
                            <div className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-xl border-2 border-white/20">
                              {c.count}x
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-white/50">Nenhuma conquista desbloqueada.</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-slate-900">Atribuir Conquista</h2>
                <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <form onSubmit={handleAssign} className="space-y-4">
                 <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Aluno</label>
                   <select 
                     required
                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                     value={assignData.aluno_id}
                     onChange={(e) => setAssignData({...assignData, aluno_id: e.target.value})}
                   >
                     <option value="">Selecione um aluno...</option>
                     {alunosList.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                   </select>
                 </div>
                 <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Conquista / Medalha</label>
                   <select 
                     required
                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                     value={assignData.conquista_id}
                     onChange={(e) => setAssignData({...assignData, conquista_id: e.target.value})}
                   >
                     <option value="">Selecione a conquista...</option>
                     {conquistasList.map(c => <option key={c.id} value={c.id}>{c.nome} (+{c.pontos} XP)</option>)}
                   </select>
                 </div>
                 
                 <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
                   <button 
                     type="submit"
                     className="w-full bg-primary text-white py-4 rounded-2xl font-black shadow-lg shadow-primary/30 mt-4 active:scale-95 transition-all flex items-center justify-center gap-2"
                   >
                     <Save className="w-5 h-5" /> Atribuir
                   </button>
                 </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
