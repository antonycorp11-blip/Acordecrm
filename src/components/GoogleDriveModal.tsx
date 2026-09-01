import React, { useState, useEffect } from 'react';
import { HardDrive, CheckCircle2, AlertCircle, RefreshCw, Key, Folder, ExternalLink, X, HelpCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GoogleDriveModal({ isOpen, onClose }: GoogleDriveModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{
    isConfigured: boolean;
    folderId: string;
    clientEmail?: string | null;
    storageProvider: string;
  } | null>(null);

  const [credentialsJson, setCredentialsJson] = useState('');
  const [folderId, setFolderId] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('acorde_token');
      const res = await fetch('/api/drive/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (data.folderId) setFolderId(data.folderId);
      }
    } catch (e) {
      console.error('Erro ao buscar status do Google Drive:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('acorde_token');
      const res = await fetch('/api/drive/config', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          credentialsJson: credentialsJson.trim() || undefined,
          folderId: folderId.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar configurações.');

      toast.success(data.message || 'Configurações do Google Drive salvas com sucesso!');
      setCredentialsJson('');
      await loadStatus();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const token = localStorage.getItem('acorde_token');
      const res = await fetch('/api/drive/test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(data.message || 'Conexão com Google Drive bem-sucedida! 🟢');
      } else {
        toast.error(data.error || 'Falha no teste com o Google Drive.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao testar conexão.');
    } finally {
      setTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 overflow-y-auto font-['Space_Mono']">
      <div className="bg-[#1A1A1A] border-4 border-white text-white w-full max-w-2xl p-6 shadow-[8px_8px_0_#000] relative max-h-[90vh] flex flex-col space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-white/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00FF41] border-2 border-black flex items-center justify-center text-black shadow-[2px_2px_0_#fff]">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                GOOGLE DRIVE INTEGRATION <span className="text-[9px] bg-[#FF8A00] text-black px-2 py-0.5 font-bold">MÍDIAS & ÁUDIOS</span>
              </h2>
              <p className="text-[10px] text-white/60 font-bold uppercase">
                Armazenamento de gravações e vídeos fora do Supabase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-white/60 hover:text-white border border-white/20 hover:border-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Card */}
        {loading ? (
          <div className="p-8 text-center text-xs uppercase animate-pulse">
            Verificando status do Google Drive...
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto pr-1">
            <div className={`p-4 border-2 flex items-center justify-between ${
              status?.isConfigured 
                ? 'bg-[#00FF41]/10 border-[#00FF41] text-[#00FF41]' 
                : 'bg-[#FF8A00]/10 border-[#FF8A00] text-[#FF8A00]'
            }`}>
              <div className="flex items-center gap-3">
                {status?.isConfigured ? (
                  <CheckCircle2 className="w-6 h-6 shrink-0" />
                ) : (
                  <AlertCircle className="w-6 h-6 shrink-0" />
                )}
                <div>
                  <h4 className="font-black text-xs uppercase">
                    {status?.isConfigured ? 'GOOGLE DRIVE CONECTADO & ATIVO' : 'GOOGLE DRIVE PENDENTE'}
                  </h4>
                  <p className="text-[9px] text-white/80 mt-0.5">
                    {status?.isConfigured 
                      ? `Áudios e vídeos de treinos são enviados diretamente ao Google Drive. Conta: ${status.clientEmail || 'Service Account'}`
                      : 'Arquivos estão usando fallback temporário. Configure as credenciais abaixo para evitar limites no Supabase.'}
                  </p>
                </div>
              </div>
              {status?.isConfigured && (
                <button
                  onClick={handleTest}
                  disabled={testing}
                  className="px-3 py-1.5 bg-white text-black border-2 border-black text-[9px] font-black uppercase shadow-[2px_2px_0_#000] hover:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1 shrink-0"
                >
                  <RefreshCw className={`w-3 h-3 ${testing ? 'animate-spin' : ''}`} />
                  {testing ? 'TESTANDO...' : 'TESTAR'}
                </button>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-white/80 flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-[#FF8A00]" /> ID da Pasta do Google Drive
                </label>
                <input
                  type="text"
                  placeholder="ex: 1EHXi800HrwkDWOgd-l0lXKtQZkMlSFyV"
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  className="w-full bg-black border-2 border-white/20 p-2 text-xs font-mono text-white focus:border-[#00FF41] outline-none"
                />
                <p className="text-[8px] text-white/40">
                  O ID que fica na URL da pasta do Google Drive: https://drive.google.com/drive/folders/<strong>ID_DA_PASTA</strong>
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black uppercase text-white/80 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-[#FF8A00]" /> JSON da Service Account (Chave do Google Cloud)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowInstructions(!showInstructions)}
                    className="text-[9px] text-[#00FF41] hover:underline flex items-center gap-1"
                  >
                    <HelpCircle className="w-3 h-3" /> {showInstructions ? 'Ocultar passo a passo' : 'Como criar a chave?'}
                  </button>
                </div>
                <textarea
                  rows={4}
                  placeholder='Cole aqui o JSON da Service Account (ex: { "type": "service_account", "project_id": "...", "private_key": "..." })'
                  value={credentialsJson}
                  onChange={(e) => setCredentialsJson(e.target.value)}
                  className="w-full bg-black border-2 border-white/20 p-2 text-[10px] font-mono text-white focus:border-[#00FF41] outline-none resize-none"
                />
              </div>

              {/* Instructions Accordion */}
              {showInstructions && (
                <div className="p-3 bg-white/5 border border-white/20 text-[9px] space-y-2 text-white/80">
                  <p className="font-bold text-white uppercase flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#00FF41]" /> Passo a passo gratuito (Google Cloud &amp; Drive):
                  </p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Acesse o <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-[#00FF41] underline">Google Cloud Console</a> e crie um projeto.</li>
                    <li>Em <strong>APIs e Serviços</strong> &gt; <strong>Biblioteca</strong>, ative a <strong>Google Drive API</strong>.</li>
                    <li>Em <strong>Contas de Serviço (Service Accounts)</strong>, crie uma conta (ex: <code>acorde-drive</code>).</li>
                    <li>Clique na conta criada &gt; <strong>Chaves</strong> &gt; <strong>Adicionar Chave</strong> &gt; <strong>Criar nova chave (JSON)</strong>.</li>
                    <li>No seu Google Drive pessoal ou da escola, crie uma pasta (ex: <code>Acorde Mídias</code>) e <strong>compartilhe</strong> com o e-mail da conta de serviço (com permissão de <strong>Editor</strong>).</li>
                    <li>Cole o conteúdo do arquivo JSON baixado no campo acima e salve!</li>
                  </ol>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#00FF41] text-black border-2 border-black py-2.5 font-black uppercase text-xs shadow-[4px_4px_0_#fff] hover:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50"
                >
                  {saving ? 'SALVANDO...' : 'SALVAR CONFIGURAÇÕES'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 bg-transparent border-2 border-white/40 text-white py-2.5 font-bold uppercase text-xs hover:border-white transition-colors"
                >
                  FECHAR
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
