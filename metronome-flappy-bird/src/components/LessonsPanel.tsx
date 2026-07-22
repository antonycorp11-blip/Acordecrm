/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, Lock, CheckCircle, Flame, Star } from 'lucide-react';
import { Lesson } from '../types';
import { soundEngine } from '../soundEngine';

interface LessonsPanelProps {
  lessons: Lesson[];
  onSelectLesson: (lesson: Lesson) => void;
  unlockedStage: number;
}

export const LessonsPanel: React.FC<LessonsPanelProps> = ({
  lessons,
  onSelectLesson,
  unlockedStage,
}) => {
  return (
    <div className="flex-1 flex flex-col p-5 bg-[#121212] overflow-y-auto">
      <div className="mb-4">
        <h2 className="font-mono text-sm font-black text-white uppercase tracking-wider mb-1">
          AULAS DE RITMO
        </h2>
        <p className="font-mono text-[10px] text-gray-500 leading-normal">
          Aprenda a tocar no tempo certo. Cada aula aumenta a velocidade (BPM). Supere os obstáculos na batida para avançar!
        </p>
      </div>

      {/* Lessons List */}
      <div className="flex flex-col gap-4">
        {lessons.map((lesson) => {
          const isUnlocked = lesson.id <= unlockedStage;
          const isCompleted = lesson.completed;

          return (
            <div
              key={lesson.id}
              className={`border-4 border-black rounded-xl p-4 transition-all relative ${
                isUnlocked
                  ? 'bg-[#FFFDF9] text-black shadow-[4px_4px_0px_#000]'
                  : 'bg-[#1a1a1a] text-gray-600 border-[#333] shadow-none'
              }`}
            >
              {/* Top Row: Title & Badge */}
              <div className="flex items-start justify-between mb-1.5">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] font-black bg-[#FF5F00] text-white px-1 py-0.2 rounded uppercase">
                      Aula {lesson.id}
                    </span>
                    {isCompleted && (
                      <CheckCircle size={14} className="text-emerald-600 stroke-[3px]" />
                    )}
                  </div>
                  <h3 className={`font-mono text-xs font-black uppercase mt-1 ${isUnlocked ? 'text-black' : 'text-gray-500'}`}>
                    {lesson.title}
                  </h3>
                </div>

                {/* Difficulty tag */}
                <span
                  className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border-2 border-black shadow-[1px_1px_0px_#000] ${
                    lesson.difficulty === 'Fácil'
                      ? 'bg-emerald-100 text-emerald-800'
                      : lesson.difficulty === 'Médio'
                      ? 'bg-cyan-100 text-cyan-800'
                      : lesson.difficulty === 'Difícil'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {lesson.difficulty}
                </span>
              </div>

              {/* Description */}
              <p className={`font-mono text-[10px] leading-relaxed mb-3 ${isUnlocked ? 'text-gray-700' : 'text-gray-600'}`}>
                {lesson.description}
              </p>

              {/* Stats/Metrics Row */}
              <div className="flex items-center justify-between border-t border-dashed border-gray-400 pt-3">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="font-mono text-[8px] text-gray-500 uppercase">Tempo</span>
                    <span className={`font-mono text-[11px] font-black ${isUnlocked ? 'text-[#FF5F00]' : 'text-gray-500'}`}>
                      {lesson.bpm} BPM
                    </span>
                  </div>
                  <div className="w-px h-6 bg-gray-300"></div>
                  <div className="flex flex-col">
                    <span className="font-mono text-[8px] text-gray-500 uppercase">Objetivo</span>
                    <span className={`font-mono text-[11px] font-black ${isUnlocked ? 'text-black' : 'text-gray-500'}`}>
                      {lesson.targetPipes} canos
                    </span>
                  </div>
                </div>

                {/* Play Button or Lock */}
                {isUnlocked ? (
                  <button
                    onClick={() => {
                      soundEngine.playPerfect();
                      onSelectLesson(lesson);
                    }}
                    className="h-8 bg-[#FF5F00] hover:bg-[#ff7722] text-white border-2 border-black rounded-lg px-4 flex items-center gap-1.5 font-mono text-[10px] font-black uppercase shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                  >
                    <Play size={10} className="fill-white" />
                    <span>INICIAR</span>
                  </button>
                ) : (
                  <div className="h-8 bg-[#222] border-2 border-black rounded-lg px-3 flex items-center gap-1 font-mono text-[10px] text-gray-500">
                    <Lock size={10} />
                    <span>BLOQUEADO</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
