/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Play, BookOpen, Activity, BarChart2, Info, HelpCircle, ShoppingBag } from 'lucide-react';
import { soundEngine } from '../soundEngine';

interface MainMenuProps {
  onStartEndless: () => void;
  onOpenLessons: () => void;
  onOpenPractice: () => void;
  onOpenStats: () => void;
  onOpenShop: () => void;
  highScore: number;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartEndless,
  onOpenLessons,
  onOpenPractice,
  onOpenStats,
  onOpenShop,
  highScore,
}) => {
  const [bpm, setBpm] = useState(100);
  const [pulse, setPulse] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // Simple visual metronome ticker in the menu to hook player's attention
  useEffect(() => {
    let isActive = true;
    const beatInterval = 60000 / bpm;

    const runTicker = () => {
      if (!isActive) return;
      setPulse(true);
      setTimeout(() => {
        if (isActive) setPulse(false);
      }, 150);

      setTimeout(runTicker, beatInterval);
    };

    const initialTimeout = setTimeout(runTicker, beatInterval);

    return () => {
      isActive = false;
      clearTimeout(initialTimeout);
    };
  }, [bpm]);

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-[#121212] overflow-y-auto">
      {/* Title / Hero */}
      <div className="flex flex-col items-center text-center mt-4">
        {/* Animated Metronome Visualizer Card */}
        <div className="relative w-40 h-40 bg-[#1e1e1e] border-4 border-black rounded-full flex flex-col items-center justify-center shadow-[4px_4px_0px_#000] mb-6 overflow-hidden">
          {/* Swinging Pendulum */}
          <div 
            className={`absolute bottom-6 w-1 h-24 bg-black origin-bottom rounded-full transition-transform duration-200`}
            style={{
              transform: pulse ? 'rotate(25deg)' : 'rotate(-25deg)',
              transitionDuration: `${60000 / bpm / 2}ms`
            }}
          >
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-[#FF5F00] rounded-sm border-2 border-black"></div>
          </div>

          {/* Clean pulse rings */}
          <div 
            className={`absolute inset-4 rounded-full border-4 border-[#FF5F00] opacity-0 pointer-events-none transition-all duration-300 ${
              pulse ? 'scale-110 opacity-70' : 'scale-90 opacity-0'
            }`}
          ></div>

          {/* Heart beat rate */}
          <div className="absolute bottom-3 font-mono text-[10px] font-bold text-[#FF5F00] bg-black px-1.5 py-0.5 rounded border border-gray-800 z-10">
            {bpm} BPM
          </div>
        </div>

        <h1 
          className="font-mono text-2xl tracking-widest font-black uppercase text-white mb-1"
          style={{ textShadow: '3px 3px 0px #000' }}
        >
          METRO<span className="text-[#FF5F00]">BIRD</span>
        </h1>
        <p className="font-mono text-[10px] text-gray-500 uppercase tracking-wider mb-6">
          Flappy Bird + Precisão Rítmica
        </p>
      </div>

      {/* High Score Floating Alert */}
      {highScore > 0 && (
        <div className="bg-[#FFFDF9] border-4 border-black p-2.5 rounded-xl flex items-center justify-between shadow-[4px_4px_0px_#000] mb-4">
          <span className="font-mono text-xs font-bold text-black uppercase">RECORDE ATUAL</span>
          <span className="font-mono text-base font-black text-[#FF5F00]">{highScore} canos</span>
        </div>
      )}

      {/* Menu Actions Grid */}
      <div className="flex flex-col gap-3">
        {/* Endless Mode Action */}
        <button
          onClick={() => {
            soundEngine.init();
            soundEngine.playPerfect();
            onStartEndless();
          }}
          className="w-full h-14 bg-[#FF5F00] hover:bg-[#ff7722] text-white border-4 border-black rounded-xl flex items-center justify-between px-5 font-mono text-sm font-black uppercase shadow-[4px_4px_0px_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
          id="play-endless-btn"
        >
          <div className="flex items-center gap-3">
            <Play size={18} className="stroke-[3px]" />
            <span>MODO INFINITO</span>
          </div>
          <span className="text-xs font-normal opacity-80 font-mono">BPM+</span>
        </button>

        {/* Lessons/Stages Action */}
        <button
          onClick={() => {
            soundEngine.init();
            soundEngine.playGood();
            onOpenLessons();
          }}
          className="w-full h-12 bg-[#FFFDF9] hover:bg-[#eae6de] text-black border-4 border-black rounded-xl flex items-center justify-between px-5 font-mono text-xs font-black uppercase shadow-[4px_4px_0px_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
          id="lessons-btn"
        >
          <div className="flex items-center gap-3">
            <BookOpen size={16} className="stroke-[3px] text-[#FF5F00]" />
            <span>AULAS DE RITMO</span>
          </div>
          <span className="text-[10px] text-gray-500">1 a 5</span>
        </button>

        {/* Free Practice Action */}
        <button
          onClick={() => {
            soundEngine.init();
            soundEngine.playGood();
            onOpenPractice();
          }}
          className="w-full h-12 bg-[#FFFDF9] hover:bg-[#eae6de] text-black border-4 border-black rounded-xl flex items-center justify-between px-5 font-mono text-xs font-black uppercase shadow-[4px_4px_0px_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
          id="practice-btn"
        >
          <div className="flex items-center gap-3">
            <Activity size={16} className="stroke-[3px] text-[#FF5F00]" />
            <span>TREINO DE BATIDA</span>
          </div>
          <span className="text-[10px] text-gray-500">Livre</span>
        </button>

        {/* Stats Action */}
        <button
          onClick={() => {
            soundEngine.init();
            soundEngine.playGood();
            onOpenStats();
          }}
          className="w-full h-12 bg-[#1e1e1e] hover:bg-[#2e2e2e] text-white border-4 border-black rounded-xl flex items-center justify-between px-5 font-mono text-xs font-black uppercase shadow-[4px_4px_0px_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
          id="stats-btn"
        >
          <div className="flex items-center gap-3">
            <BarChart2 size={16} className="stroke-[3px] text-[#FF5F00]" />
            <span>ESTATÍSTICAS</span>
          </div>
          <span className="text-[10px] text-gray-400">Dados</span>
        </button>

        {/* Character Shop Action */}
        <button
          onClick={() => {
            soundEngine.init();
            soundEngine.playGood();
            onOpenShop();
          }}
          className="w-full h-12 bg-[#FF5F00]/15 hover:bg-[#FF5F00]/25 text-[#FF5F00] border-4 border-black rounded-xl flex items-center justify-between px-5 font-mono text-xs font-black uppercase shadow-[4px_4px_0px_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
          id="shop-btn"
        >
          <div className="flex items-center gap-3">
            <ShoppingBag size={16} className="stroke-[3px]" />
            <span>LOJA DE AVATARES</span>
          </div>
          <span className="text-[10px] bg-[#FF5F00] text-white px-1.5 py-0.2 rounded font-black font-mono">NOVO!</span>
        </button>
      </div>

      {/* Bottom info section */}
      <div className="mt-6">
        {showTutorial ? (
          <div className="bg-[#FFFDF9] border-4 border-black p-4 rounded-xl shadow-[4px_4px_0px_#000] animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-2 pb-1 border-b-2 border-black">
              <span className="font-mono text-xs font-bold uppercase text-black">COMO JOGAR</span>
              <button 
                onClick={() => setShowTutorial(false)}
                className="font-mono text-[10px] font-bold text-gray-400 hover:text-black cursor-pointer"
              >
                FECHAR
              </button>
            </div>
            <p className="font-mono text-[10px] leading-normal text-black">
              1. O metrônomo piscará e emitirá cliques rítmicos.
            </p>
            <p className="font-mono text-[10px] leading-normal text-black mt-1">
              2. <strong>Você precisa clicar/tocar EXATAMENTE na batida</strong> (no pulso principal) para o pássaro bater as asas e subir!
            </p>
            <p className="font-mono text-[10px] leading-normal text-black mt-1">
              3. Batidas <strong className="text-emerald-600">Perfeitas</strong> ou <strong className="text-cyan-600">Boas</strong> te impulsionam. Erros (Adiantado, Atrasado ou Fora) falham o voo e fazem o pássaro cair.
            </p>
            <p className="font-mono text-[10px] leading-normal text-black mt-1">
              4. Complete os estágios para aumentar a velocidade (BPM).
            </p>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={() => {
                soundEngine.playGood();
                setShowTutorial(true);
              }}
              className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500 hover:text-white transition-colors cursor-pointer"
            >
              <HelpCircle size={12} />
              <span>COMO JOGAR? VER TUTORIAL</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
