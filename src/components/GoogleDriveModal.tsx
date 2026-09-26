import React, { useState, useEffect } from 'react';
import { HardDrive, CheckCircle2, AlertCircle, RefreshCw, Key, X, Trash2, Link2, Unlink, Database } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../services/apiClient';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DriveStatus {
  conectado: boolean;
  temCredenciaisApp?: boolean;
  conta?: string;
  limiteBytes?: number;
  usadoBytes?: number;
  usoPct?: number;
  videos?: number;
  bytesVideos?: number;
  videoMaisAntigo?: string | null;
  retencaoDias: number;
  alertaPct: number;
  alerta?: boolean;
  redirectUri?: string;
}

const formatBytes = (b?: number) => {
  const v = Number(b) || 0;
  if (v >= 1024 ** 3) return `${(v / 1024 ** 3).toFixed(2)} GB`;
  if (v >= 1024 ** 2) return `${(v / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.round(v / 1024)} KB`;
};

export function GoogleDriveModal({ isOpen, onClose }: GoogleDriveModalProps) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [retencao, setRetencao] = useState(7);
  const [alertaPct, setAlertaPct] = useState(80);
  const [diasLimpeza, setDiasLimpeza] = useState(3);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/drive/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        setRetencao(data.retencaoDias || 7);
        setAlertaPct(data.alertaPct || 80);
      }
    } catch (e) {
      console.error('Erro ao buscar status do Google Drive:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadStatus();
  }, [isOpen]);

  const post = async (url: string, body: any) => {
    const res = await apiFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Erro na operação');
    return data;
  };

  const salvarCredenciais = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await post('/api/drive/config', { clientId, ...(clientSecret ? { clientSecret } : {}) });
      toast.success('Credenciais salvas. Agora clique em "Conectar minha conta Google".');
      setClientSecret('');
      await loadStatus();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const conectar = async () => {
    setBusy(true);
    try {
      const res = await apiFetch('/api/drive/oauth/start');
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Não foi possível iniciar a conexão.');
      window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message);
      setBusy(false);
    }
  };

  const salvarPreferencias = async () => {
    setBusy(true);
    try {
      await post('/api/drive/config', { retencaoDias: retencao, alertaPct });
      toast.success('Preferências salvas!');
      await loadStatus();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const limparAgora = async () => {
    if (!window.confirm(`Apagar do Google Drive os vídeos de treino com mais de ${diasLimpeza} dia(s)? Eles vão para a lixeira do Drive (recuperáveis por 30 dias).`)) return;
    setBusy(true);
    try {
      const r = await post('/api/drive/limpar', { dias: diasLimpeza });
      toast.success(`${r.apagados} vídeo(s) apagado(s), ${formatBytes(r.bytes)} liberados.`);
      await loadStatus();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const backupAgora = async () => {
    setBusy(true);
    try {
      const r = await post('/api/backup/agora', {});
      if (r.ok) toast.success(`Backup salvo no Drive (${formatBytes(r.bytes)}).`);
      else toast.error(r.motivo || 'Backup não realizado.');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const desconectar = async () => {
    if (!window.confirm('Desconectar o Google Drive? Os arquivos já enviados continuam no Drive, mas novos vídeos de treino ficam bloqueados até reconectar.')) return;
    setBusy(true);
    try {
      await post('/api/drive/desconectar', {});
      toast.success('Google Drive desconectado.');
      await loadStatus();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  const pct = status?.usoPct || 0;
  const barraCor = pct >= (status?.alertaPct || 80) ? 'bg-red-600' : pct >= 60 ? 'bg-yellow-400' : 'bg-emerald-500';

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-4 overflow-y-auto font-['Space_Mono']">
      <div className="bg-[#fff8f6] border-8 border-black w-full max-w-lg p-6 relative shadow-[12px_12px_0_#000] max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 bg-black text-white p-2 border-2 border-white" title="Fechar">
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <HardDrive className="w-6 h-6 text-[#ff6b00]" />
          <h2 className="text-xl font-black uppercase italic text-black">Google Drive da escola</h2>
        </div>
        <p className="text-[9px] font-black text-[#8e7164] uppercase mb-5">
          Vídeos de treino ficam só no Drive (nunca no Supabase) e são apagados automaticamente.
        </p>

        {loading ? (
          <div className="py-10 text-center font-black text-xs uppercase animate-pulse">Carregando...</div>
        ) : status?.conectado ? (
          <div className="space-y-5">
            <div className="flex items-center gap-2 bg-emerald-50 border-4 border-emerald-600 p-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <p className="font-black text-xs uppercase text-emerald-800">Conectado</p>
                <p className="text-[10px] font-bold text-emerald-900 truncate">{status.conta}</p>
              </div>
            </div>

            {/* Sensor de espaço */}
            <div className="border-4 border-black bg-white p-4 space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase">
                <span>Espaço usado na conta</span>
                <span>{formatBytes(status.usadoBytes)} de {formatBytes(status.limiteBytes)} ({pct}%)</span>
              </div>
              <div className="w-full h-4 border-2 border-black bg-stone-100">
                <div className={`h-full ${barraCor}`} style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
              <p className="text-[10px] font-bold text-[#8e7164]">
                Vídeos de treino: <b>{status.videos}</b> arquivo(s), {formatBytes(status.bytesVideos)}
                {status.videoMaisAntigo ? ` • mais antigo de ${new Date(status.videoMaisAntigo).toLocaleDateString('pt-BR')}` : ''}
              </p>
              {status.alerta && (
                <p className="flex items-center gap-1 text-[10px] font-black uppercase text-red-700">
                  <AlertCircle className="w-4 h-4" /> Espaço acima de {status.alertaPct}%: apague vídeos antigos.
                </p>
              )}
            </div>

            {/* Exclusão automática e alerta */}
            <div className="border-4 border-black bg-white p-4 space-y-3">
              <p className="font-black text-xs uppercase">Exclusão automática</p>
              <label className="flex items-center justify-between gap-2 text-[10px] font-black uppercase">
                Apagar vídeos com mais de
                <span className="flex items-center gap-1">
                  <input type="number" min={1} max={365} value={retencao} onChange={(e) => setRetencao(Number(e.target.value))} className="w-16 border-2 border-black p-1 text-center font-black" />
                  dias
                </span>
              </label>
              <label className="flex items-center justify-between gap-2 text-[10px] font-black uppercase">
                Me avisar por e-mail quando o Drive passar de
                <span className="flex items-center gap-1">
                  <input type="number" min={10} max={99} value={alertaPct} onChange={(e) => setAlertaPct(Number(e.target.value))} className="w-16 border-2 border-black p-1 text-center font-black" />
                  %
                </span>
              </label>
              <button onClick={salvarPreferencias} disabled={busy} className="w-full bg-black text-white py-2 font-black text-xs uppercase border-2 border-black disabled:opacity-50">
                Salvar preferências
              </button>
            </div>

            {/* Limpeza manual */}
            <div className="border-4 border-black bg-white p-4 space-y-3">
              <p className="font-black text-xs uppercase">Apagar agora</p>
              <label className="flex items-center justify-between gap-2 text-[10px] font-black uppercase">
                Vídeos com mais de
                <span className="flex items-center gap-1">
                  <input type="number" min={1} value={diasLimpeza} onChange={(e) => setDiasLimpeza(Number(e.target.value))} className="w-16 border-2 border-black p-1 text-center font-black" />
                  dias
                </span>
              </label>
              <button onClick={limparAgora} disabled={busy} className="w-full bg-red-600 text-white py-2 font-black text-xs uppercase border-2 border-black flex items-center justify-center gap-2 disabled:opacity-50">
                <Trash2 className="w-4 h-4" /> Apagar vídeos antigos
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={backupAgora} disabled={busy} className="bg-[#ff6b00] text-white py-2 font-black text-[10px] uppercase border-2 border-black flex items-center justify-center gap-1 disabled:opacity-50">
                <Database className="w-4 h-4" /> Backup do banco agora
              </button>
              <button onClick={desconectar} disabled={busy} className="bg-white text-black py-2 font-black text-[10px] uppercase border-2 border-black flex items-center justify-center gap-1 disabled:opacity-50">
                <Unlink className="w-4 h-4" /> Desconectar
              </button>
            </div>
            <button onClick={loadStatus} disabled={busy} className="w-full text-[10px] font-black uppercase flex items-center justify-center gap-1 text-[#8e7164]">
              <RefreshCw className="w-3 h-3" /> Atualizar
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-start gap-2 bg-yellow-50 border-4 border-yellow-500 p-3">
              <AlertCircle className="w-5 h-5 text-yellow-700 shrink-0 mt-0.5" />
              <p className="text-[10px] font-bold text-yellow-900">
                Drive não conectado: os alunos não conseguem enviar vídeos de treino até a conexão ser feita.
              </p>
            </div>

            <ol className="list-decimal pl-5 space-y-1.5 text-[10px] font-bold text-black">
              <li>Acesse <b>console.cloud.google.com</b> com a conta Google da escola e crie um projeto.</li>
              <li>Em <b>APIs e serviços → Biblioteca</b>, ative a <b>Google Drive API</b>.</li>
              <li>Em <b>Tela de consentimento OAuth</b>, escolha "Externo", preencha o nome do app e <b>publique</b> o app (evita que a conexão expire em 7 dias).</li>
              <li>Em <b>Credenciais → Criar credenciais → ID do cliente OAuth</b>, tipo <b>Aplicativo da Web</b>.</li>
              <li>
                Em "URIs de redirecionamento autorizados", adicione:
                <code className="block bg-black text-[#00ff41] p-2 mt-1 break-all text-[9px]">{status?.redirectUri || 'https://acordecrm.vercel.app/api/drive/oauth/callback'}</code>
              </li>
              <li>Copie o <b>Client ID</b> e o <b>Client Secret</b> para os campos abaixo.</li>
            </ol>

            <form onSubmit={salvarCredenciais} className="space-y-3 border-4 border-black bg-white p-4">
              <label className="block text-[10px] font-black uppercase">
                Client ID
                <input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder={status?.temCredenciaisApp ? '(já cadastrado)' : '000000-xxxx.apps.googleusercontent.com'} className="w-full border-2 border-black p-2 mt-1 font-bold text-xs" />
              </label>
              <label className="block text-[10px] font-black uppercase">
                Client Secret
                <input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder={status?.temCredenciaisApp ? '(já cadastrado)' : 'GOCSPX-...'} className="w-full border-2 border-black p-2 mt-1 font-bold text-xs" />
              </label>
              <button type="submit" disabled={busy || !clientId} className="w-full bg-black text-white py-2 font-black text-xs uppercase flex items-center justify-center gap-2 disabled:opacity-50">
                <Key className="w-4 h-4" /> Salvar credenciais
              </button>
            </form>

            <button onClick={conectar} disabled={busy || !status?.temCredenciaisApp} className="w-full bg-[#00FF41] text-black py-3 font-black text-sm uppercase border-4 border-black shadow-[4px_4px_0_#000] flex items-center justify-center gap-2 disabled:opacity-40">
              <Link2 className="w-5 h-5" /> Conectar minha conta Google
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
