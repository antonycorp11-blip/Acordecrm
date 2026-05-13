import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  Clock,
  ChevronRight,
  Trophy,
  Plus
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  color: string;
}

function StatCard({ label, value, icon: Icon, trend, color }: StatCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <div className={cn("p-3 rounded-xl shadow-lg shadow-black/5", color)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend && (
          <span className="text-[10px] font-black text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-lg uppercase tracking-wider">
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</p>
        <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{value}</h3>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(res => {
        if (!res.ok) throw new Error('Erro ao carregar dados do servidor');
        return res.json();
      })
      .then(data => setStats(data))
      .catch(err => {
        console.error(err);
        setError(err.message);
        // Fallback stats to avoid infinite loading if server has issues
        setStats({
          totalAlunos: 0,
          aulasHoje: 0,
          receitaMensal: 0,
          proximasAulas: []
        });
      });
  }, []);

  if (error && !stats) return <div className="p-8 text-red-500 font-bold">Erro: {error}</div>;
  if (!stats) return <div className="p-8 flex items-center gap-3"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div> Carregando...</div>;

  return (
    <div className="flex flex-col flex-1 animate-in fade-in duration-500">
      <header className="h-24 px-8 frosted-bg border-b border-slate-200/50 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Painel Geral</h1>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">Studio Acorde Gestão</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm ring-2 ring-slate-100/50"></div>
          <button className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/30 text-sm active:scale-95 transition-all flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nova Matrícula
          </button>
        </div>
      </header>

      <div className="p-8 space-y-8 flex-1 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            label="Alunos Ativos" 
            value={stats.totalAlunos} 
            icon={Users} 
            trend="+12%" 
            color="bg-blue-500"
          />
          <StatCard 
            label="Aulas Hoje" 
            value={stats.aulasHoje} 
            icon={Calendar} 
            color="bg-orange-500"
          />
          <StatCard 
            label="Receita do Mês" 
            value={`R$ ${stats.receitaMensal.toLocaleString('pt-BR')}`} 
            icon={DollarSign} 
            trend="+5%" 
            color="bg-emerald-500"
          />
          <StatCard 
            label="Inadimplência" 
            value="4%" 
            icon={TrendingUp} 
            color="bg-red-500"
          />
        </div>

        <div className="flex flex-col gap-8">
          <div className="glass-card overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200/50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Agenda de Hoje</h2>
              <button className="text-sm font-bold text-primary flex items-center gap-1 hover:underline">
                Ver agenda completa <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {stats.proximasAulas.length > 0 ? stats.proximasAulas.map((aula: any) => (
                <div key={aula.id} className="flex items-center gap-4 p-4 bg-white/40 border border-slate-100 rounded-2xl hover:bg-white/60 transition-all relative overflow-hidden group">
                  <div className="w-1 h-12 bg-primary absolute left-0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-16 flex flex-col items-center justify-center font-bold text-slate-900">
                    <span className="text-[10px] uppercase text-slate-400">Hoje</span>
                    <span className="text-lg">{aula.horario}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 line-clamp-1">{aula.aluno_nome}</p>
                    <p className="text-xs text-slate-500 italic">{aula.professor_nome} • Individual</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {aula.type === 'experimental' ? (
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-blue-600 text-white uppercase tracking-wider">
                        Experimental
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-orange-500 text-white uppercase tracking-wider">
                        Confirmada
                      </span>
                    )}
                  </div>
                </div>
              )) : (
                <div className="p-12 text-center text-slate-400 font-medium">
                  Nenhuma aula agendada para hoje.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
