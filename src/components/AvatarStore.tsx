import * as React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { SKINS, INSTRUMENTS, BACKGROUNDS, FONTS, TILES } from '../utils/avatarAssets';

interface AvatarStoreProps {
  xp: number;
  pontos: number;
  unlockedItems: string[];
  onBuy: (itemId: string, price: number) => void;
  onConvertXp: (amountXp: number, pointsReceived: number) => void;
  onClose: () => void;
}

export const AvatarStore: React.FC<AvatarStoreProps> = ({ xp, pontos, unlockedItems, onBuy, onConvertXp, onClose }) => {
  const [filter, setFilter] = useState<'all' | 'skins' | 'instruments' | 'backgrounds' | 'fonts' | 'tiles'>('skins');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const allItems = [
    ...SKINS.map(s => ({ id: s.id, name: s.name, rarity: s.rarity, price: s.price, type: 'skins', thumb: s.url })),
    ...INSTRUMENTS.map(i => ({ id: i.id, name: i.name, rarity: i.rarity, price: i.price, type: 'instruments', thumb: i.url })),
    ...BACKGROUNDS.map(b => ({ id: b.id, name: b.name, rarity: b.rarity, price: b.price, type: 'backgrounds', thumb: b.url })),
    ...FONTS.map(f => ({ id: f.id, name: f.name, rarity: f.rarity, price: f.price, type: 'fonts', thumb: 'https://placehold.co/400x400/111/fff?text=FONTE' })),
    ...TILES.map(t => ({ id: t.id, name: t.name, rarity: t.rarity, price: t.price, type: 'tiles', thumb: 'https://placehold.co/400x400/222/fff?text=MOLDURA' })),
  ];

  const filteredItems = filter === 'all' ? allItems : allItems.filter(i => i.type === filter);

  const getAuraClass = (rarity: string) => {
    if (rarity === 'Lendário') return 'bg-[radial-gradient(circle,rgba(245,158,11,0.9)_0%,rgba(245,158,11,0)_70%)]';
    if (rarity === 'Épico') return 'bg-[radial-gradient(circle,rgba(168,85,247,0.8)_0%,rgba(168,85,247,0)_70%)]';
    return 'bg-[radial-gradient(circle,rgba(59,130,246,0.8)_0%,rgba(59,130,246,0)_70%)]';
  };

  const getRaysClass = (rarity: string) => {
    // Apenas o lendário tem os raios de luz saindo do fundo
    if (rarity === 'Lendário') {
      return `absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,255,255,0.2)_10deg,transparent_20deg,rgba(255,255,255,0.2)_30deg,transparent_40deg,rgba(255,255,255,0.2)_50deg,transparent_60deg,rgba(255,255,255,0.2)_70deg,transparent_80deg,rgba(255,255,255,0.2)_90deg,transparent_100deg,rgba(255,255,255,0.2)_110deg,transparent_120deg,rgba(255,255,255,0.2)_130deg,transparent_140deg,rgba(255,255,255,0.2)_150deg,transparent_160deg,rgba(255,255,255,0.2)_170deg,transparent_180deg,rgba(255,255,255,0.2)_190deg,transparent_200deg,rgba(255,255,255,0.2)_210deg,transparent_220deg,rgba(255,255,255,0.2)_230deg,transparent_240deg,rgba(255,255,255,0.2)_250deg,transparent_260deg,rgba(255,255,255,0.2)_270deg,transparent_280deg,rgba(255,255,255,0.2)_290deg,transparent_300deg,rgba(255,255,255,0.2)_310deg,transparent_320deg,rgba(255,255,255,0.2)_330deg,transparent_340deg,rgba(255,255,255,0.2)_350deg,transparent_360deg)] animate-[spin_10s_linear_infinite] opacity-50`;
    }
    return '';
  };

  const isItemOwned = (id: string) => unlockedItems.includes(id) || id === 'skin_m_1' || id === 'bg_1';

  const getRarityTagClass = (rarity: string) => {
    if (rarity === 'Lendário') return 'bg-yellow-500/20 text-yellow-500 border-yellow-500';
    if (rarity === 'Épico') return 'bg-purple-500/20 text-purple-500 border-purple-500';
    return 'bg-blue-500/20 text-blue-500 border-blue-500';
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black p-4 w-full h-full overflow-y-auto text-white flex flex-col pb-24">
      
      {/* Header Info - Game Style */}
      <div className="flex justify-between items-center mb-6 shrink-0 relative z-50">
        <div className="flex flex-col">
          <h3 className="text-[#ffeb3b] font-black uppercase text-xl tracking-widest flex items-center gap-2 drop-shadow-md">
            <span>🛒</span> LOJA PREMIUM
          </h3>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider ml-8">Temporada 1</span>
        </div>

        <div className="flex items-start gap-4">
          <div className="bg-[#1a0a05] border-2 border-[#3d2d26] px-3 py-1 flex flex-col items-end shadow-[2px_2px_0_#000]">
            <div className="flex items-center gap-2">
               <span className="text-[9px] font-black uppercase text-[#8e7164]">Pontos</span>
               <span className="text-[#4ade80] font-black text-lg drop-shadow-sm">💰 {pontos}</span>
            </div>
            <button 
              onClick={() => {
                if (xp >= 100) onConvertXp(100, 10);
                else toast.error('XP insuficiente para converter.');
              }}
              className="text-[8px] font-black text-[#ff6b00] uppercase hover:text-white mt-0.5 active:scale-95 transition-transform"
            >
              Trocar 100 XP → 10 💰
            </button>
          </div>
          <button onClick={onClose} className="text-white font-black text-2xl hover:text-red-500 drop-shadow-md">✕</button>
        </div>
      </div>

      {!selectedItem && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide shrink-0 relative z-40">
            {['all', 'skins', 'instruments', 'backgrounds', 'fonts', 'tiles'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-2 font-black text-[10px] uppercase tracking-wider whitespace-nowrap transition-colors shadow-[2px_2px_0_#000] active:translate-y-1 active:shadow-none border-2 border-black ${filter === f ? 'bg-[#ff6b00] text-black' : 'bg-[#1a0a05] text-[#8e7164] hover:bg-[#3d2d26]'}`}
              >
                {f === 'all' ? 'Tudo' : f === 'skins' ? 'Skins' : f === 'instruments' ? 'Instrumentos' : f === 'backgrounds' ? 'Cenários' : f === 'fonts' ? 'Fontes' : 'Molduras'}
              </button>
            ))}
          </div>

          {/* Canva Style Grid */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-12 mt-6 relative z-10">
            {filteredItems.map(item => {
              const owned = isItemOwned(item.id);
              const isLegendary = item.rarity === 'Lendário';

              return (
                <div 
                  key={item.id} 
                  className={`flex flex-col items-center justify-end group cursor-pointer relative ${isLegendary ? 'col-span-2 mt-8 mb-4' : ''}`}
                  onClick={() => setSelectedItem(item)}
                >
                  {/* Item Name */}
                  <span className={`text-white font-black uppercase text-center drop-shadow-md relative z-30 mb-1 ${isLegendary ? 'text-lg text-[#ffeb3b]' : 'text-[10px]'}`}>
                    {item.name}
                  </span>

                  <div className={`relative w-full ${isLegendary ? 'max-w-[80%]' : 'max-w-full'} aspect-[3/4] flex items-end justify-center overflow-visible`}>
                    
                    {/* Tags UI */}
                    <div className="absolute top-2 left-2 z-30 flex flex-col gap-1 items-start">
                      <span className="bg-black/90 text-white text-[7px] font-black px-1.5 py-0.5 border border-white/20 uppercase tracking-widest shadow-md">Temp. 1</span>
                      <span className={`text-[8px] font-black px-1.5 py-0.5 border uppercase tracking-widest shadow-md ${getRarityTagClass(item.rarity)}`}>
                        {item.rarity}
                      </span>
                    </div>

                    {/* Efeito de Aura (Fumaça) */}
                    <div className={`absolute inset-0 ${getAuraClass(item.rarity)} opacity-80 group-hover:opacity-100 transition-opacity blur-[30px] ${isLegendary ? 'scale-150' : 'scale-125'}`}></div>
                    
                    {/* Efeito de Raios (Lendário) */}
                    {isLegendary && (
                       <div className="absolute inset-[-100%] overflow-hidden pointer-events-none flex items-center justify-center z-0">
                          <div className={getRaysClass(item.rarity)}></div>
                       </div>
                    )}

                    {/* Imagem do Personagem/Item */}
                    <img 
                      src={item.thumb} 
                      alt={item.name} 
                      className={`relative z-10 w-full h-[110%] object-contain object-bottom drop-shadow-[0_10px_15px_rgba(0,0,0,0.8)] group-hover:scale-[1.03] transition-transform`} 
                    />
                  </div>
                  
                  {/* Caixa Laranja (Preço / Status) */}
                  <div className={`mt-2 bg-[#ff6b00] border-2 border-black text-black px-6 py-2 font-black text-sm uppercase shadow-[4px_4px_0_#000] relative z-20 whitespace-nowrap text-center ${isLegendary ? 'w-3/4 py-3 text-lg' : 'min-w-[120px]'}`}>
                    {owned ? 'COMPRADO' : `${item.price} 💰`}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Super Large Preview Modal */}
      {selectedItem && (
        <div className="absolute inset-0 z-40 bg-black flex flex-col pt-12 pb-6 px-4">
          <button 
            onClick={() => setSelectedItem(null)}
            className="absolute top-6 left-6 text-white font-black uppercase text-sm border-2 border-white px-4 py-2 hover:bg-white hover:text-black transition-colors z-50"
          >
            ← VOLTAR
          </button>

          <div className="flex-1 relative flex flex-col items-center justify-center h-full">
             {/* Giant Aura */}
             <div className={`absolute inset-0 ${getAuraClass(selectedItem.rarity)} opacity-80 blur-xl scale-125`}></div>
             
             {selectedItem.rarity === 'Lendário' && (
                <div className="absolute inset-[-50%] overflow-hidden pointer-events-none flex items-center justify-center">
                   <div className={getRaysClass(selectedItem.rarity)}></div>
                </div>
             )}

             <img 
               src={selectedItem.thumb} 
               alt={selectedItem.name} 
               className="relative z-10 w-auto h-auto max-w-full max-h-[70vh] object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.9)]" 
             />
          </div>

          <div className="relative z-50 flex flex-col items-center gap-4 mt-6">
            <h2 className="text-3xl font-black uppercase tracking-widest text-center text-white drop-shadow-md">
              {selectedItem.name}
            </h2>
            <span className={`text-sm font-black uppercase tracking-widest px-4 py-1 border-2 bg-black/50 ${
              selectedItem.rarity === 'Lendário' ? 'text-yellow-500 border-yellow-500' : 
              selectedItem.rarity === 'Épico' ? 'text-purple-500 border-purple-500' : 'text-blue-500 border-blue-500'
            }`}>
              {selectedItem.rarity}
            </span>

            {isItemOwned(selectedItem.id) ? (
              <div className="mt-4 bg-[#1a2e1f] text-[#4ade80] px-12 py-4 border-2 border-[#4ade80]/30 font-black text-xl uppercase shadow-[6px_6px_0_rgba(0,0,0,1)]">
                ITEM ADQUIRIDO
              </div>
            ) : (
              <button 
                onClick={() => {
                  if (pontos >= selectedItem.price) {
                    onBuy(selectedItem.id, selectedItem.price);
                    setSelectedItem(null); // Fecha o preview após comprar
                  } else {
                    toast.error('Pontos insuficientes!');
                  }
                }}
                className="mt-4 bg-[#ff6b00] text-black border-4 border-black px-12 py-4 font-black text-2xl uppercase tracking-widest shadow-[8px_8px_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[4px_4px_0_rgba(0,0,0,1)] active:translate-y-2 active:shadow-none transition-all flex items-center gap-3"
              >
                COMPRAR POR {selectedItem.price} 💰
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
