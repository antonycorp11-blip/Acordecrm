/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { ShoppingBag, ArrowLeft, Check, Lock, Award, Shield } from 'lucide-react';
import { Character, UserStats } from '../types';
import { soundEngine } from '../soundEngine';

interface ShopPanelProps {
  stats: UserStats;
  onEquipCharacter: (id: string) => void;
  onBuyCharacter: (id: string, cost: number) => void;
  onBack: () => void;
}

const CHARACTERS_LIST: Omit<Character, 'unlocked'>[] = [
  {
    id: 'bird_classic',
    name: 'Pássaro Clássico',
    description: 'O pioneiro do flappy ritmo. Ágil e clássico.',
    cost: 0,
    type: 'BIRD',
    color: '#FF5F00',
  },
  {
    id: 'eighth_note',
    name: 'Colcheia DJ',
    description: 'Nota de colcheia estilosa com fones de ouvido para total foco no ritmo!',
    cost: 0, // Unlocked immediately as requested
    type: 'EIGHTH_NOTE',
    color: '#22D3EE',
  },
  {
    id: 'treble_clef',
    name: 'Clave de Sol',
    description: 'Curva melódica dourada clássica. Irradia energia harmônica pura.',
    cost: 30,
    type: 'TREBLE_CLEF',
    color: '#A855F7',
  },
  {
    id: 'cassette_retro',
    name: 'Retro Cassette',
    description: 'Visual analógico lo-fi vintage dos anos 80. Nostalgia pura.',
    cost: 60,
    type: 'CASSETTE',
    color: '#10B981',
  }
];

