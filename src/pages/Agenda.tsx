import React from 'react';
import { WeeklyCalendar } from '../components/calendar/WeeklyCalendar';

export default function Agenda() {
  return (
    <div className="flex flex-col flex-1 animate-in fade-in duration-500 overflow-hidden h-screen">
      <header className="h-16 px-8 frosted-bg border-b border-slate-200/50 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Agenda Escolar</h1>
          <p className="text-sm font-medium text-slate-500">Visualize e organize as aulas de toda a escola em tempo real.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-4 px-4 py-2 bg-white/50 border border-slate-200 rounded-xl">
             <div className="flex items-center gap-2">
               <div className="w-3 h-3 bg-orange-500 rounded-sm shadow-sm"></div>
               <span className="text-[10px] font-black text-slate-500 uppercase">Regular</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-3 h-3 bg-blue-500 rounded-sm shadow-sm"></div>
               <span className="text-[10px] font-black text-slate-500 uppercase">Experimental</span>
             </div>
           </div>
        </div>
      </header>

      <div className="p-8 flex-1 overflow-hidden">
        <WeeklyCalendar />
      </div>
    </div>
  );
}
