import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { Check, Edit3, AlertCircle, FileText } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export default function Assinatura() {
  const { id } = useParams();
  const [contrato, setContrato] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signed, setSigned] = useState(false);
  
  const sigPad = useRef<any>(null);

  useEffect(() => {
    fetchContrato();
  }, [id]);

  const fetchContrato = async () => {
    try {
      const res = await fetch(`/api/contratos/${id}`);
      if (res.ok) {
        const data = await res.json();
        setContrato(data);
        if (data.status === 'assinado') setSigned(true);
      } else {
        toast.error("Contrato não encontrado ou inválido.");
      }
    } catch (e) {
      toast.error("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    sigPad.current?.clear();
  };

  const handleSave = async () => {
    if (sigPad.current?.isEmpty()) {
      return toast.error("Por favor, assine antes de enviar.");
    }

    const assinaturaBase64 = sigPad.current?.getTrimmedCanvas().toDataURL('image/png');

    try {
      setSaving(true);
      const res = await fetch(`/api/contratos/${id}/assinar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assinatura_base64: assinaturaBase64 })
      });

      if (res.ok) {
        setSigned(true);
        toast.success("Assinatura enviada com sucesso!");
      } else {
        toast.error("Erro ao salvar assinatura.");
      }
    } catch (e) {
      toast.error("Erro de conexão ao enviar assinatura.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#feccba] flex items-center justify-center p-4">
        <div className="text-xl font-black text-black uppercase animate-pulse">Carregando Contrato...</div>
      </div>
    );
  }

  if (!contrato) {
    return (
      <div className="min-h-screen bg-[#feccba] flex items-center justify-center p-4">
        <div className="bg-white p-8 border-4 border-black shadow-[8px_8px_0_#000] text-center max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-black text-black uppercase mb-2">Erro</h1>
          <p className="text-sm font-bold text-gray-600">Este link de contrato é inválido ou expirou.</p>
        </div>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen bg-[#feccba] flex flex-col items-center justify-center p-4">
        <Toaster position="top-center" />
        <div className="bg-white p-8 border-4 border-black shadow-[8px_8px_0_#000] text-center max-w-md w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-black">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-black text-black uppercase mb-2 tracking-tight">Tudo Certo!</h1>
          <p className="text-sm font-bold text-gray-600 mb-6">O seu contrato foi assinado e salvo no sistema com sucesso.</p>
          {contrato.assinatura_base64 && (
            <div className="border-2 border-black p-4 bg-[#fff8f6] inline-block mb-4">
              <img src={contrato.assinatura_base64} alt="Sua Assinatura" className="max-h-24 mx-auto" />
            </div>
          )}
          <p className="text-xs font-black text-gray-400 uppercase">Você já pode fechar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a0f0a] flex flex-col md:flex-row">
      <Toaster position="top-center" />
      
      {/* Esquerda: Leitura do Contrato */}
      <div className="w-full md:w-2/3 h-[50vh] md:h-screen overflow-auto bg-gray-100 p-4 md:p-8 custom-scrollbar">
        <div className="max-w-3xl mx-auto bg-white shadow-xl min-h-full">
          <div dangerouslySetInnerHTML={{ __html: contrato.conteudo_html }} className="pdf-container pointer-events-none" />
        </div>
      </div>

      {/* Direita: Área de Assinatura */}
      <div className="w-full md:w-1/3 h-[50vh] md:h-screen bg-[#feccba] p-6 flex flex-col border-t-8 md:border-t-0 md:border-l-8 border-black">
        <div className="mb-6">
          <h2 className="text-2xl font-black text-black uppercase tracking-tighter flex items-center gap-2 mb-2">
            <Edit3 className="w-6 h-6" /> Assinatura Digital
          </h2>
          <p className="text-xs font-bold text-[#8e7164]">
            Leia o contrato ao lado e assine no quadro abaixo usando o mouse ou o dedo.
          </p>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="bg-white border-4 border-black shadow-[4px_4px_0_#000] flex-1 mb-4 rounded-xl overflow-hidden relative">
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10">
              <FileText className="w-24 h-24" />
            </div>
            <SignatureCanvas 
              ref={sigPad}
              penColor="black"
              canvasProps={{ className: 'w-full h-full cursor-crosshair' }}
            />
          </div>

          <div className="flex gap-4 shrink-0">
            <button 
              onClick={handleClear}
              className="px-4 py-3 bg-white text-black border-4 border-black font-black uppercase text-sm shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all w-1/3"
            >
              LIMPAR
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-3 bg-[#ff6b00] text-white border-4 border-black font-black uppercase text-sm shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all flex-1 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {saving ? 'ENVIANDO...' : 'CONFIRMAR ASSINATURA'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
