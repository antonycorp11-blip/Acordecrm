import * as React from 'react';
import { SKINS, INSTRUMENTS, BACKGROUNDS } from '../utils/avatarAssets';

interface AvatarPixelProps {
  config?: {
    skinId?: string;
    instrumentId?: string;
    backgroundId?: string;
    [key: string]: any;
  };
  isSilhouette?: boolean;
  hideBackground?: boolean;
}

export const AvatarPixel: React.FC<AvatarPixelProps> = ({ config, isSilhouette, hideBackground }) => {
  const { skinId, instrumentId, backgroundId } = config || {};
  
  const skin = SKINS.find(s => s.id === config.skinId) || SKINS[0];
  const instrument = INSTRUMENTS.find(i => i.id === config.instrumentId);
  const background = BACKGROUNDS.find(b => b.id === config.backgroundId) || BACKGROUNDS[0];

  const skinUrl = skin.url;

  return (
    <div className="w-full h-full relative group overflow-visible">
      {/* Background Layer (Z-0) */}
      {!hideBackground && (
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center overflow-hidden"
          style={{ backgroundImage: `url("${background.url}")` }}
        />
      )}
      
      {/* Skin Layer (Z-10) */}
      <img 
        src={skinUrl} 
        alt="Avatar Skin" 
        className={`absolute inset-0 z-10 w-full h-full object-contain object-bottom ${isSilhouette ? 'opacity-90' : ''}`}
        style={isSilhouette ? { filter: 'brightness(0) saturate(100%) invert(48%) sepia(90%) saturate(2853%) hue-rotate(345deg) brightness(101%) contrast(105%)' } : {}}
      />

      {/* Instrument Layer (Z-20) - Floating at bottom right */}
      {instrument && (
        <img 
          src={instrument.url} 
          alt="Instrument" 
          className={`absolute bottom-[5%] right-[-15%] w-[75%] h-[75%] z-20 object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.9)] hover:scale-105 transition-transform origin-bottom-right ${instrument.type === 'guitar' ? '-rotate-[25deg] translate-x-[10%] translate-y-[5%]' : ''}`}
        />
      )}
    </div>
  );
};
