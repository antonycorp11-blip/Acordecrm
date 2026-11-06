-- Professor Virtual: leituras de diagnóstico, sem áudio. Aplicada em produção em 06/11/2026.
create table if not exists public.diagnosticos_professor_virtual (
  id uuid primary key default gen_random_uuid(),
  exercicio text,
  dados jsonb not null,
  criado_por text,
  created_at timestamptz default now()
);
