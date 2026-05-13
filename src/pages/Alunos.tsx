import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  MoreVertical,
  Mail,
  Phone,
  Trash2,
  RefreshCcw,
  UserPlus
} from 'lucide-react';
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
    const token = localStorage.getItem('acorde_token');
    setLoading(true);
    const endpoint = statusFilter === 'ativos' ? '/api/alunos' : '/api/alunos?status=arquivado';
    fetch(endpoint, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
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
    <div className="flex flex-col flex-1 h-screen overflow-hidden" style={{ background: '#1a0f0a', fontFamily: "'Space Mono', monospace" }}>
      
      {/* HEADER */}
      <header className="h-20 px-8 border-b-4 border-[#3d2d26] flex items-center justify-between shrink-0" style={{ background: '#1a0f0a' }}>
        <div>
          <h1 className="text-xl font-black text-white tracking-widest uppercase flex items-center gap-2">
            <Users className="w-6 h-6 text-[#ff6b00]" />
            ALUNOS
          </h1>
          <p className="text-[10px] font-black text-[#8e7164] uppercase tracking-tighter">Gerenciamento de membros da escola</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-[#261812] border-2 border-[#5a4136] p-1 rounded shadow-[4px_4px_0_#000]">
             <button 
               onClick={() => setStatusFilter('ativos')}
               className={`px-4 py-1.5 rounded text-[10px] font-black uppercase transition-all ${statusFilter === 'ativos' ? 'bg-[#ff6b00] text-white shadow-[2px_2px_0_#000]' : 'text-[#8e7164] hover:text-white'}`}
             >
               Ativos
             </button>
             <button 
               onClick={() => setStatusFilter('arquivados')}
               className={`px-4 py-1.5 rounded text-[10px] font-black uppercase transition-all ${statusFilter === 'arquivados' ? 'bg-[#ff6b00] text-white shadow-[2px_2px_0_#000]' : 'text-[#8e7164] hover:text-white'}`}
             >
               Arquivados
             </button>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#ff6b00] text-white px-6 py-2.5 rounded font-black text-xs uppercase shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all flex items-center gap-2 border-2 border-black"
          >
            <Plus className="w-4 h-4" /> Novo Aluno
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <div className="p-6 flex-1 overflow-auto bg-[#1a0f0a]">
        <div className="rounded-lg overflow-hidden flex flex-col border-4 border-[#261812] shadow-[8px_8px_0_#000]" style={{ background: '#ffeae1' }}>
          
          {/* SEARCH & FILTERS */}
          <div className="p-4 border-b-4 border-[#261812] bg-[#feccba] flex items-center gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7b5647] w-5 h-5" />
              <input 
                type="text" 
                placeholder="BUSCAR POR NOME OU E-MAIL..."
                className="w-full pl-10 pr-4 py-3 bg-white border-4 border-black rounded font-black text-xs uppercase placeholder:text-[#7b5647]/50 focus:outline-none focus:bg-[#fff8f6] transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="px-6 py-3 text-xs font-black text-white bg-[#261812] border-2 border-black rounded shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all uppercase">
              Filtros
            </button>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ borderCollapse: 'separate', borderSpacing: '0' }}>
              <thead className="bg-[#feccba] border-b-4 border-[#261812]">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-[#261812] uppercase tracking-widest border-b-4 border-[#261812]">Aluno</th>
                  <th className="px-6 py-4 text-[10px] font-black text-[#261812] uppercase tracking-widest border-b-4 border-[#261812]">Contato</th>
                  <th className="px-6 py-4 text-[10px] font-black text-[#261812] uppercase tracking-widest border-b-4 border-[#261812]">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-[#261812] uppercase tracking-widest border-b-4 border-[#261812]">Saldo</th>
                  <th className="px-6 py-4 text-[10px] font-black text-[#261812] uppercase tracking-widest border-b-4 border-[#261812] text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-[#e2bfb0]">
                {error ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-red-600 font-black uppercase text-sm">Erro ao carregar dados</td>
                  </tr>
                ) : loading ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-[#7b5647] font-black uppercase text-xs animate-pulse">Carregando membros...</td>
                  </tr>
                ) : filteredAlunos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-20 text-center">
                        <div className="bg-[#feccba] p-8 rounded-lg border-4 border-dashed border-[#7b5647] inline-block">
                          <Users className="w-12 h-12 text-[#7b5647] mx-auto mb-4 opacity-50" />
                          <p className="text-[#7b5647] font-black uppercase text-xs">Nenhum aluno encontrado</p>
                        </div>
                    </td>
                  </tr>
                ) : filteredAlunos.map((aluno) => (
                  <tr key={aluno.id} className="hover:bg-[#fff8f6] transition-all group cursor-pointer" onClick={() => navigate(`/alunos/${aluno.id}`)}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded bg-[#ff6b00] border-2 border-black flex items-center justify-center text-white font-black text-xl shadow-[3px_3px_0_#000]">
                          {(aluno.nome || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-sm text-[#261812] uppercase group-hover:text-[#ff6b00] transition-colors tracking-tight">{aluno.nome || 'SEM NOME'}</p>
                          <p className="text-[9px] text-[#7b5647] font-black uppercase tracking-tighter">CADASTRO EM {new Date(aluno.data_cadastro).getFullYear()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[10px] font-black text-[#261812] uppercase">
                          <Mail className="w-3.5 h-3.5 text-[#ff6b00]" />
                          <span className="truncate max-w-[150px]">{aluno.email || '---'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black text-[#261812] uppercase">
                          <Phone className="w-3.5 h-3.5 text-[#ff6b00]" />
                          {aluno.telefone || '---'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-4 py-1.5 rounded text-[9px] font-black uppercase border-2 border-black shadow-[2px_2px_0_#000] ${
                        aluno.status === 'ativo' ? 'bg-[#ff6b00] text-white' : 
                        'bg-[#8e7164] text-white'
                      }`}>
                        {aluno.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      {aluno.aulas_restantes > 0 ? (
                        <span className="bg-white text-[#261812] px-3 py-1 rounded border-2 border-black text-[10px] font-black uppercase shadow-[2px_2px_0_#000]">
                           {aluno.aulas_restantes} AULAS
                        </span>
                      ) : (
                        <span className="text-[#7b5647] text-[10px] font-black uppercase opacity-50 italic">ESGOTADO</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-3" onClick={e => e.stopPropagation()}>
                        {aluno.status === 'arquivado' ? (
                          <button 
                            onClick={() => {
                              const token = localStorage.getItem('acorde_token');
                              fetch(`/api/alunos/${aluno.id}`, { 
                                method: 'PATCH', 
                                headers: { 
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({ status: 'ativo' })
                              }).then(() => fetchAlunos());
                            }}
                            className="bg-white p-2 border-2 border-black rounded shadow-[2px_2px_0_#000] hover:bg-emerald-500 hover:text-white transition-all group/btn"
                          >
                            <RefreshCcw className="w-4 h-4" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => {
                              if (confirm(`Deseja realmente arquivar o aluno ${aluno.nome}?`)) {
                                const token = localStorage.getItem('acorde_token');
                                fetch(`/api/alunos/${aluno.id}`, { 
                                  method: 'DELETE',
                                  headers: { 'Authorization': `Bearer ${token}` }
                                }).then(() => fetchAlunos());
                              }
                            }}
                            className="bg-white p-2 border-2 border-black rounded shadow-[2px_2px_0_#000] hover:bg-red-500 hover:text-white transition-all"
                            title="Arquivar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => navigate(`/alunos/${aluno.id}`)}
                          className="bg-[#261812] text-white p-2 border-2 border-black rounded shadow-[2px_2px_0_#000] hover:bg-[#ff6b00] transition-all"
                        >
                          <MoreVertical className="w-4 h-4" />
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
