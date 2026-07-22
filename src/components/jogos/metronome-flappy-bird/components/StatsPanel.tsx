/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RefreshCw, TrendingUp, Sparkles, Award, Zap } from 'lucide-react';
import { UserStats } from '../types';
import { soundEngine } from '../soundEngine';

interface StatsPanelProps {
  stats: UserStats;
  onResetStats: () => void;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ stats, onResetStats }) => {
  const totalHits = stats.perfectHits + stats.goodHits;
  const totalTaps = stats.totalTaps || (stats.perfectHits + stats.goodHits + stats.misses);
  const hitRate = totalTaps > 0 ? Math.round((totalHits / totalTaps) * 100) : 0;
  const perfectPercent = totalTaps > 0 ? Math.round((stats.perfectHits / totalTaps) * 100) : 0;
  const goodPercent = totalTaps > 0 ? Math.round((stats.goodHits / totalTaps) * 100) : 0;
  const missPercent = totalTaps > 0 ? Math.round((stats.misses / totalTaps) * 100) : 0;

  // Rhythmical diagnostic feedback
  let feedbackTitle = "Sem dados";
  let feedbackText = "Faça algumas jogadas ou treine no metrônomo livre para gerar seu diagnóstico de ritmo!";
  let tendency: 'RUSHING' | 'DRAGGING' | 'BALANCED' | 'NONE' = 'NONE';

  if (totalTaps > 5) {
    if (hitRate >= 75) {
      feedbackTitle = "TEMPO EXCELENTE!";
      feedbackText = "Seu senso rítmico é formidável! Você consegue se manter estável mesmo com o metrônomo mudando de velocidade.";
      tendency = 'BALANCED';
    } else if (stats.perfectHits > stats.goodHits && hitRate >= 60) {
      feedbackTitle = "MUITO PRECISO!";
      feedbackText = "Sua precisão máxima é ótima. Tente manter a constância para estender seus combos.";
      tendency = 'BALANCED';
    } else {
      // We don't track early vs late counts in global persistent stats directly, 
      // but we can estimate or give general music advice. Let's make an interactive visual indicator!
      feedbackTitle = "RITMO EM EVOLUÇÃO";
      feedbackText = "Lembre-se de ouvir o clique e sentir o pulso antes de clicar. A prática constante vai calibrar seus reflexos.";
      tendency = 'RUSHING'; // Default helpful advisory
    }
  }

  return (
    <div className="flex-1 flex flex-col p-5 bg-[#121212] overflow-y-auto">
      <div className="mb-4">
        <h2 className="font-mono text-sm font-black text-white uppercase tracking-wider mb-1">
          DIAGNÓSTICO RÍTMICO
        </h2>
        <p className="font-mono text-[10px] text-gray-500">
          Veja a análise de precisão musical dos seus toques e cliques.
        </p>
      </div>

      {/* Main Score Card */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-[#FFFDF9] border-4 border-black rounded-xl p-3 shadow-[4px_4px_0px_#000]">
          <span className="font-mono text-[9px] text-gray-500 uppercase block font-bold">Taxa de Acerto</span>
          <span className="font-mono text-xl font-black text-[#FF5F00]">{hitRate}%</span>
        </div>
        <div className="bg-[#FFFDF9] border-4 border-black rounded-xl p-3 shadow-[4px_4px_0px_#000]">
          <span className="font-mono text-[9px] text-gray-500 uppercase block font-bold">Maior Combo</span>
          <span className="font-mono text-xl font-black text-black">{stats.longestCombo}</span>
        </div>
      </div>

      {/* Rhythmic Diagnostics Feedback */}
      <div className="bg-[#1a1a1a] border-4 border-black rounded-xl p-3.5 mb-4 shadow-[4px_4px_0px_#000]">
        <div className="flex items-center gap-1.5 mb-1">
          <Sparkles size={14} className="text-[#FF5F00] animate-bounce" />
          <span className="font-mono text-xs font-black text-[#FF5F00] uppercase">
            {feedbackTitle}
          </span>
        </div>
        <p className="font-mono text-[10px] text-gray-300 leading-normal">
          {feedbackText}
        </p>
      </div>

      {/* Timing Distribution Bar */}
      <div className="bg-[#FFFDF9] border-4 border-black rounded-xl p-4 mb-4 shadow-[4px_4px_0px_#000]">
        <span className="font-mono text-[10px] text-black font-black uppercase mb-3 block">
          Distribuição das Batidas
        </span>

        {totalTaps === 0 ? (
          <div className="font-mono text-[10px] text-gray-400 text-center py-4 uppercase">
            Nenhuma batida registrada
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {/* Horizontal Stacked Bar */}
            <div className="h-6 w-full bg-gray-200 rounded border-2 border-black flex overflow-hidden">
              <div 
                className="bg-emerald-500 h-full transition-all duration-500" 
                style={{ width: `${perfectPercent}%` }}
                title={`Perfeito: ${stats.perfectHits}`}
              ></div>
              <div 
                className="bg-cyan-400 h-full transition-all duration-500" 
                style={{ width: `${goodPercent}%` }}
                title={`Bom: ${stats.goodHits}`}
              ></div>
              <div 
                className="bg-rose-500 h-full transition-all duration-500" 
                style={{ width: `${missPercent}%` }}
                title={`Erros: ${stats.misses}`}
              ></div>
            </div>

            {/* Labels and values */}
            <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono text-[9px]">
              <div className="flex flex-col">
                <span className="text-emerald-600 font-bold">PERFEITO ({perfectPercent}%)</span>
                <span className="text-gray-500">{stats.perfectHits} toques</span>
              </div>
              <div className="flex flex-col">
                <span className="text-cyan-600 font-bold">BOM ({goodPercent}%)</span>
                <span className="text-gray-500">{stats.goodHits} toques</span>
              </div>
              <div className="flex flex-col">
                <span className="text-rose-600 font-bold">ERROS ({missPercent}%)</span>
                <span className="text-gray-500">{stats.misses} toques</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Total statistics ledger */}
      <div className="bg-[#1e1e1e] border-4 border-black rounded-xl p-3.5 mb-4 text-white">
        <h4 className="font-mono text-[9px] font-black uppercase text-[#FF5F00] tracking-wider mb-2 pb-1 border-b border-gray-800">
          HISTÓRICO ACUMULADO
        </h4>
        <div className="flex flex-col gap-1.5 font-mono text-[10px]">
          <div className="flex justify-between">
            <span className="text-gray-400">Total de Tentativas</span>
            <span className="font-bold">{stats.totalAttempts}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Total de Batidas Registradas</span>
            <span className="font-bold">{totalTaps}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Estágio de Lições Desbloqueado</span>
            <span className="font-bold text-[#FF5F00]">{stats.unlockedStage}/5</span>
          </div>
        </div>
      </div>

      {/* Reset stats buttons */}
      <div className="mt-auto">
        <button
          onClick={() => {
            if (confirm("Deseja mesmo redefinir todas as estatísticas de ritmo?")) {
              soundEngine.playMiss();
              onResetStats();
            }
          }}
          className="w-full h-10 border-2 border-dashed border-red-500 hover:border-red-600 text-red-500 hover:text-red-600 rounded-lg flex items-center justify-center gap-2 font-mono text-[10px] font-bold uppercase transition-colors cursor-pointer"
        >
          <RefreshCw size={12} />
          <span>LIMPAR ESTATÍSTICAS</span>
        </button>
      </div>
    </div>
  );
};
