import React, { useEffect, useState } from 'react';
import { Calendar, Clock, RefreshCcw, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function Reposicoes() {
  const navigate = useNavigate();
  const [reposicoes, setReposicoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReposicoes = async () => {
    try {
      const token = localStorage.getItem('acorde_token');
      const res = await fetch('/api/agenda?status=reposicao', { 
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Filtrar apenas aulas com status = 'reposicao'
        const apenasReposicoes = data.filter((a: any) => a.status === 'reposicao' || a.status === 'a_repor' || a.tipo === 'reposicao');
        setReposicoes(apenasReposicoes);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReposicoes();
  }, []);

  return (
    <div className="p-8 font-['Space_Mono'] h-full flex flex-col bg-[#fff8f6]">
      <div className="flex items-center gap-4 mb-8 border-b-4 border-black pb-4">
        <div className="bg-[#ff6b00] p-4 border-4 border-black shadow-[4px_4px_0_#000]">
          <RefreshCcw className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black uppercase text-black">Fila de Reposições</h1>
          <p className="text-[#8e7164] font-bold text-sm uppercase">Alunos aguardando reagendamento de aulas canceladas</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <p className="text-center font-bold">CARREGANDO FILA...</p>
        ) : reposicoes.length === 0 ? (
          <div className="text-center p-12 border-4 border-dashed border-[#8e7164]/30">
            <p className="text-2xl font-black text-[#8e7164] uppercase">NENHUMA REPOSIÇÃO PENDENTE</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reposicoes.map(aula => (
              <div key={aula.id} className="bg-white border-4 border-black shadow-[8px_8px_0_#000] p-6 flex flex-col gap-4 text-black">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-black text-white font-black flex items-center justify-center text-xl shrink-0">
                    {(aula.aluno_nome || 'A')[0]}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-lg uppercase truncate text-black">{aula.aluno_nome || 'Aluno'}</h3>
                    <p className="text-xs font-bold text-[#8e7164] uppercase flex items-center gap-1">
                      <User className="w-3 h-3 text-[#8e7164]" /> <span className="text-[#8e7164]">Prof. {aula.professor_nome || '?'}</span>
                    </p>
                  </div>
                </div>

                <div className="bg-[#f4f4f5] p-3 border-2 border-black text-black">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-[#ff6b00]" />
                    <span className="text-xs font-black uppercase text-black">Data Original:</span>
                    <span className="text-xs font-bold text-black">{aula.data_original ? aula.data_original.split('-').reverse().join('/') : (aula.data ? aula.data.split('-').reverse().join('/') : 'Desconhecida')}</span>
                  </div>
                  {aula.motivo_cancelamento && (
                    <div className="pt-2 border-t-2 border-black/10 mt-2">
                      <span className="text-[10px] font-black uppercase text-[#8e7164] block mb-1">Motivo / Observação:</span>
                      <p className="text-xs font-bold text-black italic">"{aula.motivo_cancelamento}"</p>
                    </div>
                  )}
                </div>

                <div className="border-t-4 border-dashed border-[#ff6b00]/20 pt-4 mt-auto">
                  <p className="text-xs font-black uppercase text-[#ff6b00] mb-2">Aguardando reagendamento</p>
                  <button 
                    onClick={() => navigate('/agenda', { state: { rescheduleAula: aula } })}
                    className="w-full py-3 bg-[#ff6b00] text-white font-black uppercase border-4 border-black shadow-[4px_4px_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_#000] active:translate-y-1 active:shadow-none transition-all"
                  >
                    Agendar Horário
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
