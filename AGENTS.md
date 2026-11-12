# AGENTS.md — Acorde CRM (Studio Acorde, escola de música em Cuiabá)

Instruções para agentes de código (Codex, Claude Code etc.). O dono da escola não é programador:
responda em **português simples**, curto, sem jargão.

## Stack
- Frontend: React + Vite + Tailwind (`src/`). Páginas em `src/pages`, componentes em `src/components`.
- Backend: Express em **`api/index.ts`** (um arquivo só), publicado como função na Vercel. `server.ts` só importa `api/index.ts` para rodar local.
- Banco: Supabase (Postgres), projeto `ojfnqcajbhvlqtprrfxg`. O backend usa supabase-js com a service key. RLS desligado na maioria das tabelas. Migrações SQL ficam em `migrations/` (aplicadas à mão no Supabase).
- Deploy: a Vercel publica automaticamente o que entra na branch **`main`**.
- Checagens antes de subir: `npm run lint` (tsc --noEmit) e `npm run build`.

## Regras de negócio importantes
- Fuso: America/Cuiaba. Use os helpers `getDateBR` / `getMesAtualBR` de `api/index.ts`.
- Supabase devolve no máximo 1000 linhas: use `fetchAllRows` / `fetchAllPages`.
- Aulas (`aulas.status`): pendente, confirmada, aguardando_confirmacao, realizada, falta_aluno, falta, reposicao, a_repor, cancelada. Data `2099-12-31` = reposição ainda sem data.
- Professor recebe **R$30 por aula realizada** (`STATUS_AULA_PAGA=['realizada']`), pago no mês seguinte. Teto de R$500/mês para Juan (id 2) e Vitória (id 17). Prêmio de R$30 por matrícula vinda da aula experimental do professor, **fora do teto**. Cálculo em `calcularFolhaProfessores` / `calcularPremiosMatricula`.
- Dono da escola = professor cujo nome contém "aquilles" (`isDonoPorNome`, `requireAdminOuDono`).
- Meta: 60 matrículas (20 em 11/2026, 20 em 12/2026, 20 em 01/2027), contando toda matrícula nova. Endpoint `GET /api/painel/meta-e-equipe`, card `src/components/dashboard/PainelMetaEquipe.tsx`.
- Leads: status em_atendimento / aula_marcada / matriculado / sem_interesse. Origens: trafego_pago, instagram, google, indicacao, outros.
- Link público de cadastro de lead: `/cadastro` (`src/pages/CadastroLead.tsx`, rotas `/api/publico/*`). Cada lead novo manda push (OneSignal) para admin e dono (`notificarNovoLead`).
- Remarketing: `src/pages/Remarketing.tsx` (feito para tablet), `GET /api/remarketing`, tabela `remarketing_contatos`. Contato é feito **manualmente, um por um**, via links `https://wa.me/55{telefone}?text=...` — **nunca** envio em massa.
- Contratos: `forma_pagamento` (mensal, cartao_credito, pix, dinheiro), `tipo_contrato` (padrao, avulso), vigência só para à vista/avulso.
- Arquivar aluno chama `limparAgendaFinanceiroDeAluno` (apaga aulas e parcelas futuras).
- Campos de formulário nunca podem ter texto branco em fundo branco (há uma proteção em `src/utils/campoLegivel.ts`).

## Cuidados
- Não apague dados nem rode UPDATE/DELETE em massa no banco sem o dono confirmar. Faça backup (`create table backup_AAAAMMDD_x as select ...`) antes de mudanças grandes.
- Decisões pendentes do dono (não fazer sozinho): limpeza dos ex-alunos arquivados e dívidas antigas, realocação de alunos entre professores, remover as colunas sem uso `aulas.revisao_status` e `aulas.revisao_em`.

## Trabalho em andamento: importar contatos antigos do WhatsApp
Objetivo: colocar no CRM os 2–3 mil números de 2,5 anos de conversas do WhatsApp Business (tablet Android),
**só os números**, agrupados por mês, para o dono chamar 10 por dia manualmente.

1. Extração (feito): o dono gera um backup com **chave de 64 dígitos** e envia `msgstore.db.crypt15`
   (pasta `Android/media/com.whatsapp.w4b/WhatsApp Business/Databases/`).
   - Descriptografar: `pip install wa-crypt-tools` e `wadecrypt <chave64> msgstore.db.crypt15 msgstore.db`.
   - Gerar a planilha: `python tools/extrair-contatos-backup.py msgstore.db contatos.csv`
     (colunas: telefone; primeira_conversa; ultima_conversa; mes_primeira; mensagens; mensagens_da_escola; ultima_fala). Não copia o conteúdo das mensagens.
   - `tools/exportar-contatos-whatsapp.js` (script do WhatsApp Web) foi descartado: o Web só sincroniza poucos meses.
2. Importação (a fazer): tabela nova (ex.: `contatos_whatsapp`: telefone único, primeira_conversa, ultima_conversa, mes, status, tentativas, ultimo_contato_em, lead_id),
   ignorando números que já são alunos ou leads (comparar pelos últimos 8 dígitos, como em `/api/publico/lead`). Upload do CSV por uma tela admin ou script.
3. "Missão do dia" (a fazer): 10 contatos por dia na tela de Remarketing (tablet), botão do WhatsApp com mensagem pronta,
   resultado do contato (respondeu, não respondeu, interessado, não quer, número inválido), nova tentativa após 3 dias, no máximo 2 tentativas; "interessado" vira lead.
4. Depois: gamificação para o dono (avatar pixel reaproveitando `AvatarPixel`, XP por contato/matrícula/aula dada, sequência de dias, conquistas).
