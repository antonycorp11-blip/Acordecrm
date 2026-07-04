import * as React from 'react';
import { useState } from 'react';
import { AvatarPixel } from './AvatarPixel';
import { toast } from 'sonner';
import { SKINS, INSTRUMENTS, BACKGROUNDS, FONTS, TILES } from '../utils/avatarAssets';

interface AvatarEditorProps {
  alunoId: string;
  currentConfig: any;
  unlockedItems: string[];
  onSave: (config: any) => void;
}

export const AvatarEditor: React.FC<AvatarEditorProps> = ({ alunoId, currentConfig, unlockedItems = [], onSave }) => {
  const [config, setConfig] = useState<any>({
    skinId: currentConfig?.skinId || '',
    instrumentId: currentConfig?.instrumentId || '',
    backgroundId: currentConfig?.backgroundId || '',
    fontId: currentConfig?.fontId || '',
    tileId: currentConfig?.tileId || '',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field: string, value: string | null) => {
    setConfig({ ...config, [field]: value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      onSave(config);
      toast.success('Equipamento salvo!');
    } catch (err) {
      toast.error('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const renderGrid = (label: string, items: any[], fieldName: string, isRemovable: boolean = false) => {
    return (
      <div className="mb-6">
        <label className="text-[10px] text-[#8e7164] font-black uppercase mb-2 flex justify-between items-end">
          <span>{label}</span>
          {isRemovable && config[fieldName] && (
            <button 
              onClick={() => handleChange(fieldName, null)}
              className="text-red-500 hover:text-red-400 text-[8px] bg-red-500/10 px-2 py-1 rounded"
            >
              REMOVER
            </button>
          )}
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {items.map(item => {
            // Itens com preço 0 (iniciais) são de propriedade de todos por padrão
            const isOwned = item.price === 0 || unlockedItems.includes(item.id);
            const isEquipped = config[fieldName] === item.id;
            
            // Get Thumbnail based on item type
            let thumbUrl = '';
            if (fieldName === 'skinId') thumbUrl = item.url;
            else thumbUrl = item.url;

            return (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => {
                    if (isOwned) handleChange(fieldName, item.id);
                    else toast.error('Você não tem esse item! Compre-o na Loja.');
                  }}
                  className={`w-full aspect-[3/4] border-2 shadow-[2px_2px_0_#000] active:translate-y-1 active:shadow-none transition-all overflow-hidden flex flex-col items-center justify-center 
                    ${isEquipped ? 'border-[#ff6b00] bg-[#ff6b00]/20' : 'border-black bg-white hover:bg-gray-200'} 
                    ${!isOwned ? 'opacity-50 grayscale' : ''}`}
                >
                  {fieldName === 'fontId' ? (
                    <div className="w-full h-full flex items-center justify-center text-center p-2" style={{ fontFamily: item.fontFamily, backgroundColor: '#111', color: '#fff' }}>
                      <span className="text-2xl">Aa</span>
                    </div>
                  ) : fieldName === 'tileId' ? (
                    <div className="w-full h-full flex items-center justify-center p-4 bg-black">
                      <div className={`w-full aspect-square border-4 ${item.className}`}></div>
                    </div>
                  ) : (
                    <img src={thumbUrl} alt={item.name} className="w-full h-full object-cover" />
                  )}
                </button>
                {!isOwned && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-xl drop-shadow-md">🔒</span>
                  </div>
                )}
                {isOwned && (
                  <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-white text-center font-bold py-0.5 truncate px-1">
                    {item.name}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#1a0a05] border-4 border-black p-4 w-full shadow-[4px_4px_0_#000]">
      <h3 className="text-[#ff6b00] font-black uppercase text-sm mb-4 tracking-widest flex items-center gap-2">
        <span>🎒</span> MEU ARMÁRIO
      </h3>
      
      {/* Preview */}
      <div className="flex flex-col mb-6 items-center bg-black border-4 border-[#3d2d26] shadow-[4px_4px_0_#000] overflow-hidden">
        <div className="w-full max-w-[280px] aspect-[3/4] shrink-0 relative">
          <AvatarPixel config={config} />
        </div>
      </div>

      {/* Accordions do Editor */}
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {renderGrid('Skins (Personagens)', SKINS, 'skinId')}
        {renderGrid('Cenários', BACKGROUNDS, 'backgroundId')}
        {renderGrid('Instrumentos', INSTRUMENTS, 'instrumentId', true)}
        {renderGrid('Fontes (Ranking)', FONTS, 'fontId', true)}
        {renderGrid('Molduras (Ranking)', TILES, 'tileId', true)}
      </div>

      <button 
        onClick={handleSave}
        disabled={saving}
        className="w-full mt-6 py-3 bg-[#4ade80] text-black border-4 border-black font-black uppercase text-sm active:translate-y-1 shadow-[4px_4px_0_#000] hover:bg-[#22c55e] transition-colors"
      >
        {saving ? 'EQUIPANDO...' : 'EQUIPAR E FECHAR'}
      </button>
    </div>
  );
};
