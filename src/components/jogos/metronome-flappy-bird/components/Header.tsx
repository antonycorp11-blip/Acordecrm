/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Volume2, VolumeX, ArrowLeft, Award } from 'lucide-react';
import { soundEngine } from '../soundEngine';

interface HeaderProps {
  title: string;
  showBack: boolean;
  onBack: () => void;
  onClose?: () => void;
  highScore?: number;
  onMuteToggle: () => void;
  isMuted: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack,
  onBack,
  onClose,
  highScore = 0,
  onMuteToggle,
  isMuted,
}) => {
  return (
    <div className="h-14 bg-[#181818] border-b-4 border-black flex items-center justify-between px-4 shrink-0 z-30">
      {/* Left side: Back or Spacer */}
      <div className="w-10">
        {showBack ? (
          <button
            onClick={() => {
              soundEngine.playGood();
              onBack();
            }}
            className="w-8 h-8 bg-[#FF5F00] hover:bg-[#ff7722] border-2 border-black rounded-md flex items-center justify-center active:translate-y-0.5 active:shadow-none shadow-[2px_2px_0px_#000] transition-all cursor-pointer"
            id="back-btn"
          >
            <ArrowLeft size={16} className="text-white stroke-[3px]" />
          </button>
        ) : (
          <div className="w-8 h-8 bg-[#222] border-2 border-black rounded-md flex items-center justify-center text-[10px] font-mono text-gray-500 font-bold">
            8-BIT
          </div>
        )}
      </div>

      {/* Center: Title */}
      <div className="flex-1 text-center">
        <h1 
          className="font-mono text-sm tracking-widest text-[#FF5F00] font-black uppercase overflow-hidden whitespace-nowrap text-ellipsis"
          style={{ textShadow: '2px 2px 0px #000' }}
        >
          {title}
        </h1>
      </div>

      {/* Right side: High Score, Sound and Close */}
      <div className="flex items-center gap-2">
        {highScore > 0 && !showBack && (
          <div className="flex items-center gap-1 bg-[#fffdf9] border-2 border-black px-2 py-0.5 rounded shadow-[1px_1px_0px_#000] text-black">
            <Award size={12} className="text-[#FF5F00] stroke-[3.5px]" />
            <span className="font-mono text-[10px] font-bold leading-none">{highScore}</span>
          </div>
        )}
        <button
          onClick={() => {
            onMuteToggle();
            soundEngine.playGood();
          }}
          className={`w-8 h-8 rounded-md flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer ${
            isMuted 
              ? 'bg-[#333] hover:bg-[#444] text-gray-400' 
              : 'bg-[#FF5F00] hover:bg-[#ff7722] text-white'
          }`}
          id="sound-toggle-btn"
        >
          {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
        {onClose && (
          <button
            onClick={() => {
              soundEngine.playGood();
              onClose();
            }}
            className="w-8 h-8 bg-red-600 hover:bg-red-700 text-white border-2 border-black rounded-md flex items-center justify-center font-black text-sm active:translate-y-0.5 active:shadow-none shadow-[2px_2px_0px_#000] transition-all cursor-pointer"
            title="Sair do Jogo"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};
