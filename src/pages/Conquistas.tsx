import React, { useState, useEffect } from 'react';
import { Trophy, Plus, Upload, Search, Settings, X, Save, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export const resolveTrophyImage = (instrumento: string, classe: string) => {
  const normalize = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  
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

export default function Conquistas() {
  const [conquistas, setConquistas] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: undefined as number | undefined,
    nome: '',
    descricao: '',
    pontos: 250,
    regra_automatica: '',
    icone_url: '',
    classe: 'Especial',
    instrumento: 'Teoria Musical'
  });
  const [uploading, setUploading] = useState(false);

  const classesXP: Record<string, number> = {
    'Especial': 250,
    'Raro': 500,
    'Epico': 750,
    'Lendario': 1200,
    'Supremo': 2000
  };

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

  const resetForm = () => {
    setFormData({
      id: undefined,
      nome: '',
      descricao: '',
      pontos: 250,
      regra_automatica: '',
      icone_url: '',
      classe: 'Especial',
      instrumento: 'Teoria Musical'
    });
  };

  const handleClasseChange = (classe: string) => {
    setFormData(prev => ({
      ...prev,
      classe,
      pontos: classesXP[classe] || 250
    }));
  };

  const handleEditClick = (conquista: any) => {
    setFormData({
      id: conquista.id,
      nome: conquista.nome || '',
      descricao: conquista.descricao || '',
      pontos: conquista.pontos || 250,
      regra_automatica: conquista.regra_automatica || '',
      icone_url: conquista.icone_url || '',
      classe: conquista.classe || 'Especial',
      instrumento: conquista.instrumento || 'Teoria Musical'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    const token = localStorage.getItem('acorde_token');
    e.preventDefault();
    const isEdit = formData.id !== undefined;
    const url = isEdit ? `/api/gamificacao/conquistas/${formData.id}` : '/api/gamificacao/conquistas';
    const method = isEdit ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nome: formData.nome,
          descricao: formData.descricao,
          pontos: formData.pontos,
          regra_automatica: formData.regra_automatica,
          icone_url: formData.icone_url,
          classe: formData.classe,
          instrumento: formData.instrumento
        })
      });
      if (res.ok) {
        toast.success(isEdit ? 'CONQUISTA ATUALIZADA COM SUCESSO! 🎖️' : 'CONQUISTA CRIADA COM SUCESSO! 🎖️');
        setIsModalOpen(false);
        resetForm();
        fetchConquistas();
      } else {
        toast.error(isEdit ? 'Erro ao atualizar conquista ❌' : 'Erro ao criar conquista ❌');
      }
    } catch (err) {
      toast.error('Erro de conexão com o servidor ❌');
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
          toast.success('CONQUISTA EXCLUÍDA! 🗑️');
          fetchConquistas();
        } else {
          toast.error('Erro ao excluir conquista ❌');
        }
      } catch (err) {
        toast.error('Erro de conexão com o servidor ❌');
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
        toast.success('Miniatura enviada com sucesso! 🎨');
      } else {
        toast.error('Erro ao fazer upload da imagem! ❌');
      }
    } catch (err) {
      toast.error('Erro de conexão no upload ❌');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 animate-in fade-in duration-500 bg-[#1a0f0a] h-screen overflow-hidden">
      <header className="px-8 py-6 bg-[#feccba] border-b-8 border-black flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black text-black uppercase italic italic tracking-tighter flex items-center gap-3">
            <Trophy className="w-8 h-8 text-[#ff6b00]" />
            Achievements_&_Medalhas
          </h1>
          <p className="text-[10px] font-black text-[#8e7164] uppercase tracking-widest">&gt;&gt; GESTÃO_DE_GAMIFICAÇÃO</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-[#ff6b00] text-white px-8 py-4 border-4 border-black font-black uppercase text-xs shadow-[6px_6px_0_#000] active:translate-y-1 active:shadow-none flex items-center gap-3 transition-all italic italic"
        >
          <Plus className="w-5 h-5" /> NOVA_CONQUISTA
        </button>
      </header>

      <div className="p-8 flex-1 overflow-auto">
        {conquistas.length === 0 ? (
          <div className="bg-[#fff8f6] border-4 border-dashed border-black/20 p-20 text-center flex flex-col items-center justify-center gap-4">
            <Trophy className="w-16 h-16 text-black/10 mb-4" />
            <h2 className="text-xl font-black text-black uppercase italic italic">Nenhuma conquista criada</h2>
            <p className="text-[#8e7164] font-black uppercase text-[10px] max-w-md mb-6">Crie medalhas customizadas, faça upload de ícones ou selecione regras automáticas.</p>
            <button 
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="bg-[#ff6b00] text-white px-8 py-4 border-4 border-black font-black uppercase text-xs shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all"
            >
              Criar Primeira Conquista
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {conquistas.map(c => (
              <div key={c.id} className="bg-[#fff8f6] border-4 border-black p-6 flex flex-col items-center text-center relative group shadow-[6px_6px_0_#000] hover:translate-y-[-4px] transition-all">
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={() => handleEditClick(c)}
                    className="text-black/30 hover:text-[#ff6b00] p-1 bg-white border-2 border-black shadow-[2px_2px_0_#000] active:translate-y-0.5 active:shadow-none"
                    title="Editar Conquista"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => handleDelete(c.id)}
                    className="text-black/30 hover:text-red-600 p-1 bg-white border-2 border-black shadow-[2px_2px_0_#000] active:translate-y-0.5 active:shadow-none"
                    title="Excluir Conquista"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="w-20 h-20 border-4 border-black bg-white flex items-center justify-center mb-4 shadow-[4px_4px_0_#000] overflow-hidden">
                  {c.icone_url || resolveTrophyImage(c.instrumento, c.classe) ? (
                     <img src={c.icone_url || resolveTrophyImage(c.instrumento, c.classe)} alt="Ícone" className="w-full h-full object-contain p-2" />
                  ) : (
                     <Trophy className="w-10 h-10 text-[#ff6b00]" />
                  )}
                </div>
                <h3 className="font-black text-black uppercase italic italic text-sm">{c.nome}</h3>
                <p className="text-[8px] font-black text-[#8e7164] mt-2 uppercase tracking-tighter line-clamp-2">{c.descricao}</p>
                <div className="mt-2 inline-flex items-center gap-1 bg-[#ff6b00] text-white px-2 py-0.5 border border-black text-[7px] font-black uppercase tracking-wider">
                  {c.classe || 'ESPECIAL'}
                </div>
                <div className="mt-2 inline-flex items-center gap-1 bg-black text-white px-3 py-1 border-2 border-[#ff6b00] text-[8px] font-black uppercase tracking-widest shadow-[2px_2px_0_#ff6b00]">
                   +{c.pontos} XP
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
                 <button 
                   onClick={() => { resetForm(); setIsModalOpen(false); }} 
                   className="bg-black text-white p-2 border-2 border-white shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all"
                 >
                    <X className="w-4 h-4" />
                 </button>
              </div>

              <div className="mb-8">
                <h2 className="text-xl font-black text-black uppercase italic italic flex items-center gap-2">
                   <Trophy className="w-6 h-6 text-[#ff6b00]" /> {formData.id ? 'EDITAR_MEDALHA' : 'NOVA_MEDALHA'}
                </h2>
                <div className="h-2 w-20 bg-[#ff6b00] mt-2 border-2 border-black"></div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                 <div className="flex flex-col items-center justify-center">
                    <label className="text-[10px] font-black text-[#8e7164] uppercase tracking-widest mb-4">ÍCONE_PIXEL_ART</label>
                    <div className="w-28 h-28 border-4 border-black bg-white flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all">
                       {formData.icone_url || resolveTrophyImage(formData.instrumento, formData.classe) ? (
                          <img src={formData.icone_url || resolveTrophyImage(formData.instrumento, formData.classe)} alt="Ícone" className="w-full h-full object-contain p-2" />
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
                     <label className="text-[10px] font-black text-black uppercase tracking-widest mb-1 block">INSTRUMENTO / CATEGORIA</label>
                     <select 
                       className="w-full px-4 py-3 bg-white border-4 border-black text-sm font-black uppercase italic italic focus:ring-0 focus:outline-none"
                       value={formData.instrumento}
                       onChange={(e) => setFormData({...formData, instrumento: e.target.value})}
                     >
                       <option value="Teoria Musical">Teoria Musical (Geral)</option>
                       <option value="Cordas (Violão/Guitarra/Baixo)">Cordas (Violão/Guitarra/Baixo)</option>
                       <option value="Teclado / Piano">Teclado / Piano</option>
                       <option value="Bateria">Bateria</option>
                       <option value="Técnica Vocal">Técnica Vocal</option>
                     </select>
                   </div>
                   <div>
                     <label className="text-[10px] font-black text-black uppercase tracking-widest mb-1 block">CLASSE / RARIDADE</label>
                     <select 
                       className="w-full px-4 py-3 bg-white border-4 border-black text-sm font-black uppercase italic italic focus:ring-0 focus:outline-none"
                       value={formData.classe}
                       onChange={(e) => handleClasseChange(e.target.value)}
                     >
                       <option value="Especial">ESPECIAL (250 XP - CUMULATIVO)</option>
                       <option value="Raro">RARO (500 XP)</option>
                       <option value="Epico">ÉPICO (750 XP)</option>
                       <option value="Lendario">LENDÁRIO (1.200 XP)</option>
                       <option value="Supremo">SUPREMO (2.000 XP)</option>
                     </select>
                   </div>
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
                        <label className="text-[10px] font-black text-black uppercase tracking-widest mb-1 block">XP_RECOMPENSA</label>
                        <input 
                          type="number"
                          required
                          readOnly
                          className="w-full px-4 py-3 bg-[#f3ebe8] border-4 border-black text-sm font-black uppercase italic italic focus:ring-0 focus:outline-none cursor-not-allowed"
                          value={formData.pontos}
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
                   <Save className="w-5 h-5" /> {formData.id ? 'SALVAR_ALTERAÇÕES' : 'SALVAR_CONQUISTA'}
                 </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
