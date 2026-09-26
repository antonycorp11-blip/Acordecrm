-- =====================================================================
-- SEGURANÇA DO BANCO (RLS) — Studio Acorde CRM
--
-- NÃO RODAR antes de:
--   1. Adicionar SUPABASE_SERVICE_ROLE_KEY nas variáveis da Vercel (Production)
--   2. Publicar a versão nova do backend (api/index.ts), que usa essa chave
--
-- Este script NÃO altera nem apaga nenhum dado. Ele só liga a proteção por
-- linha (RLS). Depois dele, a chave pública (anon) que está no site deixa de
-- conseguir ler/alterar as tabelas. O backend continua funcionando porque usa
-- a service_role, que ignora o RLS.
--
-- Para desfazer em caso de problema: rodar o bloco "REVERTER" no fim.
-- =====================================================================

-- 1) Liga RLS em todas as tabelas do schema public que ainda não têm
do $$
declare t record;
begin
  for t in
    select c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
  loop
    execute format('alter table public.%I enable row level security', t.relname);
  end loop;
end $$;

-- 2) Jogos que gravam direto do navegador com a chave pública continuam funcionando
--    (Voice Rush: repita_leaderboard; Ritmo Pro: ritmo_pro_ranking; players: leitura)
create policy "jogos_leitura_publica" on public.repita_leaderboard for select to anon, authenticated using (true);
create policy "jogos_insercao_publica" on public.repita_leaderboard for insert to anon, authenticated with check (true);
create policy "jogos_atualizacao_publica" on public.repita_leaderboard for update to anon, authenticated using (true) with check (true);

create policy "jogos_leitura_publica" on public.ritmo_pro_ranking for select to anon, authenticated using (true);
create policy "jogos_insercao_publica" on public.ritmo_pro_ranking for insert to anon, authenticated with check (true);

create policy "jogos_leitura_publica" on public.players for select to anon, authenticated using (true);

-- 3) Tabela do extrato de pontos (o backend já grava nela, mas ela não existia;
--    sem ela o extrato mostra valores estimados). Tabela nova e vazia.
create table if not exists public.aluno_pontos_detalhes (
  id bigserial primary key,
  aluno_id bigint not null,
  categoria text not null,
  subcategoria text,
  pontos bigint not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists aluno_pontos_detalhes_aluno_idx on public.aluno_pontos_detalhes (aluno_id);
alter table public.aluno_pontos_detalhes enable row level security;

-- =====================================================================
-- REVERTER (somente se algo parar de funcionar):
--
-- do $$
-- declare t record;
-- begin
--   for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
--            where n.nspname = 'public' and c.relkind = 'r'
--              and c.relname not in ('acordelot_player_saves', 'acordelot_online_rooms')
--   loop
--     execute format('alter table public.%I disable row level security', t.relname);
--   end loop;
-- end $$;
-- =====================================================================
