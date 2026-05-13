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
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        fetch('/api/professores'),
        fetch('/api/cursos')
      ]);
      const pData = await pRes.json();
      const cData = await cRes.json();
      setProfessores(pData);
      setCursos(cData);
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
    const payload = {
      ...formData,
      especialidades: formData.especialidades.join(', ')
    };

    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/professores/${editingId}` : '/api/professores';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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
      const res = await fetch(`/api/professores/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
      else alert('Erro ao excluir professor.');
    } catch (err) {
      alert('Erro ao conectar com o servidor.');
    }
  };

  const handleSaveDisponibilidade = async (id: number, disp: any) => {
    try {
      const res = await fetch(`/api/professores/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
    <div className="flex flex-col flex-1 animate-in fade-in duration-500">
      <header className="h-24 px-8 frosted-bg border-b border-slate-200/50 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Professores</h1>
          <p className="text-sm font-medium text-slate-500">Gestão do corpo docente e especialidades.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/30 text-sm active:scale-95 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Novo Professor
          </button>
        </div>
      </header>

      <div className="p-8 flex-1 overflow-auto">
        <div className="glass-card overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200/50 bg-white/40 flex items-center gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 transition-colors group-focus-within:text-primary" />
              <input 
                type="text" 
                placeholder="Buscar por nome ou especialidade..."
                className="w-full pl-10 pr-4 py-2 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/30 border-b border-slate-100/50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Professor</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Especialidades</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Instrumentos</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50">
                {error ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-red-500 font-bold">Erro: {error}</td>
                  </tr>
                ) : loading ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 font-medium">Carregando professores...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-20 text-center flex flex-col items-center justify-center gap-4">
                        <div className="bg-slate-100/50 p-6 rounded-full">
                          <Briefcase className="w-10 h-10 text-slate-300" />
                        </div>
                        <p className="text-slate-400 font-bold">Nenhum professor encontrado.</p>
                    </td>
                  </tr>
                ) : filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-white/40 transition-all group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black shadow-sm"
                          style={{ backgroundColor: p.cor_agenda || '#f97316' }}
                        >
                          {p.nome.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-primary transition-colors">{p.nome}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{p.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex flex-wrap gap-1">
                         {p.especialidades?.split(',').filter(Boolean).map((esp: string, i: number) => (
                           <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                             {esp.trim()}
                           </span>
                         ))}
                       </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-slate-600">{p.instrumentos || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                        p.status === 'ativo' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button 
                        onClick={() => { setSelectedProfForDisp(p); setDispModalOpen(true); }} 
                        className="p-2 text-slate-300 hover:text-primary hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-100"
                        title="Disponibilidade"
                      >
                        <CalendarDays className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleEdit(p)} className="p-2 text-slate-300 hover:text-primary hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-100" title="Editar">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-100" title="Excluir">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
