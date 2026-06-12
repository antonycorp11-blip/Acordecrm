import * as React from 'react';
import { SKINS, INSTRUMENTS, BACKGROUNDS } from '../utils/avatarAssets';

interface AvatarPixelProps {
  config?: {
    skinId?: string;
    instrumentId?: string;
    backgroundId?: string;
    [key: string]: any;
  };
}

export const AvatarPixel: React.FC<AvatarPixelProps> = ({ config }) => {
  const { skinId, instrumentId, backgroundId } = config || {};
  
  const skin = SKINS.find(s => s.id === config.skinId) || SKINS[0];
  const instrument = INSTRUMENTS.find(i => i.id === config.instrumentId);
  const background = BACKGROUNDS.find(b => b.id === config.backgroundId) || BACKGROUNDS[0];

  const skinUrl = skin.url;

  return (
    <div className="w-full h-full relative group overflow-hidden">
      {/* Background Layer (Z-0) */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url("${background.url}")` }}
      />
      
      {/* Skin Layer (Z-10) */}
      <img 
        src={skinUrl} 
        alt="Avatar Skin" 
        className="absolute inset-0 z-10 w-full h-full object-cover"
      />

      {/* Instrument Layer (Z-20) - Floating at bottom right */}
      {instrument && (
        <img 
          src={instrument.url} 
          alt="Instrument" 
          className={`absolute bottom-2 right-2 w-20 h-20 sm:w-28 sm:h-28 z-20 object-contain drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)] hover:scale-110 transition-transform origin-bottom-right ${instrument.type === 'guitar' ? '-rotate-[25deg] translate-x-2 translate-y-2' : ''}`}
        />
      )}
    </div>
  );
};
