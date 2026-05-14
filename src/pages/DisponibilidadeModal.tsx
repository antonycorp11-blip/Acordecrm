import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  prof: any;
  onClose: () => void;
  onSave: (id: number, disponibilidade: any) => Promise<void>;
}

const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const HORARIOS = Array.from({ length: 15 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`);

const diasMap: Record<string, string> = {
  'Segunda': 'segunda',
  'Terça': 'terca',
  'Quarta': 'quarta',
  'Quinta': 'quinta',
  'Sexta': 'sexta',
  'Sábado': 'sabado'
};

export function DisponibilidadeModal({ prof, onClose, onSave }: Props) {
  const [disp, setDisp] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    const dbDisp = prof.disponibilidade || {};
    
    DIAS.forEach(dia => {
      const dbDay = diasMap[dia];
      const horarios = dbDisp[dbDay] || [];
      horarios.forEach((h: string) => {
        initialState[`${dia}-${h}`] = true;
      });
    });
    return initialState;
  });

  const toggle = (dia: string, time: string) => {
    const key = `${dia}-${time}`;
    setDisp(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    const dbFormat: Record<string, string[]> = {};
    DIAS.forEach(dia => {
      dbFormat[diasMap[dia]] = [];
    });
    
    Object.entries(disp).forEach(([key, value]) => {
      if (value) {
        const [dia, time] = key.split('-');
        if (dbFormat[diasMap[dia]]) {
          dbFormat[diasMap[dia]].push(time);
        }
      }
    });
    
    onSave(prof.id, dbFormat);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#fff8f6] w-full max-w-4xl border-8 border-black shadow-[12px_12px_0_#000] overflow-hidden flex flex-col max-h-[90vh]"
      >
        <header className="p-6 border-b-8 border-black flex items-center justify-between bg-[#feccba] shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-[#ff6b00] p-2 border-4 border-black shadow-[4px_4px_0_#000]"><Clock className="w-6 h-6 text-white" /></div>
            <div>
              <h2 className="text-xl font-black text-black uppercase italic italic tracking-tighter">Grade_Disponibilidade</h2>
              <p className="text-[10px] font-black text-[#8e7164] uppercase tracking-widest">&gt;&gt; PROFESSOR: {prof.nome}</p>
            </div>
          </div>
          <button onClick={onClose} className="bg-black text-white p-2 border-2 border-white shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none"><X className="w-6 h-6" /></button>
        </header>

        <div className="flex-1 overflow-auto custom-scrollbar p-6 bg-black/5">
          <div className="bg-white border-4 border-black shadow-[6px_6px_0_#000] min-w-max">
             <div className="flex sticky top-0 z-10 bg-[#feccba] border-b-4 border-black">
               <div className="w-24 border-r-4 border-black sticky left-0 bg-[#feccba]"></div>
               {HORARIOS.map(time => (
                 <div key={time} className="w-16 h-10 border-r-2 border-black/20 flex items-center justify-center">
                   <span className="text-[9px] font-black text-black uppercase">{time}</span>
                 </div>
               ))}
             </div>
             {DIAS.map(dia => (
               <div key={dia} className="flex border-b-2 border-black/10 last:border-b-0">
                 <div className="w-24 h-12 border-r-4 border-black sticky left-0 bg-[#ffeae1] flex items-center justify-center px-2">
                   <span className="text-[9px] font-black text-black uppercase tracking-wider italic italic">{dia}</span>
                 </div>
                 {HORARIOS.map(time => {
                   const key = `${dia}-${time}`;
                   const isSelected = !!disp[key];
                   return (
                     <button
                       key={key}
                       onClick={() => toggle(dia, time)}
                       className={`w-16 h-12 border-r-2 border-black/10 transition-all ${
                         isSelected ? 'bg-[#ff6b00] shadow-inner' : 'bg-white hover:bg-[#feccba]/20'
                       }`}
                     />
                   );
                 })}
               </div>
             ))}
          </div>
        </div>

        <div className="shrink-0 p-6 border-t-8 border-black bg-[#feccba] flex justify-end">
          <button 
            onClick={handleSave}
            className="bg-[#ff6b00] text-white px-10 py-4 border-4 border-black font-black uppercase italic italic shadow-[6px_6px_0_#000] active:translate-y-1 active:shadow-none transition-all flex items-center gap-3"
          >
            <Save className="w-5 h-5" /> SALVAR_CONFIGURAÇÃO
          </button>
        </div>
      </motion.div>
    </div>
  );
}
