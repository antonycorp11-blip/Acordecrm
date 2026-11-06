-- Professor Virtual: modelos de calibração do violão compartilhados pela equipe.
-- Aplicada em produção em 06/11/2026. Sem RLS por enquanto, como as demais tabelas da escola: o backend ainda usa a anon key.
-- Ligar o RLS junto com as outras tabelas quando o backend tiver chave própria.
create table if not exists public.modelos_violao (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  mapa jsonb not null,
  ativo boolean not null default true,
  criado_por text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
