import React, { useEffect, useState } from 'react';


interface FeedAtividade {
  id: number;
  mensagem: string;
  tipo: string;
  icone: string;
  created_at: string;
  aluno_id?: number;
}

interface FeedProps {
  atividades: FeedAtividade[];
  loading: boolean;
}

export const FeedAtividades: React.FC<FeedProps> = ({ atividades, loading }) => {
  if (loading) {
    return <div className="animate-pulse text-[#00ffcc] text-xs">CARREGANDO FEED DA NETWORK...</div>;
  }

  if (atividades.length === 0) {
    return <div className="text-gray-500 text-xs uppercase">Nenhuma atividade registrada na rede.</div>;
  }

  return (
    <div className="space-y-3">
      {atividades.map((atividade) => (
        <div key={atividade.id} className="flex items-start gap-3 bg-gray-900/50 p-3 border border-gray-800 rounded-sm">
          <div className="text-xl">{atividade.icone || '🔔'}</div>
          <div>
            <p className="text-xs text-gray-300">
              <span className="font-bold text-[#00ffcc]">[{atividade.tipo.toUpperCase()}]</span> {atividade.mensagem}
            </p>
            <span className="text-[10px] text-gray-500">
              {new Date(atividade.created_at).toLocaleString('pt-BR')}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
