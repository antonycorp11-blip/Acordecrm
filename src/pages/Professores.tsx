import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  MoreVertical,
  Mail,
  Phone,
  Briefcase,
  X,
  Save,
  Trash2,
  CalendarDays,
  Music
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DisponibilidadeModal } from './DisponibilidadeModal';

export default function Professores() {
  const [professores, setProfessores] = useState<any[]>([]);
  const [cursos, setCursos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    especialidades: [] as string[],
    instrumentos: '',
    cor_agenda: '#f97316',
    status: 'ativo'
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  const [dispModalOpen, setDispModalOpen] = useState(false);
  const [selectedProfForDisp, setSelectedProfForDisp] = useState<any>(null);

  const fetchData = async () => {
    const token = localStorage.getItem('acorde_token');
    const headers = { 'Authorization': `Bearer ${token}` };
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        fetch('/api/professores', { headers }),
        fetch('/api/cursos', { headers })
      ]);
      const pData = pRes.ok ? await pRes.json() : [];
      const cData = cRes.ok ? await cRes.json() : [];
      setProfessores(Array.isArray(pData) ? pData : []);
      setCursos(Array.isArray(cData) ? cData : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('acorde_token');
    const method = editingId ? 'PATCH' : 'POST';
    const url = editingId ? `/api/professores/${editingId}` : '/api/professores';
    
    const res = await fetch(url, {
      method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData),
    });
    if (res.ok) {
      setIsModalOpen(false);
      fetchData();
      setFormData({ nome: '', email: '', telefone: '', especialidades: [], instrumentos: '', cor_agenda: '#f97316', status: 'ativo' });
      setEditingId(null);
    }
  };

  const handleEdit = (p: any) => {
    setFormData({
      nome: p.nome || '',
      email: p.email || '',
      telefone: p.telefone || '',
      especialidades: p.especialidades ? p.especialidades.split(',').map((e: string) => e.trim()).filter(Boolean) : [],
      instrumentos: p.instrumentos || '',
      cor_agenda: p.cor_agenda || '#f97316',
      status: p.status || 'ativo'
    });
    setEditingId(p.id);
    setIsModalOpen(true);
  };

  const toggleEspecialidade = (nome: string) => {
    setFormData(prev => {
      const exists = prev.especialidades.includes(nome);
      if (exists) {
        return { ...prev, especialidades: prev.especialidades.filter(e => e !== nome) };
      } else {
        return { ...prev, especialidades: [...prev.especialidades, nome] };
      }
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este professor? Essa ação não pode ser desfeita.')) return;
    try {
      const token = localStorage.getItem('acorde_token');
      const res = await fetch(`/api/professores/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchData();
      else alert('Erro ao excluir professor.');
    } catch (err) {
      alert('Erro ao conectar com o servidor.');
    }
  };

  const handleSaveDisponibilidade = async (id: number, disp: any) => {
    try {
      const token = localStorage.getItem('acorde_token');
      const res = await fetch(`/api/professores/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ disponibilidade: disp })
      });
      if (res.ok) {
        setDispModalOpen(false);
        fetchData();
      } else {
        alert('Erro ao salvar disponibilidade.');
      }
    } catch (err) {
      alert('Erro de conexão.');
    }
  };

  const filtered = professores.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col flex-1 animate-in fade-in duration-500 bg-[#1a0f0a] h-screen overflow-hidden">
      <header className="h-24 px-8 bg-[#feccba] border-b-4 border-black flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black text-black uppercase italic italic tracking-tighter">Mestres & Professores</h1>
          <p className="text-[10px] font-black text-[#8e7164] uppercase tracking-widest">Gestão do corpo docente e especialidades.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#ff6b00] text-white px-6 py-3 border-4 border-black font-black uppercase text-xs shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" /> NOVO_PROFESSOR
        </button>
      </header>

      <div className="p-8 flex-1 overflow-auto">
        <div className="mb-8 flex items-center gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 w-5 h-5 z-10" />
            <input 
              type="text" 
              placeholder="BUSCAR_PROFESSOR..."
              className="w-full pl-12 pr-4 py-4 bg-[#fff8f6] border-4 border-black font-black text-xs uppercase focus:outline-none shadow-[4px_4px_0_#000] placeholder:text-black/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {loading ? (
            <div className="col-span-full text-center p-20 text-white font-black uppercase italic italic">CARREGANDO_MESTRES...</div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full border-4 border-dashed border-white/10 rounded-xl p-20 text-center flex flex-col items-center justify-center gap-4">
              <Briefcase className="w-12 h-12 text-white/10" />
              <p className="text-white/20 font-black uppercase">NENHUM_PROFESSOR_ENCONTRADO</p>
            </div>
          ) : filtered.map((p) => (
            <motion.div 
              layout
              key={p.id} 
              className="bg-[#fff8f6] border-4 border-black p-6 group shadow-[6px_6px_0_#000] relative overflow-hidden flex flex-col"
            >
              <div className="flex justify-between items-start mb-6">
                <div 
                  className="w-14 h-14 border-4 border-black flex items-center justify-center text-white font-black text-xl shadow-[4px_4px_0_#000]"
                  style={{ backgroundColor: p.cor_agenda || '#ff6b00' }}
                >
                  {p.nome.charAt(0)}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setSelectedProfForDisp(p); setDispModalOpen(true); }}
                    className="p-2 border-2 border-black bg-white shadow-[2px_2px_0_#000] hover:translate-y-[-2px] active:translate-y-0 active:shadow-none transition-all"
                  >
                    <CalendarDays className="w-4 h-4 text-[#ff6b00]" />
                  </button>
                  <button 
                    onClick={() => handleDelete(p.id)}
                    className="p-2 border-2 border-black bg-white shadow-[2px_2px_0_#000] hover:translate-y-[-2px] active:translate-y-0 active:shadow-none transition-all hover:bg-red-50 text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-black text-black uppercase italic italic mb-1 truncate">{p.nome}</h3>
              <p className="text-[9px] font-black text-[#8e7164] uppercase tracking-widest mb-4 truncate">{p.email || 'SEM_EMAIL'}</p>
              
              <div className="flex-1 space-y-4">
                <div>
                   <p className="text-[8px] font-black text-[#8e7164] uppercase tracking-widest mb-1">ESPECIALIDADES</p>
                   <div className="flex flex-wrap gap-1">
                     {p.especialidades?.split(',').filter(Boolean).map((esp: string, i: number) => (
                       <span key={i} className="px-2 py-0.5 bg-[#feccba] text-black border-2 border-black text-[8px] font-black uppercase">
                         {esp.trim()}
                       </span>
                     ))}
                   </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t-2 border-black/5 flex items-center justify-between">
                 <button 
                   onClick={() => handleEdit(p)}
                   className="text-[9px] font-black text-black bg-[#ff6b00] px-3 py-1.5 border-2 border-black shadow-[2px_2px_0_#000] uppercase italic italic hover:translate-y-[-1px] active:translate-y-0 active:shadow-none"
                 >
                   EDITAR_PERFIL
                 </button>
                 <div className="flex gap-1">
                    <span className={`w-2 h-2 border border-black ${p.status === 'ativo' ? 'bg-[#25d366]' : 'bg-black/20'}`}></span>
                 </div>
              </div>
            </motion.div>
          ))}
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
                <h2 className="text-xl font-black text-slate-900">Novo Professor</h2>
                <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nome Completo</label>
                   <input 
                     required
                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                     value={formData.nome}
                     onChange={(e) => setFormData({...formData, nome: e.target.value})}
                   />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">E-mail</label>
                      <input 
                        type="email"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">WhatsApp</label>
                      <input 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                        value={formData.telefone}
                        onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                      />
                    </div>
                 </div>
                 <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Instrumentos que leciona</label>
                   <input 
                     placeholder="Ex: Violão, Teclado, Canto"
                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                     value={formData.instrumentos}
                     onChange={(e) => setFormData({...formData, instrumentos: e.target.value})}
                   />
                 </div>
                 <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Especialidades (Cursos)</label>
                   <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                     {cursos.map(curso => {
                       const isSelected = formData.especialidades.includes(curso.nome);
                       return (
                         <button
                           key={curso.id}
                           type="button"
                           onClick={() => toggleEspecialidade(curso.nome)}
                           className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2 group ${
                             isSelected 
                               ? 'bg-primary/10 border-primary shadow-sm' 
                               : 'bg-white border-slate-200 hover:border-primary/50'
                           }`}
                         >
                           <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                             isSelected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-primary/20'
                           }`}>
                             <Music className="w-4 h-4" />
                           </div>
                           <span className={`text-[11px] font-bold ${isSelected ? 'text-primary' : 'text-slate-600'}`}>
                             {curso.nome}
                           </span>
                         </button>
                       );
                     })}
                   </div>
                   {cursos.length === 0 && (
                     <p className="text-[10px] font-bold text-slate-400 italic">Nenhum curso cadastrado. Cadastre cursos primeiro.</p>
                   )}
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Cor na Agenda</label>
                    <div className="flex items-center gap-3">
                       <input 
                         type="color"
                         className="w-10 h-10 rounded-lg cursor-pointer"
                         value={formData.cor_agenda}
                         onChange={(e) => setFormData({...formData, cor_agenda: e.target.value})}
                       />
                       <span className="text-xs font-bold text-slate-500">{formData.cor_agenda}</span>
                    </div>
                 </div>
                 <button 
                   type="submit"
                   className="w-full bg-primary text-white py-4 rounded-2xl font-black shadow-lg shadow-primary/30 mt-4 active:scale-95 transition-all flex items-center justify-center gap-2"
                 >
                   <Save className="w-5 h-5" /> Salvar Professor
                 </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {dispModalOpen && selectedProfForDisp && (
          <DisponibilidadeModal
            prof={selectedProfForDisp}
            onClose={() => setDispModalOpen(false)}
            onSave={handleSaveDisponibilidade}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
