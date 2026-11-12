import React, { useEffect, useState } from 'react';
import { Flame, Trophy, Zap, Target, Users, ArrowRight, AlertTriangle } from 'lucide-react';
import { apiFetch, APP_RESUMED_EVENT, getStoredCache, setStoredCache } from '../../services/apiClient';

const brl = (v: number) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
const ddmm = (d: string) => (d ? d.slice(8, 10) + '/' + d.slice(5, 7) : '');

const FRASES = [
  'Quem marca experimental, matricula. Bora encher a agenda!',
  'Ligue hoje para 5 leads antigos: cada "sim" é um aluno a mais.',
  'Cada matrícula é mais uma pessoa tocando música por sua causa.',
  'Ritmo vence talento: uma matrícula por dia muda o ano da escola.',
  'Resposta rápida no WhatsApp fecha matrícula. Não deixe lead esfriar.',
  'Peça indicação para quem já é aluno: é a matrícula mais barata que existe.',
  'A meta não espera: o que você fizer hoje aparece aqui amanhã.'
];

export function PainelMetaEquipe() {
  const [dados, setDados] = useState<any>(() => getStoredCache('dashboard_meta_equipe', null));
  const [verTodos, setVerTodos] = useState(false);

  const carregar = () => {
    apiFetch('/api/painel/meta-e-equipe')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) { setDados(d); setStoredCache('dashboard_meta_equipe', d); } })
      .catch(() => {});
  };

  useEffect(() => {
    carregar();
    const t = window.setInterval(carregar, 60000); // tempo real: atualiza a cada minuto
    window.addEventListener(APP_RESUMED_EVENT, carregar);
    return () => { window.clearInterval(t); window.removeEventListener(APP_RESUMED_EVENT, carregar); };
  }, []);

  if (!dados) return null;
  const { meta, equipe, plano } = dados;
  const atual = meta.meses.find((m: any) => m.situacao === 'atual') || meta.meses.find((m: any) => m.situacao === 'futuro') || meta.meses[meta.meses.length - 1];
  const faltamMes = Math.max(0, atual.meta - atual.feitas);
  const diasRest = Math.max(1, atual.dias_restantes || 1);
  const projecao = atual.dia_atual ? Math.round((atual.feitas / Math.max(1, atual.dia_atual)) * atual.dias_no_mes) : atual.feitas;
  const batida = atual.feitas >= atual.meta;
  const noRitmo = !batida && projecao >= atual.meta;
  const porSemana = Math.ceil((faltamMes / diasRest) * 7);
  const cadaQuantosDias = faltamMes > 0 ? (diasRest / faltamMes) : 0;
  const pctTotal = meta.total ? Math.min(100, Math.round((meta.feitas_total / meta.total) * 100)) : 0;
  const frase = FRASES[Math.floor(Date.now() / 86400000) % FRASES.length];
  const fimMeta = meta.meses[meta.meses.length - 1];

  const status = batida
    ? { txt: 'META DO MÊS BATIDA!', cor: 'bg-yellow-300 text-black', Icone: Trophy }
    : noRitmo
      ? { txt: 'NO RITMO', cor: 'bg-[#00FF41] text-black', Icone: Flame }
      : { txt: 'ACELERA!', cor: 'bg-black text-[#ffdd00]', Icone: Zap };

  return (
    <div className="grid grid-cols-3 gap-5 items-start">
      {/* ================= META DE MATRÍCULAS ================= */}
      <div className="col-span-2 rounded-lg p-5 text-white" style={{ background: '#ff6b00', border: '3px solid #261812', boxShadow: '6px 6px 0 #261812' }}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-6 h-6" />
            <p className="font-black uppercase tracking-widest text-sm">Meta: {meta.total} matrículas até {fimMeta.dias_no_mes}/{fimMeta.mes.slice(0, 2)}</p>
          </div>
          <span className={`flex items-center gap-1 px-3 py-1 border-2 border-black font-black text-xs uppercase ${status.cor}`}>
            <status.Icone className="w-4 h-4" /> {status.txt}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-5 items-stretch">
          {/* total */}
          <div className="col-span-2 flex flex-col justify-between">
            <div>
              <div className="font-black leading-none" style={{ fontSize: 64 }}>
                {meta.feitas_total}<span className="text-white/70" style={{ fontSize: 32 }}>/{meta.total}</span>
              </div>
              <p className="text-xs font-black uppercase mt-1">{pctTotal}% da meta · faltam {Math.max(0, meta.total - meta.feitas_total)}</p>
            </div>
            <div className="mt-3 space-y-2">
              {meta.meses.map((m: any) => (
                <div key={m.mes}>
                  <div className="flex justify-between text-[10px] font-black uppercase">
                    <span>{m.nome}{m.situacao === 'atual' ? ' (agora)' : ''}</span>
                    <span>{m.feitas}/{m.meta}</span>
                  </div>
                  <div className="h-3 bg-black/30 border-2 border-black mt-0.5">
                    <div className={`h-full ${m.feitas >= m.meta ? 'bg-yellow-300' : 'bg-white'}`} style={{ width: `${Math.min(100, (m.feitas / Math.max(1, m.meta)) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* quadradinhos do mês atual */}
          <div className="col-span-3 bg-[#261812] border-2 border-black p-4 flex flex-col">
            <div className="flex items-baseline justify-between mb-3">
              <p className="font-black uppercase text-sm">{atual.nome}: {atual.feitas} de {atual.meta}</p>
              <p className="text-[11px] font-black uppercase text-[#feccba]">{atual.situacao === 'atual' ? `${atual.dias_restantes} dia(s) restantes` : 'começa em breve'}</p>
            </div>
            <div className="grid grid-cols-10 gap-1.5 mb-3">
              {Array.from({ length: Math.max(atual.meta, atual.feitas) }).map((_, i) => {
                const feita = i < atual.feitas;
                const aluno = atual.alunos[atual.feitas - 1 - i];
                return (
                  <div key={i} title={feita && aluno ? `${aluno.nome} (${ddmm(aluno.data)})` : ''}
                    className={`aspect-square border-2 border-black flex items-center justify-center text-[10px] font-black ${feita ? (i >= atual.meta ? 'bg-yellow-300 text-black' : 'bg-[#00FF41] text-black') : 'bg-white/10 text-white/40'}`}>
                    {feita ? '✓' : i + 1}
                  </div>
                );
              })}
            </div>
            <div className="text-[12px] font-bold leading-snug mt-auto space-y-1">
              {batida ? (
                <p className="text-yellow-300 font-black">Meta do mês batida! Cada matrícula a mais agora é bônus para a meta total.</p>
              ) : (
                <>
                  <p>Faltam <b className="text-[#00FF41]">{faltamMes}</b>: uma matrícula a cada <b>{cadaQuantosDias.toFixed(1).replace('.', ',')} dia(s)</b> (≈ {porSemana} por semana).</p>
                  {atual.situacao === 'atual' && <p className="text-[#feccba]">No ritmo de agora você fecha o mês com <b className="text-white">{projecao}</b>.</p>}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 mt-4 pt-3 border-t-2 border-black/30 text-xs font-black uppercase">
          <span>Hoje: {meta.hoje} matrícula(s){meta.ultima ? ` · Última: ${meta.ultima.nome} (${ddmm(meta.ultima.data)})` : ''}</span>
          <span className="normal-case font-bold italic text-right">"{frase}"</span>
        </div>
      </div>

      {/* ================= EQUIPE E PLANO ================= */}
      <div className="rounded-lg p-4 flex flex-col max-h-[356px] overflow-y-auto custom-scrollbar" style={{ background: '#fff8f6', border: '3px solid #261812', boxShadow: '4px 4px 0 #261812' }}>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-[#ff6b00]" />
          <p className="text-[#261812] font-black uppercase text-xs tracking-widest">Equipe em {dados.mes_atual_nome || 'este mês'}</p>
        </div>
        <p className="text-[10px] font-bold text-[#8e7164] uppercase mb-2">
          Salário de {dados.mes_atual_nome || 'este mês'} é pago em {dados.mes_pagamento_nome || 'no mês seguinte'}. "Já ganhou" = aulas dadas até hoje. "Previsto" = se todas as aulas agendadas até o fim do mês acontecerem. R$ 30 por aula · teto R$ 500 (Juan e Vitória) · prêmio R$ 30 por matrícula, fora do teto.
        </p>
        <div className="space-y-2">
          {equipe.map((p: any) => (
            <div key={p.id} className="bg-white border-2 border-black p-2">
              <div className="flex justify-between items-baseline text-[11px] font-black uppercase text-[#261812]">
                <span className="truncate">{p.nome}</span>
                <span>Já ganhou {brl(p.valor_realizado)}</span>
              </div>
              <div className={`text-[10px] font-black uppercase mt-0.5 ${p.alerta === 'acima' ? 'text-red-600' : p.alerta === 'perto' ? 'text-orange-600' : 'text-[#8e7164]'}`}>
                Previsto até o fim do mês: {brl(p.valor_projetado)}{p.teto ? ` (teto ${brl(p.teto)})` : ''}
              </div>
              {p.teto && (
                <div className="h-2 bg-[#feccba] border border-black mt-1">
                  <div className={`h-full ${p.alerta === 'acima' ? 'bg-red-600' : p.alerta === 'perto' ? 'bg-orange-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, p.pct_teto || 0)}%` }} />
                </div>
              )}
              <div className="flex justify-between text-[10px] font-bold text-[#8e7164] mt-1">
                <span>{p.aulas_realizadas} dada(s) · {p.aulas_previstas} agendada(s) até o fim do mês</span>
                <span title={(p.premios_alunos || []).join(', ')}>{p.premios_qtd ? `🏅 ${p.premios_qtd} matrícula(s) +${brl(p.premios_valor)}` : 'sem prêmio ainda'}</span>
              </div>
              {p.aulas_sem_marcacao > 0 && <p className="text-[10px] font-black text-orange-600 uppercase mt-1">{p.aulas_sem_marcacao} aula(s) já passaram sem presença marcada (+{brl(p.valor_sem_marcacao)} se forem dadas)</p>}
              {p.alerta === 'acima' && <p className="text-[10px] font-black text-red-600 uppercase mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Do jeito que a agenda está, passa do teto</p>}
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t-2 border-[#261812]">
          <p className="text-[#261812] font-black uppercase text-xs mb-1">Alunos que viriam para você ({plano.viriam_para_voce.length})</p>
          <p className="text-[10px] font-bold text-[#8e7164] mb-2">
            Sua semana: {plano.aulas_semana_hoje} aulas → {plano.aulas_semana_com_plano} com o plano · {plano.horarios_livres} horários livres ({plano.horarios_livres_nobres} no fim da tarde/sábado)
          </p>
          <div className="space-y-1">
            {(verTodos ? plano.viriam_para_voce : plano.viriam_para_voce.slice(0, 8)).map((a: any) => (
              <div key={`${a.aluno_id}-${a.dia}-${a.hora}`} className="flex items-center gap-2 text-[11px] font-bold text-[#261812] bg-white border border-black px-2 py-1">
                <span className="font-black w-16 shrink-0">{a.dia} {a.hora}</span>
                <span className="truncate flex-1">{a.nome}</span>
                <span className="text-[9px] text-[#8e7164] shrink-0 flex items-center gap-0.5">{a.professor.split(' ')[0]} <ArrowRight className="w-3 h-3" /> você</span>
              </div>
            ))}
            {plano.viriam_para_voce.length === 0 && <p className="text-[11px] font-bold text-[#8e7164]">Ninguém precisa vir: todos cabem no teto dos professores.</p>}
          </div>
          {plano.viriam_para_voce.length > 8 && (
            <button onClick={() => setVerTodos(!verTodos)} className="text-[10px] font-black uppercase text-[#ff6b00] mt-1">{verTodos ? 'ver menos' : `ver todos (${plano.viriam_para_voce.length})`}</button>
          )}
          {plano.precisam_remarcar.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] font-black uppercase text-red-600">Precisam trocar de horário ({plano.precisam_remarcar.length})</p>
              {plano.precisam_remarcar.map((a: any) => (
                <p key={`${a.aluno_id}-${a.dia}-${a.hora}`} className="text-[10px] font-bold text-[#261812]">{a.dia} {a.hora} · {a.nome} ({a.professor.split(' ')[0]}): {a.motivo}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
