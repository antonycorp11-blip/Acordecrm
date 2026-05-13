import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  MoreVertical,
  Mail,
  Phone,
  UserPlus,
  Trash2,
  RefreshCcw
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { AlunoModal } from '../components/alunos/AlunoModal';

export default function Alunos() {
  const navigate = useNavigate();
  const [alunos, setAlunos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ativos' | 'arquivados'>('ativos');
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchAlunos = () => {
    setLoading(true);
    const endpoint = statusFilter === 'ativos' ? '/api/alunos' : '/api/alunos?status=arquivado';
    fetch(endpoint)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setAlunos(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAlunos();
  }, [statusFilter]);

  const filteredAlunos = alunos.filter(aluno => 
    (aluno.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (aluno.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col flex-1 animate-in fade-in duration-500">
      <header className="h-24 px-8 frosted-bg border-b border-slate-200/50 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Alunos</h1>
          <p className="text-sm font-medium text-slate-500">Gerencie o cadastro e histórico dos seus alunos.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-xl">
             <button 
               onClick={() => setStatusFilter('ativos')}
               className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${statusFilter === 'ativos' ? 'bg-white shadow-sm text-primary' : 'text-slate-400'}`}
             >
               Ativos
             </button>
             <button 
               onClick={() => setStatusFilter('arquivados')}
               className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${statusFilter === 'arquivados' ? 'bg-white shadow-sm text-primary' : 'text-slate-400'}`}
             >
               Arquivados
             </button>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/30 text-sm active:scale-95 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Novo Aluno
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
                placeholder="Buscar por nome ou e-mail..."
                className="w-full pl-10 pr-4 py-2 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="px-4 py-2 text-sm font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-white transition-all bg-white/50">Filtros</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/30 border-b border-slate-100/50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Aluno</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contato</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Aulas</th>
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
                    <td colSpan={5} className="p-12 text-center text-slate-400 font-medium">Carregando alunos...</td>
                  </tr>
                ) : filteredAlunos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-20 text-center flex flex-col items-center justify-center gap-4">
                        <div className="bg-slate-100/50 p-6 rounded-full">
                          <Users className="w-10 h-10 text-slate-300" />
                        </div>
                        <p className="text-slate-400 font-bold">Nenhum aluno encontrado.</p>
                    </td>
                  </tr>
                ) : filteredAlunos.map((aluno) => (
                  <tr key={aluno.id} className="hover:bg-white/40 transition-all group">
                    <td className="px-6 py-4 cursor-pointer" onClick={() => navigate(`/alunos/${aluno.id}`)}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600 font-black shadow-sm shadow-orange-100">
                          {(aluno.nome || '?').charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-primary transition-colors">{aluno.nome || 'Aluno Sem Nome'}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Membro desde {new Date(aluno.data_cadastro).getFullYear()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {aluno.email || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {aluno.telefone || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                        aluno.status === 'ativo' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                        aluno.status === 'arquivado' ? 'bg-slate-100 text-slate-500 border-slate-200' : 
                        aluno.status === 'inativo' ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-red-50 text-red-600 border-red-100'
                      }`}>
                        {aluno.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-black text-slate-700">
                      {aluno.aulas_restantes > 0 ? (
                        <span className="bg-orange-100 text-orange-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-orange-200 shadow-sm shadow-orange-100">
                           {aluno.aulas_restantes} restantes
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs font-bold">Sem aulas</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {aluno.status === 'arquivado' ? (
                          <button 
                            onClick={() => {
                              fetch(`/api/alunos/${aluno.id}`, { 
                                method: 'PATCH', 
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'ativo' })
                              }).then(() => fetchAlunos());
                            }}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all border border-transparent hover:border-emerald-100 flex items-center gap-2 text-[10px] font-bold"
                          >
                            <RefreshCcw className="w-4 h-4" /> Ativar
                          </button>
                        ) : (
                          <button 
                            onClick={() => {
                              if (confirm(`Deseja realmente arquivar o aluno ${aluno.nome}? ele poderá ser recuperado no futuro.`)) {
                                fetch(`/api/alunos/${aluno.id}`, { method: 'DELETE' })
                                  .then(() => fetchAlunos());
                              }
                            }}
                            className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                            title="Arquivar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => navigate(`/alunos/${aluno.id}`)}
                          className="p-2 text-slate-300 hover:text-primary hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-100"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AlunoModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchAlunos} 
      />
    </div>
  );
}
