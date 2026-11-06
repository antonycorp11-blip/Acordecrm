import React from 'react';

// Página pública exigida pelo Google (OAuth) e pela LGPD
export default function Privacidade({ tipo = 'privacidade' }: { tipo?: 'privacidade' | 'termos' }) {
  const ehTermos = tipo === 'termos';
  return (
    <div className="min-h-screen bg-[#fff8f6] text-[#261812] px-4 py-10" style={{ fontFamily: "'Space Mono', monospace" }}>
      <div className="max-w-2xl mx-auto space-y-5 text-sm leading-relaxed">
        <h1 className="text-2xl font-black uppercase text-[#ff6b00]">
          Studio Acorde – {ehTermos ? 'Termos de Uso' : 'Política de Privacidade'}
        </h1>
        <p className="text-xs text-[#8e7164]">
          STUDIO ACORDE ESCOLA DE MUSICA LTDA • CNPJ 55.273.720/0001-12 • Av. Newton Rabello, 26, Pedra 90, Cuiabá - MT •
          Contato: studio.acorde01@gmail.com • Atualizado em 26/09/2026
        </p>

        {ehTermos ? (
          <>
            <p>O Studio Acorde CRM é o sistema de gestão da escola, usado por alunos, responsáveis, professores e pela administração.</p>
            <p>O acesso é pessoal e intransferível. O usuário é responsável por manter sua senha em sigilo e por usar o sistema apenas para as atividades da escola.</p>
            <p>Os conteúdos pedagógicos, vídeos e materiais disponibilizados são de uso exclusivo dos alunos matriculados.</p>
            <p>As condições comerciais (mensalidades, reposições, cancelamento) são as do contrato de prestação de serviços assinado com a escola.</p>
            <p>Dúvidas: studio.acorde01@gmail.com.</p>
          </>
        ) : (
          <>
            <h2 className="font-black uppercase">1. Dados que coletamos</h2>
            <p>Dados de cadastro e matrícula (nome, e-mail, telefone, CPF, endereço, dados do responsável), informações das aulas (agenda, presença, fichas pedagógicas), pagamentos e, no aplicativo, vídeos de treino enviados pelo próprio aluno.</p>

            <h2 className="font-black uppercase">2. Para que usamos</h2>
            <p>Para prestar os serviços de ensino musical, organizar a agenda, emitir cobranças e contratos, acompanhar a evolução do aluno e enviar avisos sobre aulas e pagamentos por e-mail e notificações.</p>

            <h2 className="font-black uppercase">3. Uso do Google Drive</h2>
            <p>O sistema se conecta à conta Google da própria escola, com a permissão restrita aos arquivos criados pelo sistema. Ele é usado apenas para armazenar os vídeos de treino dos alunos (apagados automaticamente após o prazo definido pela escola), materiais das fichas de aula e cópias de segurança do banco de dados da escola. O sistema não acessa outros arquivos do Drive e não compartilha esses dados com terceiros.</p>

            <h2 className="font-black uppercase">4. Compartilhamento</h2>
            <p>Os dados não são vendidos. São processados apenas pelos serviços necessários ao funcionamento do sistema (hospedagem, banco de dados, envio de e-mails e notificações).</p>

            <h2 className="font-black uppercase">5. Seus direitos (LGPD)</h2>
            <p>O titular pode solicitar acesso, correção ou exclusão dos seus dados, e se opor ao uso de imagem, pelo e-mail studio.acorde01@gmail.com.</p>

            <h2 className="font-black uppercase">6. Segurança e retenção</h2>
            <p>O acesso é protegido por login e perfis de permissão. Os dados são mantidos enquanto durar o vínculo com a escola e pelo prazo exigido por lei.</p>
          </>
        )}
      </div>
    </div>
  );
}
