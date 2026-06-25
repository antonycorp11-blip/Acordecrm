import React, { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

export function GlobalUpdater() {
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [newVersionInfo, setNewVersionInfo] = useState<{ versao: string; changelog: string } | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Fetch initial version
    fetch('/api/sistema/versao')
      .then(res => res.json())
      .then(data => {
        if (data && data.versao) {
          setCurrentVersion(data.versao);
        }
      })
      .catch(err => console.error('Erro ao buscar versão inicial:', err));

    // Poll every 1 minute
    const interval = setInterval(() => {
      fetch('/api/sistema/versao')
        .then(res => res.json())
        .then(data => {
          if (data && data.versao) {
            setCurrentVersion(prev => {
              if (prev && prev !== data.versao) {
                setNewVersionInfo(data);
                setShowModal(true);
                return prev; // keep old version in state so we know it's outdated
              }
              return data.versao;
            });
          }
        })
        .catch(err => console.error('Erro ao buscar versão:', err));
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  if (!showModal || !newVersionInfo) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3 text-emerald-600">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <h2 className="text-xl font-bold text-slate-800">Nova Atualização!</h2>
          </div>
          <button 
            onClick={() => setShowModal(false)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-slate-600 mb-4">
          Uma nova versão do sistema (<strong>{newVersionInfo.versao}</strong>) acabou de ser lançada e está disponível.
        </p>
        
        {newVersionInfo.changelog && (
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">O que há de novo:</h3>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{newVersionInfo.changelog}</p>
          </div>
        )}
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar Agora
          </button>
        </div>
      </div>
    </div>
  );
}
