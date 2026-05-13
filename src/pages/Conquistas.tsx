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
    <div className="flex flex-col flex-1 animate-in fade-in duration-500 bg-[#1a0f0a] h-screen overflow-hidden">
      <header className="h-24 px-8 bg-[#feccba] border-b-4 border-black flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black text-black uppercase italic italic tracking-tighter flex items-center gap-2">
            <Trophy className="w-8 h-8 text-[#ff6b00]" />
            Conquistas & Medalhas
          </h1>
          <p className="text-[10px] font-black text-[#8e7164] uppercase tracking-widest">Crie e gerencie as medalhas dos alunos pelo desempenho na escola.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#ff6b00] text-white px-6 py-3 border-4 border-black font-black uppercase text-xs shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" /> NOVA_CONQUISTA
        </button>
      </header>

      <div className="p-8 flex-1 overflow-auto">
        {conquistas.length === 0 ? (
          <div className="bg-[#fff8f6] border-4 border-dashed border-black/20 p-20 text-center flex flex-col items-center justify-center gap-4">
            <Trophy className="w-16 h-16 text-black/10 mb-4" />
            <h2 className="text-xl font-black text-black uppercase italic italic">Nenhuma conquista criada</h2>
            <p className="text-[#8e7164] font-black uppercase text-[10px] max-w-md mb-6">Crie medalhas customizadas, faça upload de ícones ou selecione regras automáticas.</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-[#ff6b00] text-white px-8 py-4 border-4 border-black font-black uppercase text-xs shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all"
            >
              Criar Primeira Conquista
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {conquistas.map(c => (
              <div key={c.id} className="bg-[#fff8f6] border-4 border-black p-6 flex flex-col items-center text-center relative group shadow-[6px_6px_0_#000] hover:translate-y-[-4px] transition-all">
                <button 
                  onClick={() => handleDelete(c.id)}
                  className="absolute top-2 right-2 text-black/10 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="w-20 h-20 border-4 border-black bg-white flex items-center justify-center mb-4 shadow-[4px_4px_0_#000] overflow-hidden">
                  {c.icone_url ? (
                     <img src={c.icone_url} alt="Ícone" className="w-full h-full object-contain p-2" />
                  ) : (
                     <Trophy className="w-10 h-10 text-[#ff6b00]" />
                  )}
                </div>
                <h3 className="font-black text-black uppercase italic italic text-sm">{c.nome}</h3>
                <p className="text-[8px] font-black text-[#8e7164] mt-2 uppercase tracking-tighter line-clamp-2">{c.descricao}</p>
                <div className="mt-4 inline-flex items-center gap-1 bg-black text-white px-3 py-1 border-2 border-[#ff6b00] text-[8px] font-black uppercase tracking-widest shadow-[2px_2px_0_#ff6b00]">
                   +{c.pontos} ACORDE_COINS
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
              className="bg-[#fff8f6] border-8 border-black p-8 relative overflow-hidden shadow-[12px_12px_0_#000] w-full max-w-md"
            >
              <div className="absolute top-0 right-0 p-4">
                 <button onClick={() => setIsModalOpen(false)} className="bg-black text-white p-2 border-2 border-white shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all">
                    <X className="w-4 h-4" />
                 </button>
              </div>

              <div className="mb-8">
                <h2 className="text-xl font-black text-black uppercase italic italic flex items-center gap-2">
                   <Trophy className="w-6 h-6 text-[#ff6b00]" /> NOVA_MEDALHA
                </h2>
                <div className="h-2 w-20 bg-[#ff6b00] mt-2 border-2 border-black"></div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                 <div className="flex flex-col items-center justify-center">
                    <label className="text-[10px] font-black text-[#8e7164] uppercase tracking-widest mb-4">ÍCONE_PIXEL_ART</label>
                    <div className="w-28 h-28 border-4 border-black bg-white flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all">
                       {formData.icone_url ? (
                          <img src={formData.icone_url} alt="Ícone" className="w-full h-full object-contain p-2" />
                       ) : (
                          <>
                            <Upload className="w-8 h-8 text-black/10 mb-2 group-hover:text-[#ff6b00] transition-colors" />
                            <span className="text-[8px] font-black text-black/20 uppercase tracking-widest text-center px-2 group-hover:text-[#ff6b00]">UPLOAD_IMG</span>
                          </>
                       )}
                       {uploading && (
                         <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                           <span className="text-[10px] font-black text-[#ff6b00] animate-pulse">ENVIANDO...</span>
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

                 <div className="space-y-4">
                   <div>
                     <label className="text-[10px] font-black text-black uppercase tracking-widest mb-1 block">NOME_DA_CONQUISTA</label>
                     <input 
                       required
                       className="w-full px-4 py-3 bg-white border-4 border-black text-sm font-black uppercase italic italic focus:ring-0 focus:outline-none"
                       value={formData.nome}
                       onChange={(e) => setFormData({...formData, nome: e.target.value})}
                     />
                   </div>
                   <div>
                     <label className="text-[10px] font-black text-black uppercase tracking-widest mb-1 block">DESCRIÇÃO_DA_MISSÃO</label>
                     <textarea 
                       required
                       className="w-full px-4 py-3 bg-white border-4 border-black text-sm font-black uppercase italic italic focus:ring-0 focus:outline-none resize-none h-24"
                       value={formData.descricao}
                       onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                     />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-black uppercase tracking-widest mb-1 block">COINS_RECOMPENSA</label>
                        <input 
                          type="number"
                          required
                          className="w-full px-4 py-3 bg-white border-4 border-black text-sm font-black uppercase italic italic focus:ring-0 focus:outline-none"
                          value={formData.pontos}
                          onChange={(e) => setFormData({...formData, pontos: Number(e.target.value)})}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-black uppercase tracking-widest mb-1 block">GATILHO_AUTO</label>
                        <select 
                          className="w-full px-4 py-3 bg-white border-4 border-black text-sm font-black uppercase italic italic focus:ring-0 focus:outline-none"
                          value={formData.regra_automatica}
                          onChange={(e) => setFormData({...formData, regra_automatica: e.target.value})}
                        >
                          <option value="">MANUAL</option>
                          <option value="presenca_perfeita">PRESENÇA_100%</option>
                          <option value="pagamento_em_dia">PAGAMENTO_OK</option>
                        </select>
                      </div>
                   </div>
                 </div>
                 
                 <button 
                   type="submit"
                   className="w-full bg-[#ff6b00] text-white py-4 border-4 border-black font-black uppercase shadow-[6px_6px_0_#000] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                 >
                   <Save className="w-5 h-5" /> SALVAR_CONQUISTA
                 </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
