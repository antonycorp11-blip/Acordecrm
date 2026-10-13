-- Forma de pagamento da matrícula (mensal x à vista) e opção de uso de imagem no contrato.
-- Aplicada no Supabase em 2026-10-13.
alter table public.matriculas add column if not exists forma_pagamento text not null default 'mensal'; -- 'mensal' | 'cartao_credito' | 'pix' | 'dinheiro'
alter table public.matriculas add column if not exists parcelas_cartao integer;  -- nº de parcelas na fatura do cartão (pagamento à vista no cartão)
alter table public.matriculas add column if not exists vigencia_meses integer;   -- vigência do contrato em meses
alter table public.contratos add column if not exists autoriza_uso_imagem boolean; -- escolha feita pelo contratante no ato da assinatura
