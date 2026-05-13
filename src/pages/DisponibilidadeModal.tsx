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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden p-8 max-h-[90vh] flex flex-col"
      >
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div>
            <h2 className="text-xl font-black text-slate-900">Disponibilidade - {prof.nome}</h2>
            <p className="text-sm font-medium text-slate-500">Clique nos blocos para marcar os horários disponíveis.</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar border rounded-xl border-slate-200">
          <div className="min-w-max">
             <div className="flex sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
               <div className="w-24 border-r border-slate-200 sticky left-0 bg-slate-50"></div>
               {HORARIOS.map(time => (
                 <div key={time} className="w-16 h-8 border-r border-slate-200 flex items-center justify-center">
                   <span className="text-[10px] font-black text-slate-500">{time}</span>
                 </div>
               ))}
             </div>
             {DIAS.map(dia => (
               <div key={dia} className="flex border-b border-slate-200">
                 <div className="w-24 h-10 border-r border-slate-200 sticky left-0 bg-slate-50 flex items-center justify-center px-2">
                   <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">{dia}</span>
                 </div>
                 {HORARIOS.map(time => {
                   const key = `${dia}-${time}`;
                   const isSelected = !!disp[key];
                   return (
                     <button
                       key={key}
                       onClick={() => toggle(dia, time)}
                       className={`w-16 h-10 border-r border-slate-200 transition-colors ${
                         isSelected ? 'bg-primary/20 hover:bg-primary/30' : 'bg-white hover:bg-slate-100'
                       }`}
                     />
                   );
                 })}
               </div>
             ))}
          </div>
        </div>

        <div className="shrink-0 mt-6 flex justify-end">
          <button 
            onClick={handleSave}
            className="bg-primary text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-primary/30 active:scale-95 transition-all flex items-center gap-2"
          >
            <Save className="w-5 h-5" /> Salvar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
