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
  return (
    <div className="w-full h-full min-h-[500px] max-w-full bg-[#121212] flex flex-col relative overflow-hidden font-mono select-none">
      {children}
    </div>
  );
};