export const ShopPanel: React.FC<ShopPanelProps> = ({
  stats,
  onEquipCharacter,
  onBuyCharacter,
  onBack,
}) => {
  const currentCoins = stats.coins ?? 25;
  const unlockedIds = stats.unlockedCharacterIds ?? ['bird_classic', 'eighth_note'];
  const activeId = stats.selectedCharacterId ?? 'bird_classic';

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-[#121212] overflow-y-auto">
      {/* Header Info */}
      <div>
        <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-black/30">
          <button
            onClick={() => {
              soundEngine.playGood();
              onBack();
            }}
            className="font-mono text-[10px] text-gray-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft size={11} />
            <span>MENU</span>
          </button>
          
          {/* Rhythm Notes Counter */}
          <div className="bg-[#1e1e1e] border-2 border-black rounded-lg px-2.5 py-1 flex items-center gap-1.5 shadow-[2px_2px_0px_#000]">
            <span className="font-mono text-[9px] text-gray-400 font-bold">NOTAS:</span>
            <span className="font-mono text-xs font-black text-[#FF5F00]">{currentCoins} 💰</span>
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 
            className="font-mono text-xl font-black text-white uppercase tracking-wider"
            style={{ textShadow: '2px 2px 0px #000' }}
          >
            LOJA DE <span className="text-[#FF5F00]">PERSONAGENS</span>
          </h2>
          <p className="font-mono text-[10px] text-gray-500 uppercase tracking-wide mt-1">
            Escolha seu avatar musical
          </p>
        </div>

        {/* Character Selection Grid */}
        <div className="flex flex-col gap-4">
          {CHARACTERS_LIST.map((char) => {
            const isUnlocked = unlockedIds.includes(char.id);
            const isActive = activeId === char.id;
            const canAfford = currentCoins >= char.cost;

            return (
              <div 
                key={char.id}
                className={`bg-[#1e1e1e] border-4 border-black rounded-xl p-4 flex items-center gap-4 shadow-[4px_4px_0px_#000] relative transition-all ${
                  isActive ? 'border-[#FF5F00] bg-[#1e1e1e]/90 shadow-[4px_4px_0px_#FF5F00]' : ''
                }`}
              >
                {/* Character Icon Preview (Chunky mini-canvas render) */}
                <CharacterCanvasPreview type={char.type} color={char.color} />

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-mono text-xs font-black uppercase text-white truncate">
                      {char.name}
                    </h3>
                    {isActive && (
                      <span className="bg-[#FF5F00] text-white font-mono text-[8px] font-black px-1.5 py-0.2 rounded">
                        EQUIPADO
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-[9px] text-gray-400 leading-normal mt-0.5">
                    {char.description}
                  </p>
                </div>

                {/* Buy / Select Button */}
                <div className="shrink-0 flex flex-col items-end justify-center">
                  {isUnlocked ? (
                    isActive ? (
                      <div className="h-8 w-18 bg-gray-900 text-[#FF5F00] border-2 border-[#FF5F00] rounded-lg flex items-center justify-center font-mono text-[9px] font-black uppercase">
                        <Check size={10} className="mr-0.5" /> ATIVO
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          soundEngine.playGood();
                          onEquipCharacter(char.id);
                        }}
                        className="h-8 w-18 bg-[#FFFDF9] hover:bg-gray-200 text-black border-2 border-black rounded-lg font-mono text-[9px] font-black uppercase shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                      >
                        USAR
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => {
                        if (canAfford) {
                          soundEngine.playPerfect();
                          onBuyCharacter(char.id, char.cost);
                        } else {
                          soundEngine.playMiss(); // Deny buzzer
                        }
                      }}
                      disabled={!canAfford}
                      className={`h-8 px-2 flex items-center gap-1 rounded-lg border-2 border-black font-mono text-[9px] font-black uppercase shadow-[2px_2px_0px_#000] transition-all cursor-pointer ${
                        canAfford 
                          ? 'bg-[#FF5F00] hover:bg-[#ff7722] text-white active:translate-y-0.5 active:shadow-none' 
                          : 'bg-gray-800 text-gray-500 border-gray-900 cursor-not-allowed shadow-none'
                      }`}
                    >
                      <Lock size={9} />
                      <span>{char.cost} pts</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Advisory Note */}
      <div className="mt-6 bg-black/40 border border-gray-800 rounded-lg p-3 text-center">
        <p className="font-mono text-[9px] text-gray-400 leading-normal">
          💡 Ganhe <strong>Notas de Ritmo 💰</strong> ultrapassando canos nas lições ou no Modo Infinito! Cada cano superado te dá 1 nota.
        </p>
      </div>
    </div>
  );
};

/* Mini Animated Canvas Preview for Character Styles */
const CharacterCanvasPreview: React.FC<{ type: string; color: string }> = ({ type, color }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2 + Math.sin(t * 0.1) * 3);

      // Scale preview
      ctx.scale(1.2, 1.2);

      if (type === 'BIRD') {
        // classic bird
        ctx.fillStyle = '#000000';
        ctx.fillRect(-8, -8, 16, 16);

        ctx.fillStyle = color;
        ctx.fillRect(-7, -7, 14, 14);

        // Wing flapping
        ctx.fillStyle = '#FFFDF9';
        if (Math.sin(t * 0.2) > 0) {
          ctx.fillRect(-9, -5, 4, 10);
        } else {
          ctx.fillRect(-8, -2, 6, 6);
        }

        // Eye
        ctx.fillStyle = '#FFFDF9';
        ctx.fillRect(1, -5, 4, 4);
        ctx.fillStyle = '#000000';
        ctx.fillRect(3, -4, 2, 2);

        // Beak
        ctx.fillStyle = '#FFB300';
        ctx.fillRect(5, -1, 3, 4);

      } else if (type === 'EIGHTH_NOTE') {
        // Eighth note wearing headphones
        // Note Head (oval)
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.ellipse(-3, 4, 6, 4, -0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(-3, 4, 5, 3, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Stem
        ctx.fillStyle = '#000000';
        ctx.fillRect(1, -8, 2.5, 12);
        ctx.fillStyle = color;
        ctx.fillRect(1.5, -8, 1.5, 12);

        // Flag
        ctx.fillStyle = '#000000';
        ctx.fillRect(3, -8, 5, 3);
        ctx.fillRect(6, -6, 2, 8);

        // Eye inside note head
        ctx.fillStyle = '#FFFDF9';
        ctx.fillRect(-5, 2, 3, 3);
        ctx.fillStyle = '#000000';
        ctx.fillRect(-4, 3, 1, 1);

        // Headphones
        // Left Cup
        ctx.fillStyle = '#FFFDF9';
        ctx.fillRect(-10, 2, 3, 4);
        ctx.fillStyle = '#000000';
        ctx.strokeRect(-10, 2, 3, 4);

        // Right Cup
        ctx.fillStyle = '#FFFDF9';
        ctx.fillRect(2, 2, 3, 4);
        ctx.fillStyle = '#000000';
        ctx.strokeRect(2, 2, 3, 4);

        // Band
        ctx.strokeStyle = '#FFFDF9';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(-3, 2, 6, Math.PI, 0);
        ctx.stroke();

      } else if (type === 'TREBLE_CLEF') {
        // Stylized Treble Clef bird
        ctx.fillStyle = '#000000';
        ctx.fillRect(-2, -9, 4, 18); // center line
        ctx.fillRect(-5, -6, 10, 4);  // top loop
        ctx.fillRect(-7, 1, 11, 4);   // middle loop
        ctx.fillRect(-8, 5, 8, 4);    // bottom circle

        ctx.fillStyle = color;
        ctx.fillRect(-1, -8, 2, 16);
        ctx.fillRect(-4, -5, 8, 2);
        ctx.fillRect(-6, 2, 9, 2);
        ctx.fillRect(-7, 6, 6, 2);

        // Big pixel Eye
        ctx.fillStyle = '#FFFDF9';
        ctx.fillRect(1, -2, 4, 4);
        ctx.fillStyle = '#000000';
        ctx.fillRect(3, -1, 2, 2);

        // Beak
        ctx.fillStyle = '#FFB300';
        ctx.fillRect(5, 1, 3, 3);

      } else if (type === 'CASSETTE') {
        // Retro lo-fi Cassette
        ctx.fillStyle = '#000000';
        ctx.fillRect(-11, -7, 22, 14);

        ctx.fillStyle = color;
        ctx.fillRect(-9, -5, 18, 10);

        // Spools
        ctx.fillStyle = '#FFFDF9';
        ctx.fillRect(-5, -2, 3, 3);
        ctx.fillRect(2, -2, 3, 3);
        ctx.fillStyle = '#000000';
        ctx.fillRect(-4, -1, 1, 1);
        ctx.fillRect(3, -1, 1, 1);

        // Headphones
        ctx.fillStyle = '#A855F7'; // purple ear cups
        ctx.fillRect(-12, -2, 2, 5);
        ctx.fillRect(10, -2, 2, 5);
      }

      ctx.restore();
      t += 1;
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [type, color]);

  return (
    <canvas 
      ref={canvasRef} 
      width="44" 
      height="44" 
      className="bg-black/30 border-2 border-black rounded-lg block shrink-0" 
    />
  );
};
