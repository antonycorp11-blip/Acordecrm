import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, CheckCircle2, XCircle, Clock, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AreaProfessor() {
  const [aulasHoje, setAulasHoje] = useState<any[]>([]);
  const [remuneracao, setRemuneracao] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Simulating logged in professor ID for demonstration (would come from auth)
  const professorId = 1; 

  const fetchData = async () => {
    setLoading(true);
    try {
      // Mocking fetch or using existing endpoints 
      // For a real app, you would fetch /api/professores/me/aulas?data=hoje
      const res = await fetch('/api/agenda');
      if (res.ok) {
        const agenda = await res.json();
        const hoje = format(new Date(), 'yyyy-MM-dd');
        const filtradas = agenda.filter((a: any) => a.professor_id === professorId && a.data === hoje);
        setAulasHoje(filtradas);
      }

      const mesAtual = `${(new Date().getMonth() + 1).toString().padStart(2, '0')}/${new Date().getFullYear()}`;
      const remRes = await fetch(`/api/financeiro/remuneracao?mes_ano=${mesAtual}`);
      if (remRes.ok) {
        const rem = await remRes.json();
        const minhaRem = rem.find((r: any) => r.professor_id === professorId);
        setRemuneracao(minhaRem);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePresenca = async (originalId: number, type: string, status: string) => {
    await fetch(`/api/aulas/${originalId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, type })
    });
    fetchData();
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 overflow-hidden font-sans pb-20">
      {/* Header Mobile PWA */}
      <header className="bg-slate-900 text-white p-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center font-black text-xl shadow-inner">
            P
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-tight">Olá, Professor(a)</h1>
            <p className="text-sm font-medium text-slate-400">{format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
          </div>
        </div>
        
        <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md border border-white/5 flex items-center justify-between">
           <div>
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Ganhos do Mês</p>
             <h2 className="text-2xl font-black text-emerald-400">
               R$ {remuneracao?.valor_estimado ? remuneracao.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
             </h2>
           </div>
           <DollarSign className="w-8 h-8 text-white/20" />
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 flex-1 space-y-6">
        <div className="flex items-center justify-between">
           <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
             <Calendar className="w-5 h-5 text-primary" /> Aulas de Hoje
           </h2>
           <span className="bg-slate-200 text-slate-600 px-2 py-1 rounded-lg text-xs font-bold">{aulasHoje.length}</span>
        </div>

        {loading ? (
          <div className="text-center py-10 text-slate-400 font-bold">Carregando...</div>
        ) : aulasHoje.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl text-center shadow-sm border border-slate-100">
            <CheckCircle2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-bold text-sm">Você não tem aulas marcadas para hoje.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {aulasHoje.map(aula => (
              <div key={aula.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group">
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${aula.status === 'presente' ? 'bg-emerald-500' : aula.status === 'ausente' ? 'bg-red-500' : 'bg-orange-400'}`}></div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-black text-slate-900 leading-tight">{aula.nome}</h3>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">{aula.curso_nome}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-xs font-black">{aula.horario}</span>
                  </div>
                </div>

                {aula.status === 'pendente' ? (
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button 
                      onClick={() => handlePresenca(aula.originalId, aula.type, 'presente')}
                      className="bg-emerald-50 text-emerald-600 border border-emerald-100 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Presença
                    </button>
                    <button 
                      onClick={() => handlePresenca(aula.originalId, aula.type, 'ausente')}
                      className="bg-red-50 text-red-600 border border-red-100 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" /> Falta
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl">
                    {aula.status === 'presente' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                    <span className="text-xs font-bold text-slate-600 uppercase">Status: {aula.status}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
