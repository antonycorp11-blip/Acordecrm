import React, { useEffect, useState } from 'react';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Music, 
  DollarSign,
  Clock,
  MoreVertical,
  X,
  Save,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Cursos() {
  const [cursos, setCursos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ nome: '', descricao: '', valor_base: '' });

  const fetchCursos = () => {
    setLoading(true);
    fetch('/api/cursos')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setCursos(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setCursos([]);
        setLoading(false);
      });
  };

  const handleDelete = async (id: number, nome: string) => {
    if (confirm(`Deseja realmente excluir o curso ${nome}? Isso pode afetar alunos matriculados.`)) {
      const res = await fetch(`/api/cursos/${id}`, { method: 'DELETE' });
      if (res.ok) fetchCursos();
    }
  };

  useEffect(() => {
    fetchCursos();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/cursos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (res.ok) {
      setIsModalOpen(false);
      fetchCursos();
      setFormData({ nome: '', descricao: '', valor_base: '' });
    }
  };

  return (
    <div className="flex flex-col flex-1 animate-in fade-in duration-500">
      <header className="h-24 px-8 frosted-bg border-b border-slate-200/50 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cursos & Pacotes</h1>
          <p className="text-sm font-medium text-slate-500">Configure as modalidades e valores da escola.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/30 text-sm active:scale-95 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Novo Curso
          </button>
        </div>
      </header>

      <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1 overflow-auto">
        {loading ? (
          <div className="col-span-full text-center p-20 text-slate-400 font-bold">Carregando cursos...</div>
        ) : cursos.map((curso) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            key={curso.id} 
            className="glass-card p-6 flex flex-col group hover:border-primary/50 transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="bg-orange-100 p-3 rounded-2xl text-orange-600 group-hover:bg-primary group-hover:text-white transition-all">
                <Music className="w-6 h-6" />
              </div>
              <button 
                onClick={() => handleDelete(curso.id, curso.nome)}
                className="text-slate-300 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">{curso.nome}</h3>
            <p className="text-xs text-slate-500 font-medium flex-1 line-clamp-2">{curso.descricao}</p>
            
            <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
               <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Base</span>
                  <span className="text-lg font-black text-slate-900">R$ {curso.valor_base?.toFixed(2).replace('.', ',')}</span>
               </div>
               <div className="bg-slate-50 px-3 py-1 rounded-lg flex items-center gap-2 text-[10px] font-bold text-slate-500 border border-slate-100">
                  <Clock className="w-3 h-3" /> 50 min
               </div>
            </div>
          </motion.div>
        ))}

        {cursos.length === 0 && !loading && (
          <div className="col-span-full border-2 border-dashed border-slate-200 rounded-3xl p-20 text-center">
             <Music className="w-12 h-12 text-slate-300 mx-auto mb-4" />
             <p className="text-slate-500 font-bold">Nenhum curso cadastrado ainda.</p>
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
                <h2 className="text-xl font-black text-slate-900">Novo Curso</h2>
                <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nome do Instrumento/Curso</label>
                   <input 
                     required
                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium"
                     placeholder="Ex: Piano Clássico, Guitarra Rock"
                     value={formData.nome}
                     onChange={(e) => setFormData({...formData, nome: e.target.value})}
                   />
                 </div>
                 <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Descrição Curta</label>
                   <textarea 
                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium min-h-[100px]"
                     placeholder="Sobre o que é o curso..."
                     value={formData.descricao}
                     onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                   />
                 </div>
                 <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Valor Base da Mensalidade</label>
                   <div className="relative">
                     <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                     <input 
                       required
                       type="number"
                       className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium"
                       placeholder="0,00"
                       value={formData.valor_base}
                       onChange={(e) => setFormData({...formData, valor_base: e.target.value})}
                     />
                   </div>
                 </div>
                 <button 
                   type="submit"
                   className="w-full bg-primary text-white py-4 rounded-2xl font-black shadow-lg shadow-primary/30 mt-4 active:scale-95 transition-all flex items-center justify-center gap-2"
                 >
                   <Save className="w-5 h-5" /> Salvar Curso
                 </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
