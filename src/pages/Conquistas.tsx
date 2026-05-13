import React, { useState, useEffect } from 'react';
import { Trophy, Plus, Upload, Search, Settings, X, Save, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Conquistas() {
  const [conquistas, setConquistas] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    pontos: 10,
    regra_automatica: '',
    icone_url: ''
  });
  const [uploading, setUploading] = useState(false);

  const fetchConquistas = async () => {
    const token = localStorage.getItem('acorde_token');
    try {
      const res = await fetch('/api/gamificacao/conquistas', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConquistas(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchConquistas(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    const token = localStorage.getItem('acorde_token');
    e.preventDefault();
    try {
      const res = await fetch('/api/gamificacao/conquistas', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ nome: '', descricao: '', pontos: 10, regra_automatica: '', icone_url: '' });
        fetchConquistas();
      } else {
        alert('Erro ao criar conquista');
      }
    } catch (err) {
      alert('Erro de conexão');
    }
  };

  const handleDelete = async (id: number) => {
    const token = localStorage.getItem('acorde_token');
    if (confirm('Deseja realmente excluir esta conquista?')) {
      try {
        const res = await fetch(`/api/gamificacao/conquistas/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          fetchConquistas();
        } else {
          alert('Erro ao excluir conquista');
        }
      } catch (err) {
        alert('Erro de conexão');
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = new FormData();
    data.append('icon', file);

    const token = localStorage.getItem('acorde_token');
    setUploading(true);
    try {
      const res = await fetch('/api/gamificacao/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: data
      });
      if (res.ok) {
        const json = await res.json();
        setFormData(prev => ({ ...prev, icone_url: json.url }));
      } else {
        alert('Erro ao fazer upload');
      }
    } catch (err) {
      alert('Erro de conexão no upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 animate-in fade-in duration-500">
      <header className="h-24 px-8 frosted-bg border-b border-slate-200/50 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Trophy className="w-8 h-8 text-yellow-500" />
            Conquistas e Medalhas
          </h1>
          <p className="text-sm font-medium text-slate-500">Crie e gerencie as medalhas dos alunos pelo desempenho na escola.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/30 text-sm active:scale-95 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nova Conquista
        </button>
      </header>

      <div className="p-8 flex-1 overflow-auto">
        {conquistas.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center py-20">
            <Trophy className="w-16 h-16 text-slate-200 mb-4" />
            <h2 className="text-xl font-black text-slate-900 mb-2">Nenhuma conquista criada</h2>
            <p className="text-slate-500 font-medium max-w-md mb-6">Crie medalhas customizadas, faça upload de ícones ou selecione regras automáticas como presença e pagamentos.</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/30 text-sm active:scale-95 transition-all"
            >
              Criar Primeira Conquista
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {conquistas.map(c => (
              <div key={c.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col items-center text-center relative group hover:shadow-md transition-all">
                <button 
                  onClick={() => handleDelete(c.id)}
                  className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2 hover:bg-red-50 rounded-full"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-4 text-amber-500 shadow-inner overflow-hidden">
                  {c.icone_url ? (
                     <img src={c.icone_url} alt="Ícone" className="w-full h-full object-cover" />
                  ) : (
                     <Trophy className="w-10 h-10" />
                  )}
                </div>
                <h3 className="font-black text-slate-900">{c.nome}</h3>
                <p className="text-xs text-slate-500 mt-2 font-medium">{c.descricao}</p>
                <div className="mt-4 inline-flex items-center gap-1 bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                   +{c.pontos} pontos
                </div>
              </div>
            ))}
          </div>
        )}
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
                <h2 className="text-xl font-black text-slate-900">Nova Conquista</h2>
                <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                 
                 <div className="flex flex-col items-center justify-center mb-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Ícone da Conquista</label>
                    <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:border-primary hover:bg-primary/5 transition-all">
                       {formData.icone_url ? (
                          <img src={formData.icone_url} alt="Ícone" className="w-full h-full object-contain p-2" />
                       ) : (
                          <>
                            <Upload className="w-6 h-6 text-slate-300 mb-2 group-hover:text-primary transition-colors" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center px-2 group-hover:text-primary">Upload</span>
                          </>
                       )}
                       {uploading && (
                         <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                           <span className="text-[10px] font-bold text-primary">Enviando...</span>
                         </div>
                       )}
                       <input 
                         type="file" 
                         accept="image/*" 
                         className="absolute inset-0 opacity-0 cursor-pointer"
                         onChange={handleFileUpload}
                         disabled={uploading}
                       />
                    </div>
                 </div>

                 <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nome da Conquista</label>
                   <input 
                     required
                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                     value={formData.nome}
                     onChange={(e) => setFormData({...formData, nome: e.target.value})}
                   />
                 </div>
                 <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Descrição</label>
                   <textarea 
                     required
                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium resize-none h-24"
                     value={formData.descricao}
                     onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                   />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Pontuação (Coins)</label>
                      <input 
                        type="number"
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                        value={formData.pontos}
                        onChange={(e) => setFormData({...formData, pontos: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Gatilho Automático</label>
                      <select 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                        value={formData.regra_automatica}
                        onChange={(e) => setFormData({...formData, regra_automatica: e.target.value})}
                      >
                        <option value="">Nenhum (Manual)</option>
                        <option value="presenca_perfeita">100% Presença Mensal</option>
                        <option value="pagamento_em_dia">Mensalidade em Dia</option>
                      </select>
                    </div>
                 </div>
                 
                 <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
                   <button 
                     type="submit"
                     className="w-full bg-primary text-white py-4 rounded-2xl font-black shadow-lg shadow-primary/30 mt-4 active:scale-95 transition-all flex items-center justify-center gap-2"
                   >
                     <Save className="w-5 h-5" /> Salvar Conquista
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
