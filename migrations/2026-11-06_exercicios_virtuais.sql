-- Professor Virtual: exercícios da escola que o aluno treina com o microfone do celular.
-- AINDA NÃO APLICADA. Sem RLS por enquanto, como as demais tabelas da escola: o backend ainda usa a anon key.
-- Ligar o RLS junto com as outras tabelas quando o backend tiver chave própria.
create table if not exists public.exercicios_virtuais (
  id bigserial primary key,
  titulo text not null,
  instrumento text not null check (instrumento in ('violao', 'teclado')),
  descricao text,
  bpm integer,
  passos jsonb not null default '[]'::jsonb,   -- [{ midis: number[], rotulo?, duracaoMs?, dica? }]
  ativo boolean not null default true,
  criado_por text,
  created_at timestamptz not null default now()
);
