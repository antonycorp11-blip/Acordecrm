/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Battery, Wifi, Signal } from 'lucide-react';

interface DeviceFrameProps {
  children: React.ReactNode;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({ children }) => {
  const [time, setTime] = useState('14:00');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      let hours = now.getHours().toString().padStart(2, '0');
      let minutes = now.getMinutes().toString().padStart(2, '0');
      setTime(`${hours}:${minutes}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#111111] py-8 px-4 flex flex-col items-center justify-center font-sans select-none overflow-x-hidden">
      {/* Outer 8-bit border shadow container */}
      <div 
        id="mobile-device-container"
        className="relative w-full max-w-[400px] h-[820px] bg-[#1a1a1a] rounded-[40px] border-8 border-[#262626] shadow-[12px_12px_0px_0px_#050505] overflow-hidden flex flex-col focus:outline-none"
      >
        {/* Device Notch & Camera */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-6 bg-[#262626] rounded-b-2xl z-50 flex items-center justify-center">
          <div className="w-12 h-1 bg-[#151515] rounded-full mr-2"></div>
          <div className="w-3.5 h-3.5 bg-[#151515] rounded-full border border-gray-800"></div>
        </div>

        {/* Status Bar */}
        <div className="h-9 bg-[#121212] flex items-center justify-between px-6 text-[11px] font-mono text-gray-500 pt-1.5 shrink-0 z-40">
          <div>{time}</div>
          <div className="flex items-center gap-1.5">
            <Signal size={12} className="text-gray-500" />
            <Wifi size={12} className="text-gray-500" />
            <div className="flex items-center gap-0.5 border border-gray-600 rounded px-0.5 py-0.2">
              <span className="text-[9px] font-bold leading-none">100%</span>
              <Battery size={12} className="text-green-500" />
            </div>
          </div>
        </div>

        {/* Screen Content Wrapper */}
        <div className="relative flex-1 w-full bg-[#121212] overflow-hidden flex flex-col">
          {children}
        </div>

        {/* Device Home Indicator Bar */}
        <div className="h-6 bg-[#121212] flex items-center justify-center shrink-0 z-40">
          <div className="w-28 h-1 bg-gray-700 rounded-full"></div>
        </div>
      </div>

      {/* Sub-label under the phone wrapper */}
      <div className="mt-4 text-xs font-mono text-gray-600 text-center max-w-sm hidden sm:block">
        Use <kbd className="px-1.5 py-0.5 bg-[#222] border border-gray-700 rounded text-gray-400">ESPAÇO</kbd> ou <kbd className="px-1.5 py-0.5 bg-[#222] border border-gray-700 rounded text-gray-400">CLIQUE</kbd> para pular no ritmo.
      </div>
    </div>
  );
};
