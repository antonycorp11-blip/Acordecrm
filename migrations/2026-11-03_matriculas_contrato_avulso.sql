-- Contrato avulso totalmente configurável (aulas, intervalo, duração, observações no contrato).
-- Aplicada no Supabase em 2026-11-03.
alter table public.matriculas add column if not exists tipo_contrato text not null default 'padrao';   -- 'padrao' | 'avulso'
alter table public.matriculas add column if not exists duracao_aula_minutos integer;                    -- duração configurada (avulso)
alter table public.matriculas add column if not exists intervalo_dias integer;                          -- dias entre aulas (7 = semanal)
alter table public.matriculas add column if not exists observacoes_contrato text;                       -- texto livre que entra no contrato
-- Obs.: foram criadas por engano aulas.revisao_status e aulas.revisao_em (não usadas); podem ser removidas:
--   alter table public.aulas drop column if exists revisao_status;
--   alter table public.aulas drop column if exists revisao_em;
