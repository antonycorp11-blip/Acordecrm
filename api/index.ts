import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import dotenv from 'dotenv';
import { dirname, join, resolve } from 'path';
import multer from 'multer';
import { execSync } from 'child_process';
import nodemailer from 'nodemailer';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

// Mês de referência atual (MM/AAAA) no fuso de Cuiabá
function getMesAtualBR() {
    const [y, m] = getDateBR().split('-');
    return `${m}/${y}`;
}

function getDateBR() {
    return new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');
}

// pdf-parse é importado dinamicamente para evitar crash no módulo

const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;

if (!isVercel) {
  dotenv.config();
}

const JWT_SECRET = process.env.JWT_SECRET || 'studio-acorde-secret-key-2024';
// Supabase projeta respostas em no máximo 1000 linhas; usado para paginar consultas grandes
const PAGE_SIZE = 1000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Setup multer for local uploads
const ROOT_DIR = process.cwd();
const uploadDir = isVercel ? '/tmp/uploads' : join(ROOT_DIR, 'public', 'uploads');
try {
  if (!isVercel && !fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (e) {
  console.warn('Could not create upload dir:', e);
}
const upload = multer({ dest: uploadDir, limits: { fileSize: 150 * 1024 * 1024 } });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://ojfnqcajbhvlqtprrfxg.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZm5xY2FqYmh2bHF0cHJyZnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNTI2MDMsImV4cCI6MjEwMjkyODYwM30.5yGrdipKkLNO6xx3whdE-6a2ub5MjEfVFEdxfqHlIbg';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL ERROR: Supabase credentials are missing!');
}

// O backend usa a service_role (ignora RLS) quando configurada; a anon key fica só como fallback
// até a variável SUPABASE_SERVICE_ROLE_KEY ser adicionada na Vercel.
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!supabaseServiceKey) {
  console.warn('[SEGURANÇA] SUPABASE_SERVICE_ROLE_KEY não configurada: backend usando anon key.');
}
if (!process.env.JWT_SECRET) {
  console.warn('[SEGURANÇA] JWT_SECRET não configurado: usando chave padrão do código.');
}

const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseServiceKey || supabaseAnonKey || 'placeholder', {
  auth: { persistSession: false, autoRefreshToken: false }
});

// E-mail do dono (God Mode). Comparação exata, nunca por prefixo.
const OWNER_EMAIL = 'antonycorp11@gmail.com';
const ONESIGNAL_APP_ID = 'e5e38375-5fd8-4e92-bf0d-29996ba9426d';
// Caixa que recebe os avisos da direção (relatório diário, confirmações de aula, resumo semanal)
const EMAIL_AVISOS_DONO = 'santiagoaquilles11@gmail.com';
const isOwner = (req: any) => String(req.user?.email || '').toLowerCase().trim() === OWNER_EMAIL;

// Escapa curingas do ILIKE para comparar e-mails sem diferenciar maiúsculas/minúsculas
const escapeLike = (value: string) => String(value || '').trim().replace(/[\\%_]/g, (m) => `\\${m}`);

// Soma meses mantendo o dia desejado; se o mês não tiver esse dia, usa o último dia do mês
// (evita que vencimentos dia 29/30/31 pulem fevereiro).
function addMonthsKeepDay(base: Date, months: number, day: number): Date {
    const y = base.getUTCFullYear();
    const m = base.getUTCMonth() + months;
    const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return new Date(Date.UTC(y, m, Math.min(day, lastDay), 12));
}

// Converte 'YYYY-MM-DD' (ou Date) em Date UTC ao meio-dia, independente do fuso do servidor
function parseDateOnly(value: any): Date {
    if (value instanceof Date) return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 12));
    const s = String(value || '').substring(0, 10);
    const [y, m, d] = s.split('-').map(Number);
    if (!y || !m || !d) {
        const hoje = getDateBR().split('-').map(Number);
        return new Date(Date.UTC(hoje[0], hoje[1] - 1, hoje[2], 12));
    }
    return new Date(Date.UTC(y, m - 1, d, 12));
}

const toDateStr = (d: Date) => d.toISOString().split('T')[0];
const toRefMesAno = (d: Date) => `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;

// Gera as datas de vencimento de N parcelas a partir da primeira data
function gerarVencimentos(primeira: any, quantidade: number, diaVencimento?: any): Date[] {
    const inicio = parseDateOnly(primeira);
    const dia = Number(diaVencimento) || inicio.getUTCDate();
    const datas: Date[] = [];
    for (let i = 0; i < Math.max(1, Number(quantidade) || 1); i++) {
        datas.push(i === 0 ? inicio : addMonthsKeepDay(inicio, i, dia));
    }
    return datas;
}

const fetchAllGamificacaoProgresso = async (supabaseClient: any) => {
    // 1. Obter o total de registros para paginar em paralelo
    const { count, error: countError } = await supabaseClient
        .from('gamificacao_progresso')
        .select('*', { count: 'exact', head: true });
        
    if (countError || count === null || count === 0) return [];

    const step = 1000;
    const promises = [];
    
    for (let from = 0; from < count; from += step) {
        promises.push(
            supabaseClient
                .from('gamificacao_progresso')
                .select('*, conquista:conquista_id(*)')
                .order('id', { ascending: true })
                .range(from, from + step - 1)
        );
    }
    
    // Executar todas as requisições simultaneamente (bypass Vercel timeout)
    const results = await Promise.all(promises);
    let allData: any[] = [];
    for (const res of results) {
        if (res.data) allData = allData.concat(res.data);
    }
    return allData;
};

let hasSyncedProvaTrophies = false;
let syncProvaTrophiesPromise: Promise<void> | null = null;

// Lê todas as linhas de uma consulta paginando (o Supabase limita cada resposta a 1000 linhas)
const fetchAllRows = async (buildQuery: () => any) => {
    let all: any[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        all = all.concat(data || []);
        if (!data || data.length < PAGE_SIZE) break;
    }
    return all;
};

// Garante retroativamente que quem passou numa prova tenha o troféu e a aula concluída.
// Roda uma vez por instância do servidor e só insere o que falta (nunca altera pontos existentes).
const syncProvaTrophiesAndScores = async (supabaseClient: any) => {
    if (hasSyncedProvaTrophies) return;
    if (syncProvaTrophiesPromise) return syncProvaTrophiesPromise;
    syncProvaTrophiesPromise = (async () => {
        try {
            const { data: modulos } = await supabaseClient.from('modulos_trilha').select('id, conquista_id');
            const { data: aulas } = await supabaseClient.from('aulas_trilha').select('id, conquista_id');

            const tentativas = await fetchAllRows(() => supabaseClient
                .from('tentativas_questionario_trilha')
                .select('id, aluno_id, modulo_trilha_id, aula_trilha_id')
                .eq('aprovado', true)
                .order('id', { ascending: true }));

            if (tentativas.length > 0) {
                const currentProgresso = await fetchAllRows(() => supabaseClient
                    .from('gamificacao_progresso')
                    .select('id, aluno_id, conquista_id')
                    .order('id', { ascending: true }));
                const existingUserConqSet = new Set(currentProgresso.map((p: any) => `${p.aluno_id}_${p.conquista_id}`));

                const trilhaProgresso = await fetchAllRows(() => supabaseClient
                    .from('progresso_trilha')
                    .select('id, aluno_id, aula_id')
                    .order('id', { ascending: true }));
                const existingAulaSet = new Set(trilhaProgresso.map((p: any) => `${p.aluno_id}_${p.aula_id}`));

                const trofeuInserts: { aluno_id: number; conquista_id: number }[] = [];
                const aulaInserts: { aluno_id: number; aula_id: number }[] = [];

                for (const tent of tentativas) {
                    let targetConqId: number | null = null;
                    if (tent.modulo_trilha_id) {
                        const mod = (modulos || []).find((m: any) => Number(m.id) === Number(tent.modulo_trilha_id));
                        if (mod?.conquista_id) targetConqId = Number(mod.conquista_id);
                    } else if (tent.aula_trilha_id) {
                        const aul = (aulas || []).find((a: any) => Number(a.id) === Number(tent.aula_trilha_id));
                        if (aul?.conquista_id) targetConqId = Number(aul.conquista_id);
                    }

                    const conqKey = `${tent.aluno_id}_${targetConqId}`;
                    if (targetConqId && !existingUserConqSet.has(conqKey)) {
                        trofeuInserts.push({ aluno_id: tent.aluno_id, conquista_id: targetConqId });
                        existingUserConqSet.add(conqKey);
                    }

                    const aulaKey = `${tent.aluno_id}_${tent.aula_trilha_id}`;
                    if (tent.aula_trilha_id && !existingAulaSet.has(aulaKey)) {
                        aulaInserts.push({ aluno_id: Number(tent.aluno_id), aula_id: Number(tent.aula_trilha_id) });
                        existingAulaSet.add(aulaKey);
                    }
                }

                if (trofeuInserts.length > 0) {
                    console.log(`[SYNC PROVA TROPHIES] Concedendo ${trofeuInserts.length} troféus retroativos...`);
                    await supabaseClient.from('gamificacao_progresso').insert(trofeuInserts);
                }
                if (aulaInserts.length > 0) {
                    await supabaseClient.from('progresso_trilha').insert(aulaInserts);
                }
            }

            hasSyncedProvaTrophies = true;
        } catch (err) {
            console.error('[SYNC PROVA TROPHIES ERROR]:', err);
        } finally {
            syncProvaTrophiesPromise = null;
        }
    })();
    return syncProvaTrophiesPromise;
};

// Ranking da temporada ativa: XP base + troféus da temporada ativa (alunos arquivados ficam de fora)
const calcularRanking = async (progressoPronto?: any[]) => {
    const { data: tempAtiva } = await supabase
        .from('temporadas')
        .select('id')
        .eq('status', 'ativa')
        .maybeSingle();
    const activeTempId = tempAtiva?.id || 3;

    const { data: alunos, error: alunosError } = await supabase
        .from('alunos')
        .select('id, nome, xp, foto_url, avatar_config, acorde_coins')
        .neq('status', 'arquivado');
    if (alunosError) console.error('Erro ao buscar alunos para ranking:', alunosError);

    const progresso = progressoPronto || await fetchAllGamificacaoProgresso(supabase);
    const progPorAluno = new Map<number, any[]>();
    progresso.forEach((p: any) => {
        const lista = progPorAluno.get(p.aluno_id) || [];
        lista.push(p);
        progPorAluno.set(p.aluno_id, lista);
    });

    return (alunos || []).map((al: any) => {
        const prog = progPorAluno.get(al.id) || [];
        const progTemporada = prog.filter((p: any) => p.conquista?.temporada_id === activeTempId);
        const xpConquistas = progTemporada.reduce((acc: number, p: any) => acc + (p.conquista?.pontos || 0), 0);
        const xpTotal = (Number(al.xp) || 0) + xpConquistas;

        const conquistasMap: any = {};
        prog.forEach((p: any) => {
            const cid = p.conquista_id;
            if (!conquistasMap[cid]) {
                conquistasMap[cid] = { ...p.conquista, count: 0 };
            }
            conquistasMap[cid].count++;
        });

        return {
            id: al.id,
            nome: al.nome,
            foto_url: al.foto_url,
            avatar_config: al.avatar_config,
            acorde_coins: al.acorde_coins,
            xp: xpTotal,
            xp_aulas: Number(al.xp) || 0,
            xp_conquistas: xpConquistas,
            curso_ativo: 'MÚSICA',
            conquistas: Object.values(conquistasMap)
        };
    }).sort((a: any, b: any) => b.xp - a.xp);
};

// Valor da aula do professor: menos de 10 alunos ativos = R$ 35; 10 ou mais = R$ 30
const VALOR_AULA_POUCOS_ALUNOS = 35;
const VALOR_AULA_MUITOS_ALUNOS = 30;
const LIMITE_ALUNOS_VALOR_AULA = 10;

// ---------------------------------------------------------------------
// MENSALIDADES: regras únicas usadas por Dashboard, Relatórios, e-mails e assistente
// - "cancelado" nunca é dívida
// - valor de parcela em aberto = mensalidade com desconto da matrícula (igual à tela Financeiro)
// - valor de parcela paga = valor efetivamente pago (valor_pago) ou, se não registrado, o valor da parcela
// - parcela vencida só é "em atraso" se o aluno NÃO pagou nenhuma mensalidade com vencimento posterior;
//   se pagou, ela vai para "para conferir" (provável baixa esquecida)
// ---------------------------------------------------------------------
const STATUS_EM_ABERTO = ['pendente', 'atrasado'];
const unRel = (x: any) => (Array.isArray(x) ? x[0] : x);

const valorEmAberto = (p: any) => {
    const valor = Number(p.valor) || 0;
    const mat = unRel(p.matriculas) || unRel(p.matricula);
    const desc = Number(mat?.valor_com_desconto) || 0;
    return desc > 0 ? Math.min(valor || desc, desc) : valor;
};
const valorPago = (p: any) => Number(p.valor_pago != null ? p.valor_pago : p.valor) || 0;
const valorMensalidade = (p: any) => (p.status === 'pago' ? valorPago(p) : valorEmAberto(p));
// Mês de referência da parcela (MM/AAAA); usa o vencimento quando a referência não existe
const refDaParcela = (p: any) => (/^\d{2}\/\d{4}$/.test(String(p.referencia_mes_ano || '')) ? p.referencia_mes_ano : toRefMesAno(parseDateOnly(p.data_vencimento)));
const intervaloDoMes = (mesAno: string) => {
    const [m, y] = mesAno.split('/');
    const inicio = `${y}-${m.padStart(2, '0')}-01`;
    const fim = toDateStr(new Date(Date.UTC(Number(y), Number(m), 0, 12)));
    return { inicio, fim };
};
const refOrdenavel = (ref: string) => { const [m, y] = ref.split('/'); return `${y}-${m}`; };

const calcularSituacaoMensalidades = async (hoje: string) => {
    const pags = await fetchAllRows(() => supabase.from('pagamentos')
        .select('id, aluno_id, valor, valor_pago, status, data_vencimento, data_pagamento, referencia_mes_ano, tipo_receita, matriculas:matricula_id(valor_com_desconto), alunos:aluno_id(nome, status, telefone, responsavel_telefone)')
        .eq('tipo_receita', 'mensalidade')
        .not('aluno_id', 'is', null)
        .order('id', { ascending: true }));

    const ultimoPagoPorAluno: Record<number, string> = {};
    pags.forEach((p: any) => {
        if (p.status === 'pago' && p.data_vencimento && (!ultimoPagoPorAluno[p.aluno_id] || p.data_vencimento > ultimoPagoPorAluno[p.aluno_id])) {
            ultimoPagoPorAluno[p.aluno_id] = p.data_vencimento;
        }
    });

    const emAtraso: Record<number, any> = {};
    const paraConferir: Record<number, any> = {};
    const hojeMs = parseDateOnly(hoje).getTime();
    pags.forEach((p: any) => {
        const aluno = unRel(p.alunos);
        if (!aluno || aluno.status === 'arquivado') return;
        if (!STATUS_EM_ABERTO.includes(p.status) || !p.data_vencimento || p.data_vencimento >= hoje) return;
        const pagouDepois = (ultimoPagoPorAluno[p.aluno_id] || '') > p.data_vencimento;
        const alvo = pagouDepois ? paraConferir : emAtraso;
        const item = alvo[p.aluno_id] ||= {
            aluno_id: p.aluno_id, nome: aluno.nome,
            telefone: aluno.telefone || aluno.responsavel_telefone || null,
            parcelas: [] as any[], total: 0
        };
        const valor = valorEmAberto(p);
        item.parcelas.push({ pagamento_id: p.id, referencia: refDaParcela(p), vencimento: p.data_vencimento, valor, dias_atraso: Math.floor((hojeMs - parseDateOnly(p.data_vencimento).getTime()) / 86400000) });
        item.total += valor;
    });

    const fechar = (obj: Record<number, any>) => Object.values(obj).map((a: any) => {
        a.parcelas.sort((x: any, y: any) => x.vencimento.localeCompare(y.vencimento));
        a.total = Math.round(a.total * 100) / 100;
        a.vencimento_mais_antigo = a.parcelas[0].vencimento;
        a.dias_atraso = a.parcelas[0].dias_atraso;
        a.ultimo_pagamento = ultimoPagoPorAluno[a.aluno_id] || null;
        return a;
    }).sort((a: any, b: any) => b.dias_atraso - a.dias_atraso);

    return { pags, emAtraso: fechar(emAtraso), paraConferir: fechar(paraConferir) };
};

// Status que geram pagamento ao professor
const STATUS_AULA_PAGA = ['realizada', 'falta_aluno'];
// Aulas ainda por acontecer que entram na previsão (inclui reposições já remarcadas)
const STATUS_AULA_PREVISTA = ['pendente', 'confirmada', 'aguardando_confirmacao', 'reposicao', 'a_repor'];

const isDonoPorNome = (nome: string) => {
    const n = String(nome || '').toLowerCase();
    return n.includes('aquilles') || n.includes('áquilles');
};

// Folha de um mês de aulas (MM/AAAA): calculada ao vivo a partir da agenda.
// Valor da aula conforme o nº de alunos distintos que o professor atende NAQUELE mês.
const calcularFolhaProfessores = async (mesAno: string, professorId?: number) => {
    const [mStr, yStr] = String(mesAno).split('/');
    const inicio = `${yStr}-${mStr.padStart(2, '0')}-01`;
    const fim = toDateStr(new Date(Date.UTC(Number(yStr), Number(mStr), 0, 12)));

    const aulas = await fetchAllRows(() => {
        let q = supabase.from('aulas')
            .select('id, professor_id, aluno_id, status, tipo, data, alunos(status), professores(nome)')
            .gte('data', inicio)
            .lte('data', fim)
            .not('professor_id', 'is', null)
            .in('status', [...STATUS_AULA_PAGA, ...STATUS_AULA_PREVISTA])
            .order('id', { ascending: true });
        if (professorId) q = q.eq('professor_id', professorId);
        return q;
    });

    const porProf: Record<number, any> = {};
    aulas.forEach((a: any) => {
        const prof: any = Array.isArray(a.professores) ? a.professores[0] : a.professores;
        const aluno: any = Array.isArray(a.alunos) ? a.alunos[0] : a.alunos;
        if (isDonoPorNome(prof?.nome)) return;
        const paga = STATUS_AULA_PAGA.includes(a.status);
        // Aula futura de aluno arquivado não deve acontecer: fica fora da previsão
        if (!paga && aluno?.status === 'arquivado') return;

        const p = porProf[a.professor_id] ||= {
            professor_id: a.professor_id,
            professor_nome: prof?.nome || `Professor ${a.professor_id}`,
            alunos: new Set<number>(),
            aulas_realizadas: 0,
            aulas_previstas: 0,
            reposicoes_realizadas: 0,
            reposicoes_previstas: 0
        };
        if (a.aluno_id) p.alunos.add(a.aluno_id);
        const ehReposicao = a.tipo === 'reposicao' || a.status === 'reposicao' || a.status === 'a_repor';
        if (paga) {
            p.aulas_realizadas++;
            if (ehReposicao) p.reposicoes_realizadas++;
        } else {
            p.aulas_previstas++;
            if (ehReposicao) p.reposicoes_previstas++;
        }
    });

    const professores = Object.values(porProf).map((p: any) => {
        const qtdAlunos = p.alunos.size;
        const valorAula = valorAulaPorQtdAlunos(qtdAlunos);
        return {
            professor_id: p.professor_id,
            professor_nome: p.professor_nome,
            alunos_no_mes: qtdAlunos,
            valor_aula: valorAula,
            aulas_realizadas: p.aulas_realizadas,
            aulas_previstas: p.aulas_previstas,
            reposicoes_realizadas: p.reposicoes_realizadas,
            reposicoes_previstas: p.reposicoes_previstas,
            valor_realizado: p.aulas_realizadas * valorAula,
            valor_previsto_total: (p.aulas_realizadas + p.aulas_previstas) * valorAula
        };
    }).sort((a: any, b: any) => b.valor_previsto_total - a.valor_previsto_total);

    return {
        mes_aulas: `${mStr.padStart(2, '0')}/${yStr}`,
        professores,
        total_realizado: professores.reduce((acc: number, p: any) => acc + p.valor_realizado, 0),
        total_previsto: professores.reduce((acc: number, p: any) => acc + p.valor_previsto_total, 0)
    };
};

const mesAnterior = (mesAno: string) => {
    const [m, y] = mesAno.split('/').map(Number);
    return m === 1 ? `12/${y - 1}` : `${String(m - 1).padStart(2, '0')}/${y}`;
};

const valorAulaPorQtdAlunos = (qtdAlunos: number) =>
    qtdAlunos >= LIMITE_ALUNOS_VALOR_AULA ? VALOR_AULA_MUITOS_ALUNOS : VALOR_AULA_POUCOS_ALUNOS;

const addToFeed = async (aluno_id: number, tipo: string, mensagem: string, icone: string) => {
    try {
        await supabase.from('feed_atividades').insert([{
            aluno_id,
            tipo,
            mensagem,
            icone
        }]);
    } catch (e) {
        console.error('Erro ao adicionar no feed:', e);
    }
};

// Middleware JWT
const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    // Ignorar rotas não-API e rotas públicas da API
    if (!req.path.startsWith('/api/')) return next();
    
    const publicRoutes = ['/api/ping', '/api/auth/login', '/api/auth/register', '/api/auth/verify', '/api/auth/check-student', '/api/auth/setup-password', '/api/vagas', '/api/sistema/versao', '/api/cron/cleanup-videos', '/api/cron/backup', '/api/drive/oauth/callback'];
    // Link de assinatura enviado por e-mail: o contratante não está logado
    const isPublicContrato = req.method === 'GET' && /^\/api\/contratos\/[0-9a-f-]{36}$/i.test(req.path) && !token;
    const isPublicAssinatura = req.method === 'POST' && /^\/api\/contratos\/[0-9a-f-]{36}\/assinar$/i.test(req.path) && !token;
    if (publicRoutes.includes(req.path) || isPublicContrato || isPublicAssinatura) return next();

    if (token == null) return res.status(401).json({ error: 'Acesso negado: Token não fornecido.' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.status(403).json({ error: 'Acesso negado: Token inválido ou expirado.' });
        req.user = user;

        try {
            const exp = user.exp;
            const now = Math.floor(Date.now() / 1000);
            if (exp && exp - now < 30 * 24 * 60 * 60) {
                const refreshedToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '180d' });
                res.setHeader('x-refreshed-token', refreshedToken);
            }
        } catch (_) {}

        next();
    });
};

// Middleware para validar se o usuário é Administrador
const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado: Apenas administradores.' });
    }
    next();
};

// Administrador ou professor (equipe da escola)
const isStaff = (req: any) => req.user?.role === 'admin' || req.user?.role === 'professor';
const requireStaff = (req: any, res: any, next: any) => {
    if (!isStaff(req)) {
        return res.status(403).json({ error: 'Acesso negado: Apenas equipe da escola.' });
    }
    next();
};

// Exclusivo do dono (God Mode)
const requireOwner = (req: any, res: any, next: any) => {
    if (!isOwner(req)) {
        return res.status(403).json({ error: 'Acesso negado: God Mode exclusivo.' });
    }
    next();
};

// Id do aluno ligado ao usuário logado (o admin aquilles1213 usa a ficha de teste)
const getAlunoIdDoUsuario = async (req: any): Promise<number | null> => {
    if (req._alunoIdCache !== undefined) return req._alunoIdCache;
    const email = String(req.user?.email || '').toLowerCase().trim();
    const searchEmail = email === 'aquilles1213@gmail.com' ? 'teste@teste.com' : email;
    let alunoId: number | null = null;
    if (searchEmail) {
        const { data } = await supabase.from('alunos').select('id').ilike('email', escapeLike(searchEmail)).limit(1).maybeSingle();
        alunoId = data?.id ?? null;
    }
    req._alunoIdCache = alunoId;
    return alunoId;
};

// Equipe acessa qualquer aluno; aluno só acessa a própria ficha
const requireSelfOrStaff = (param: string = 'id', source: 'params' | 'body' = 'params') => async (req: any, res: any, next: any) => {
    if (isStaff(req)) return next();
    const alvo = Number(req[source]?.[param] ?? req[source]?.alunoId);
    const meuId = await getAlunoIdDoUsuario(req);
    if (!meuId || !alvo || Number(meuId) !== alvo) {
        return res.status(403).json({ error: 'Acesso negado: você só pode acessar seus próprios dados.' });
    }
    next();
};

function isHoliday(date: Date) {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const fixedHolidays = [
        '1-1', '21-4', '1-5', '7-9', '12-10', '2-11', '15-11', '20-11', '25-12'
    ];

    if (fixedHolidays.includes(`${day}-${month}`)) return true;

    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const monthEaster = Math.floor((h + l - 7 * m + 114) / 31);
    const dayEaster = ((h + l - 7 * m + 114) % 31) + 1;

    const easter = new Date(year, monthEaster - 1, dayEaster);
    const carnival = new Date(easter); carnival.setDate(easter.getDate() - 47);
    const goodFriday = new Date(easter); goodFriday.setDate(easter.getDate() - 2);
    const corpusChristi = new Date(easter); corpusChristi.setDate(easter.getDate() + 60);

    const check = (d1: Date, d2: Date) => d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth();
    return check(date, carnival) || check(date, goodFriday) || check(date, corpusChristi);
}

async function startServer() {
    const app = express();
    const port = 3000;

    app.set('trust proxy', 1);
    app.use(cors());
    app.use(express.json({ limit: '5mb' }));

    // Limita tentativas nas rotas de login/cadastro (proteção contra força bruta)
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 30,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' }
    });
    app.use(['/api/auth/login', '/api/auth/register', '/api/auth/setup-password', '/api/auth/check-student'], authLimiter);

    // Middleware to log requests
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.url}`);
        next();
    });


    // --- SEGURANÇA ---
    app.use(authenticateToken);

    // --- API ROUTES ---
    // --- CONTRATOS ---
    const CLAUSULAS_PADRAO_CONTRATO = [
        "REPOSIÇÕES E REAGENDAMENTOS: A reposição de faltas será concedida exclusivamente mediante apresentação de atestado ou receita médica. Fica permitido o reagendamento de aulas no limite de apenas 1 (uma) vez ao mês.",
        "DA ADESÃO: A assinatura implica ciência e aceitação integral das condições vigentes. Solicitação de cancelamento posterior não afasta as obrigações assumidas.",
        "DA INADIMPLÊNCIA: Atrasos geram multa de 2% e juros de 1% a.m. Após 30 dias inadimplente, as aulas poderão ser suspensas até regularização, sem direito à reposição.",
        "FALTAS PELA ESCOLA: Cancelamentos motivados pela escola ou professor terão reposição integral em data a combinar.",
        "FERIADOS: Feriados e recessos já compõem o calendário acadêmico anual, não gerando reposição ou desconto.",
        "PORTAL DO ALUNO: Acesso pessoal, intransferível e gratuito a materiais complementares. Sujeito a manutenções técnicas.",
        "CERTIFICADO: A execução exige conclusão do curso, adimplência financeira e realização das atividades no Portal.",
        "ABANDONO: A ausência injustificada não cancela o contrato. As parcelas seguem devidas até a solicitação formal de cancelamento.",
        "TOLERÂNCIA: Limite de 15 minutos de atraso, sem reposição do tempo perdido, encerrando-se a aula no horário previsto original.",
        "DADOS E IMAGEM: Dados tratados conforme LGPD. Autoriza-se o uso de imagem do aluno para fins institucionais da escola, salvo oposição formal por escrito.",
        "EQUIPAMENTOS: O contratante responsabiliza-se pelo ressarcimento de danos aos equipamentos da escola causados por mau uso. Exclui-se o desgaste natural.",
        "RESCISÃO PELO ALUNO: Vigência pelo período contratado. O cancelamento antecipado gera multa rescisória de 20% sobre o saldo das mensalidades restantes, pagável em até 3 dias úteis.",
        "NORMAS E RESCISÃO PELA ESCOLA: Exige-se respeito às normas. Inadimplência, mau comportamento ou danos ao patrimônio podem gerar advertência ou rescisão imediata do contrato pela escola.",
        "PROFESSORES: A escola reserva-se o direito de substituir professores, horários ou alterar metodologias, não justificando cancelamento isento de multa.",
        "FORO: Eleito o foro da Comarca de Cuiabá-MT para dirimir controvérsias judiciais decorrentes deste contrato."
    ];

    const generateContratoHtml = (params: {
        alunoNome: string;
        responsavelNome?: string | null;
        cpf?: string | null;
        endereco?: string | null;
        cursoNome?: string | null;
        duracaoAula?: string | null;
        qtdAulas?: string | null;
        valorPlano?: string | number | null;
        diaVencimento?: string | number | null;
        qtdParcelas?: string | number | null;
        clausulas?: string[];
        dataAssinatura?: Date;
    }) => {
        const {
            alunoNome,
            responsavelNome,
            cpf = '',
            endereco = '',
            cursoNome = 'Música',
            duracaoAula = '50 minutos',
            qtdAulas = '1 aula por semana',
            valorPlano = '370',
            diaVencimento = '10',
            qtdParcelas = '6',
            clausulas = CLAUSULAS_PADRAO_CONTRATO,
            dataAssinatura = new Date()
        } = params;

        const mesesStr = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
        const dataFormatada = `${dataAssinatura.getDate()} de ${mesesStr[dataAssinatura.getMonth()]} de ${dataAssinatura.getFullYear()}`;

        const isMenorComResp = responsavelNome && responsavelNome.trim() !== '' && responsavelNome.trim().toLowerCase() !== (alunoNome || '').trim().toLowerCase();
        const contratanteTxt = isMenorComResp
            ? `${alunoNome}, representado(a) neste ato por seu Responsável Legal, <strong>${responsavelNome}</strong>, inscrito(a) no CPF/MF sob o nº <strong>${cpf || '_________________'}</strong>, residente e domiciliado à <strong>${endereco || '_____________________________________'}</strong>.`
            : `${alunoNome}, inscrito(a) no CPF/MF sob o nº <strong>${cpf || '_________________'}</strong>, residente e domiciliado à <strong>${endereco || '_____________________________________'}</strong>.`;

        const assinanteNome = isMenorComResp ? responsavelNome : alunoNome;

        const clausulasHtml = clausulas.map((c: string, idx: number) => {
            let text = c.replace(/Vigência de 12 \(doze\) meses/gi, `Vigência de ${qtdParcelas} meses`).replace(/Vigência de 12 meses/gi, `Vigência de ${qtdParcelas} meses`);
            return `<p style="margin-bottom: 10px;"><strong>Cláusula ${idx + 1}ª.</strong> ${text}</p>`;
        }).join('');

        return `
<div style="font-family: serif; font-size: 14px; line-height: 1.5; color: black; padding: 20px; background-color: white;">
    <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="font-size: 20px; font-weight: bold; margin: 0 0 5px 0;">STUDIO ACORDE ESCOLA DE MÚSICA</h1>
        <h2 style="font-size: 16px; font-weight: bold; margin: 0;">CONTRATO DE PRESTAÇÃO DE SERVIÇOS MUSICAIS</h2>
    </div>
    <div style="text-align: justify; margin-bottom: 20px;">
        <p style="margin-bottom: 10px;"><strong>CONTRATADA:</strong> STUDIO ACORDE ESCOLA DE MUSICA LTDA, inscrita no CNPJ/MF sob o nº 55.273.720/0001-12, com sede à AV NEWTON RABELLO, nº 26, Pedra 90, Cuiabá - MT.</p>
        <p style="margin-bottom: 10px;"><strong>CONTRATANTE:</strong> ${contratanteTxt}</p>
        <p style="margin-bottom: 10px;"><strong>CURSO CONTRATADO:</strong> O objeto deste instrumento é o ensino de <strong>${cursoNome}</strong>, sendo <strong>${qtdAulas}</strong>, com duração de <strong>${duracaoAula}</strong> cada.</p>
    </div>
    <div style="text-align: justify; margin-bottom: 20px;">
        ${clausulasHtml}
        <p style="margin-bottom: 10px;"><strong>Cláusula ${clausulas.length + 1}ª.</strong> Em contrapartida aos serviços prestados, o(a) CONTRATANTE pagará o valor certo e ajustado de <strong>R$ ${valorPlano}</strong> por mensalidade, com vencimento todo dia <strong>${diaVencimento}</strong> de cada mês, durante o plano de <strong>${qtdParcelas} meses</strong>.</p>
    </div>
    <div style="text-align: justify; margin-bottom: 40px;">
        <p>E por estarem justas e contratadas, as partes assinam o presente contrato eletronicamente.</p>
        <p style="text-align: right; margin-top: 10px;">Cuiabá - MT, ${dataFormatada}</p>
    </div>
    <div style="display: flex; justify-content: space-between; margin-top: 60px; text-align: center;">
        <div style="width: 45%; border-top: 1px solid black; padding-top: 5px;">
            <p style="font-weight: bold; margin: 0;">STUDIO ACORDE</p>
            <p style="font-size: 10px; margin: 0;">CONTRATADA</p>
        </div>
        <div style="width: 45%; border-top: 1px solid black; padding-top: 5px;">
            <p style="font-weight: bold; margin: 0;">${assinanteNome || 'CONTRATANTE'}</p>
            <p style="font-size: 10px; margin: 0;">CONTRATANTE</p>
        </div>
    </div>
</div>
        `.trim();
    };

    app.get('/api/contratos/template', requireStaff, async (req, res) => {
        try {
            const { data, error } = await supabase.from('contrato_templates').select('*').limit(1).single();
            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is not found
            res.json(data || { clausulas: [] });
        } catch (error: any) {
            console.error('Erro get template:', error);
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/contratos/template', requireAdmin, async (req, res) => {
        try {
            const { clausulas } = req.body;
            // Verifica se ja existe
            const { data: existing } = await supabase.from('contrato_templates').select('id').limit(1).single();
            let result;
            if (existing) {
                result = await supabase.from('contrato_templates').update({ clausulas }).eq('id', existing.id);
            } else {
                result = await supabase.from('contrato_templates').insert([{ nome: 'Padrão', clausulas }]);
            }
            if (result.error) throw result.error;
            res.json({ success: true });
        } catch (error: any) {
            console.error('Erro post template:', error);
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/contratos/enviar', requireAdmin, async (req, res) => {
        try {
            const { aluno_id, dados_dinamicos, conteudo_html, email_aluno } = req.body;

            // 1. Criar registro do contrato no banco
            const { data: contrato, error } = await supabase.from('contratos').insert([{
                aluno_id,
                dados_dinamicos,
                conteudo_html,
                status: 'pendente'
            }]).select().single();

            if (error) throw error;

            // 2. Enviar email
            const { data: configs } = await supabase.from('system_config').select('*');
            let smtpEmail = configs?.find((c: any) => c.key_name === 'SMTP_EMAIL' || c.chave === 'SMTP_EMAIL')?.key_value || configs?.find((c: any) => c.key_name === 'SMTP_EMAIL' || c.chave === 'SMTP_EMAIL')?.valor || process.env.SMTP_EMAIL;
            let smtpPass = configs?.find((c: any) => c.key_name === 'SMTP_PASSWORD' || c.key_name === 'SMTP_PASS' || c.chave === 'SMTP_PASSWORD' || c.chave === 'SMTP_PASS')?.key_value || configs?.find((c: any) => c.key_name === 'SMTP_PASSWORD' || c.key_name === 'SMTP_PASS' || c.chave === 'SMTP_PASSWORD' || c.chave === 'SMTP_PASS')?.valor || process.env.SMTP_PASSWORD || process.env.SMTP_PASS;

            if (!smtpEmail || !smtpPass) {
                throw new Error('Configurações de SMTP (email do estúdio) não encontradas no sistema.');
            }

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: smtpEmail, pass: smtpPass }
            });

            const linkAssinatura = `https://acordecrm.vercel.app/assinatura/${contrato.id}`;

            const emailHtml = `
                <div style="font-family: sans-serif; padding: 20px; background: #fff8f6; border: 4px solid #261812; color: #261812; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #ff6b00; text-transform: uppercase;">STUDIO ACORDE</h2>
                    <p style="font-size: 16px; font-weight: bold;">Olá! Seu contrato de prestação de serviços musicais está pronto.</p>
                    <p>Para concluir sua matrícula, precisamos da sua assinatura digital.</p>
                    <p>Por favor, clique no botão abaixo para ler o contrato e assinar diretamente na tela do seu celular ou computador.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${linkAssinatura}" style="background-color: #ff6b00; color: white; padding: 15px 30px; text-decoration: none; font-weight: bold; border-radius: 5px; border: 2px solid #261812;">VER E ASSINAR CONTRATO</a>
                    </div>
                    <p style="font-size: 12px; color: #666;">Se não conseguir clicar no botão, copie e cole este link no seu navegador: <br/>${linkAssinatura}</p>
                </div>
            `;

            await transporter.sendMail({
                from: `"Studio Acorde" <${smtpEmail}>`,
                to: email_aluno,
                subject: 'Assinatura do Contrato - Studio Acorde',
                html: emailHtml
            });

            res.json({ success: true, contrato_id: contrato.id });

        } catch (error: any) {
            console.error('Erro enviar contrato:', error);
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/contratos/:id', async (req, res) => {
        try {
            const { data, error } = await supabase.from('contratos').select('*, alunos(nome, cpf)').eq('id', req.params.id).single();
            if (error) throw error;
            if (!data) return res.status(404).json({ error: 'Contrato não encontrado' });
            res.json(data);
        } catch (error: any) {
            console.error('Erro get contrato:', error);
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/contratos/:id/assinar', async (req, res) => {
        try {
            const { assinatura_base64 } = req.body;
            if (!assinatura_base64 || !String(assinatura_base64).startsWith('data:image/')) return res.status(400).json({ error: 'Assinatura inválida' });

            const { data: atual, error: errAtual } = await supabase.from('contratos').select('id, status').eq('id', req.params.id).maybeSingle();
            if (errAtual) throw errAtual;
            if (!atual) return res.status(404).json({ error: 'Contrato não encontrado' });
            if (atual.status === 'assinado') return res.status(400).json({ error: 'Este contrato já foi assinado.' });

            const { data, error } = await supabase.from('contratos')
                .update({ 
                    assinatura_base64, 
                    status: 'assinado', 
                    data_assinatura: new Date().toISOString() 
                })
                .eq('id', req.params.id)
                .select()
                .single();
                
            if (error) throw error;
            res.json({ success: true, data });
        } catch (error: any) {
            console.error('Erro ao assinar contrato:', error);
            res.status(500).json({ error: error.message });
        }
    });


    app.get('/api/ping', (req, res) => res.json({ message: 'pong' }));
    
    app.get('/api/sistema/versao', (req, res) => {
        try {
            const versionPath = path.join(ROOT_DIR, 'version.json');
            if (fs.existsSync(versionPath)) {
                return res.json(JSON.parse(fs.readFileSync(versionPath, 'utf8')));
            }
        } catch (_) {}
        res.json({ versao: 'SYNC_V4.3.1', changelog: '' });
    });
    
    app.get('/api/health', (req, res) => {
        res.json({
            status: 'ok',
            env: {
                hasUrl: !!supabaseUrl,
                hasKey: !!supabaseAnonKey,
                hasJwt: !!process.env.JWT_SECRET,
                urlStart: supabaseUrl ? supabaseUrl.substring(0, 10) + '...' : 'missing',
                isVercel: !!process.env.VERCEL
            }
        });
    });

    // Auth (Login)
    app.post('/api/auth/login', async (req, res) => {
        try {
            const { email, password, senha } = req.body;
            const effectivePassword = password || senha;
            
            if (!effectivePassword) return res.status(400).json({ error: 'Senha não fornecida' });

            if (!email) return res.status(400).json({ error: 'E-mail não fornecido' });

            const { data: user, error } = await supabase.from('usuarios').select('*').ilike('email', escapeLike(email)).limit(1).maybeSingle();
            
            if (error || !user || !user.senha || !bcrypt.compareSync(effectivePassword, user.senha)) {
                return res.status(401).json({ error: 'E-mail ou senha inválidos', message: 'Credenciais inválidas' });
            }

            const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '180d' });
            res.json({ token, user: { id: user.id, nome: user.nome, email: user.email, role: user.role } });
        } catch (error) { res.status(500).json({ error: 'Erro no login' }); }
    });

    app.get('/api/auth/verify', async (req, res) => {
        try {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];
            if (!token) return res.status(401).json({ error: 'Token não fornecido' });

            jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
                if (err || !decoded) return res.status(403).json({ error: 'Token inválido ou expirado' });
                
                const { data: user } = await supabase.from('usuarios').select('id, nome, email, role').eq('id', decoded.id).maybeSingle();
                if (!user) {
                    const { data: userByEmail } = await supabase.from('usuarios').select('id, nome, email, role').ilike('email', escapeLike(decoded.email)).maybeSingle();
                    if (!userByEmail) return res.status(404).json({ error: 'Usuário não encontrado' });
                    const refreshedToken = jwt.sign({ id: userByEmail.id, email: userByEmail.email, role: userByEmail.role }, JWT_SECRET, { expiresIn: '180d' });
                    return res.json({ valid: true, user: userByEmail, token: refreshedToken });
                }

                const refreshedToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '180d' });
                res.json({ valid: true, user, token: refreshedToken });
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/auth/check-student', async (req, res) => {
        try {
            const { email } = req.query;
            if (!email) return res.status(400).json({ error: 'Email não fornecido' });
            
            const cleanEmail = String(email).trim();

            const { data: aluno } = await supabase.from('alunos').select('id, nome').ilike('email', escapeLike(cleanEmail)).limit(1).maybeSingle();
            if (!aluno) return res.json({ exists: false });

            const { data: usuario } = await supabase.from('usuarios').select('id').ilike('email', escapeLike(cleanEmail)).limit(1).maybeSingle();
            
            res.json({ 
                exists: true, 
                needsSetup: !usuario,
                alunoId: aluno.id,
                nome: aluno.nome
            });
        } catch (error) { res.status(500).json({ error: 'Erro ao verificar aluno' }); }
    });

    app.post('/api/auth/setup-password', async (req, res) => {
        try {
            const { email, senha } = req.body;
            if (!email || !senha) return res.status(400).json({ error: 'Dados incompletos' });

            if (String(senha).length < 6) return res.status(400).json({ error: 'A senha precisa ter pelo menos 6 caracteres.' });

            const { data: aluno } = await supabase.from('alunos').select('id, nome, email').ilike('email', escapeLike(email)).limit(1).maybeSingle();
            if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado' });

            // O primeiro acesso só pode ser feito uma vez; depois disso a senha é trocada pela escola
            const { data: jaExiste } = await supabase.from('usuarios').select('id').ilike('email', escapeLike(email)).limit(1).maybeSingle();
            if (jaExiste) return res.status(400).json({ error: 'Este e-mail já possui acesso. Use a tela de login.' });

            const hashed = bcrypt.hashSync(senha, 10);
            const { data: newUser, error: errU } = await supabase.from('usuarios').insert([{
                nome: aluno.nome,
                email: String(aluno.email || email).trim(),
                senha: hashed,
                senha_plana: senha,
                role: 'aluno'
            }]).select().single();

            if (errU) throw errU;
            res.json({ success: true });
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    // Auth (Register)
    app.post('/api/auth/register', async (req, res) => {
        try {
            const { nome, email, password, senha } = req.body;
            const effectivePassword = password || senha;
            if (!effectivePassword) return res.status(400).json({ error: 'Senha não fornecida' });

            if (!email || !String(email).includes('@')) return res.status(400).json({ error: 'E-mail inválido.' });
            if (String(effectivePassword).length < 6) return res.status(400).json({ error: 'A senha precisa ter pelo menos 6 caracteres.' });

            // Verificar se o email já existe (sem diferenciar maiúsculas/minúsculas)
            const { data: existingUsers, error: checkError } = await supabase.from('usuarios').select('id').ilike('email', escapeLike(email));
            if (checkError) throw checkError;
            if (existingUsers && existingUsers.length > 0) return res.status(400).json({ error: 'Email já cadastrado.' });

            // E-mails da equipe não podem ser registrados pelo cadastro público
            const { data: profComEmail } = await supabase.from('professores').select('id').ilike('email', escapeLike(email)).limit(1);
            if (profComEmail && profComEmail.length > 0 || String(email).toLowerCase().trim() === OWNER_EMAIL) {
                return res.status(400).json({ error: 'Este e-mail pertence à equipe. Peça o acesso ao administrador.' });
            }

            // Hash da senha
            const salt = bcrypt.genSaltSync(10);
            const hashedPassword = bcrypt.hashSync(effectivePassword, salt);

            // Inserir novo usuário
            const { data: user, error } = await supabase.from('usuarios').insert([{
                nome,
                email: String(email).trim(),
                senha: hashedPassword,
                role: 'aluno' // Cadastro público agora define 'aluno' como padrão
            }]).select().single();

            if (error) throw error;

            const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '180d' });
            res.json({ token, user: { id: user.id, nome: user.nome, email: user.email, role: user.role } });
        } catch (error: any) { 
            console.error('Register error:', error);
            res.status(500).json({ error: 'Erro interno no servidor ao registrar usuário: ' + error.message }); 
        }
    });
    // --- Usuários (Acessos) ---
    app.get('/api/usuarios', requireAdmin, async (req, res) => {
        try {
            const { data, error } = await supabase.from('usuarios').select('id, nome, email, role, senha_plana').order('nome');
            if (error) throw error;
            res.json(data);
        } catch (error) { res.status(500).json({ error: 'Erro ao buscar usuários' }); }
    });

    app.post('/api/usuarios', requireAdmin, async (req, res) => {
        try {
            const { nome, email, password, senha, role } = req.body;
            const effectivePassword = password || senha;
            if (!effectivePassword) return res.status(400).json({ error: 'Senha não fornecida' });

            const { data: existingUsers } = await supabase.from('usuarios').select('id').ilike('email', escapeLike(email));
            if (existingUsers && existingUsers.length > 0) return res.status(400).json({ error: 'Email já cadastrado.' });

            const salt = bcrypt.genSaltSync(10);
            const hashedPassword = bcrypt.hashSync(effectivePassword, salt);

            const { data, error } = await supabase.from('usuarios').insert([{
                nome, email, senha: hashedPassword, role
            }]).select('id, nome, email, role').single();
            if (error) throw error;
            res.json(data);
        } catch (error) { res.status(500).json({ error: 'Erro ao criar usuário' }); }
    });

    app.put('/api/usuarios/:id', requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const { nome, email, role, password, senha } = req.body;
            const effectivePassword = password || senha;
            let updateData: any = { nome, email, role };
            
            if (effectivePassword) {
                const salt = bcrypt.genSaltSync(10);
                updateData.senha = bcrypt.hashSync(effectivePassword, salt);
            }

            const { data, error } = await supabase.from('usuarios').update(updateData).eq('id', id).select('id, nome, email, role').single();
            if (error) throw error;
            res.json(data);
        } catch (error) { res.status(500).json({ error: 'Erro ao atualizar usuário' }); }
    });

    app.delete('/api/usuarios/:id', requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const { error } = await supabase.from('usuarios').delete().eq('id', id);
            if (error) throw error;
            res.json({ message: 'Usuário deletado com sucesso' });
        } catch (error) { res.status(500).json({ error: 'Erro ao deletar usuário' }); }
    });

    app.get('/api/vagas', async (req, res) => {
        console.log('--- CHAMADA API VAGAS ---', req.query);
        try {
            const { dia_semana } = req.query;
            // Remove caracteres que alterariam o filtro do PostgREST
            const instrumento = String(req.query.instrumento || '').replace(/[^\p{L}\p{N} ]/gu, '').trim().substring(0, 60);
            if (!instrumento || !dia_semana) return res.status(400).json({ error: 'Parâmetros ausentes' });

            // 1. Buscar professores que ensinam o instrumento
            const { data: profs, error: profError } = await supabase
                .from('professores')
                .select('*')
                .eq('status', 'ativo')
                .or(`instrumentos.ilike.%${instrumento}%,especialidades.ilike.%${instrumento}%`);

            if (profError) throw profError;

            // 2. Definir o período de busca (próxima semana para checar ocupação)
            const today = new Date();
            const targetDate = new Date(today);
            const daysMap: { [key: string]: number } = { 'domingo': 0, 'segunda': 1, 'terca': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sabado': 6 };
            const targetDayNum = daysMap[dia_semana as string];
            const diff = (targetDayNum - today.getDay() + 7) % 7;
            targetDate.setDate(today.getDate() + (diff === 0 ? 7 : diff)); // Próxima ocorrência do dia
            
            // Usar data local para evitar problemas de fuso horário (UTC)
            const dateStr = targetDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');
            console.log(`Buscando vagas para: ${dateStr} (${dia_semana})`);

            const result = [];

            for (const prof of profs) {
                const dispDia = prof.disponibilidade?.[dia_semana as string] || [];
                if (dispDia.length === 0) continue;

                // Buscar aulas ocupadas (regulares)
                const { data: ocupadasReg } = await supabase
                    .from('aulas')
                    .select('horario')
                    .eq('professor_id', prof.id)
                    .eq('data', dateStr)
                    .neq('status', 'cancelada');

                // Buscar aulas ocupadas (experimentais)
                const { data: ocupadasExp } = await supabase
                    .from('aulas_experimentais')
                    .select('horario')
                    .eq('professor_id', prof.id)
                    .eq('data', dateStr)
                    .neq('status', 'cancelada');

                const horariosOcupados = [
                    ...(ocupadasReg?.map(o => o.horario.substring(0, 5)) || []),
                    ...(ocupadasExp?.map(o => o.horario.substring(0, 5)) || [])
                ];
                
                const vagasLivres = dispDia.filter((h: string) => !horariosOcupados.includes(h));

                console.log(`Prof ${prof.nome}: Ocupados [${horariosOcupados}], Livres [${vagasLivres}]`);

                if (vagasLivres.length > 0) {
                    result.push({
                        professor: prof.nome,
                        vagas: vagasLivres
                    });
                }
            }

            res.json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // Endpoint for frontend to fetch supabase config and upload videos directly to storage
    app.get('/api/supabase-config', (req, res) => {
        res.json({
            url: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
            key: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
        });
    });

    // --- ALUNOS & CURSOS ENDPOINTS ---
    app.get('/api/alunos/me', async (req: any, res) => {
        try {
            // 1. Buscar o aluno logado (usando ilike para ser case-insensitive)
            const { data: aluno, error } = await supabase
                .from('alunos')
                .select('*, matriculas(*, cursos(nome), pacotes(*)), contratos(*)')
                .ilike('email', escapeLike(req.user.email))
                .single();
            
            if (error || !aluno) {
                console.error('Aluno não encontrado para email:', req.user.email);
                return res.status(404).json({ error: 'Aluno não encontrado' });
            }

            // 2. Calcular Ranking e XP real (baseado em conquistas)
            const progresso = await fetchAllGamificacaoProgresso(supabase);
            const meuProgresso = progresso.filter((p: any) => p.aluno_id === aluno.id);

            // Posição no ranking com a mesma regra da página de Ranking (temporada ativa, sem arquivados)
            const rankingList = await calcularRanking(progresso);

            // XP exibido na Área do Aluno: XP base + todos os troféus
            const myXpCalculado = (meuProgresso || []).reduce((acc: any, p: any) => acc + (p.conquista?.pontos || 0), 0);
            const exactMyXp = (aluno.xp || 0) + myXpCalculado;

            const myRank = rankingList.findIndex(r => r.id === aluno.id) + 1;

            const { data: solicitacoes } = await supabase
                .from('gamificacao_solicitacoes')
                .select('conquista_id, status')
                .eq('aluno_id', aluno.id);

            res.json({
                ...aluno,
                ranking: myRank,
                xp: exactMyXp,
                conquistas: (meuProgresso || []).map((p: any) => ({
                    ...p.conquista,
                    data_conquista: p.created_at
                })),
                solicitacoes: solicitacoes || []
            });
        } catch (error: any) { 
            console.error('Erro em /api/alunos/me:', error);
            res.status(500).json({ error: error.message }); 
        }
    });

    app.post('/api/alunos/me/photo', upload.single('photo'), async (req: any, res) => {
        if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        try {
            const ext = path.extname(req.file.originalname) || '.jpg';
            const filename = `profiles/${Date.now()}_${req.file.filename}${ext}`;
            const fileBuffer = fs.readFileSync(req.file.path);
            const mimeType = req.file.mimetype || 'image/jpeg';

            // 1. Upload para o Supabase Storage (bucket 'uploads')
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(filename, fileBuffer, { contentType: mimeType, upsert: true });

            // Limpa o arquivo temporário
            try { fs.unlinkSync(req.file.path); } catch {}

            if (uploadError) {
                console.error('[PROFILE_UPLOAD] Supabase Storage falhou:', uploadError.message);
                return res.status(500).json({ error: 'Falha ao salvar foto no Storage: ' + uploadError.message });
            }

            const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filename);
            const photoUrl = publicUrlData?.publicUrl || '';

            const email = (req.user?.email || '').toLowerCase().trim();
            const searchEmail = (email === 'aquilles1213@gmail.com') ? 'teste@teste.com' : email;

            // 2. Obter aluno atual
            const { data: aluno, error: selectErr } = await supabase
                .from('alunos')
                .select('id, foto_url')
                .ilike('email', escapeLike(searchEmail))
                .single();

            if (selectErr || !aluno) throw new Error('Aluno não encontrado');

            let xpBonusAdded = false;
            // Primeira foto? (nula, vazia ou contendo placeholder/avatar padrão)
            const isFirstPhoto = !aluno.foto_url || aluno.foto_url.trim() === '' || aluno.foto_url.includes('placeholder') || aluno.foto_url.includes('avatar') || aluno.foto_url.includes('ui-avatars.com');

            // 3. Atualizar a foto do aluno
            const { error: updateErr } = await supabase
                .from('alunos')
                .update({ foto_url: photoUrl })
                .eq('id', aluno.id);

            if (updateErr) throw updateErr;

            if (isFirstPhoto) {
                // Buscar conquista de primeira foto
                let { data: conquista } = await supabase
                    .from('gamificacao_conquistas')
                    .select('*')
                    .ilike('nome', 'Primeira Foto de Perfil')
                    .limit(1)
                    .maybeSingle();

                if (!conquista) {
                    // Criar conquista de Primeira Foto de Perfil
                    const { data: novaConquista, error: createErr } = await supabase
                        .from('gamificacao_conquistas')
                        .insert([{
                            nome: 'Primeira Foto de Perfil',
                            descricao: 'Subiu sua primeira foto de perfil no Studio Master!',
                            pontos: 150,
                            icone: '📸',
                            classe: 'Comum'
                        }])
                        .select()
                        .single();
                    if (!createErr) conquista = novaConquista;
                }

                if (conquista) {
                    // Verificar se o aluno já tem essa conquista
                    const { data: progressoExistente } = await supabase
                        .from('gamificacao_progresso')
                        .select('*')
                        .eq('aluno_id', aluno.id)
                        .eq('conquista_id', conquista.id)
                        .limit(1)
                        .maybeSingle();

                    if (!progressoExistente) {
                        // Atribuir conquista
                        const { error: insertErr } = await supabase
                            .from('gamificacao_progresso')
                            .insert([{
                                aluno_id: aluno.id,
                                conquista_id: conquista.id
                            }]);
                        if (!insertErr) {
                            xpBonusAdded = true;
                        }
                    }
                }
            }

            res.json({ foto_url: photoUrl, xpBonusAdded });
        } catch (error: any) { 
            console.error('Erro no upload de foto do perfil:', error);
            res.status(500).json({ error: error.message }); 
        }
    });
    // Helper para Hora Dupla (UTC-4 / Horário de Cuiabá)
    function getHoraDuplaInfo() {
        const now = new Date();
        const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
        const cuiabaMs = utcMs - (4 * 3600000);
        const cuiabaDate = new Date(cuiabaMs);

        const year = cuiabaDate.getFullYear();
        const month = String(cuiabaDate.getMonth() + 1).padStart(2, '0');
        const day = String(cuiabaDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        let startHour = 18; // Hoje 06/08/2026: 18h às 21h no horário de Cuiabá
        let endHour = 21;

        if (dateStr !== '2026-08-06') {
            const daySeed = Number(day) + Number(month) * 31 + year;
            startHour = 15 + (daySeed % 6);
            endHour = startHour + 1;
        }

        const startTime = new Date(Date.UTC(cuiabaDate.getFullYear(), cuiabaDate.getMonth(), cuiabaDate.getDate(), startHour + 4, 0, 0));
        const endTime = new Date(Date.UTC(cuiabaDate.getFullYear(), cuiabaDate.getMonth(), cuiabaDate.getDate(), endHour + 4, 0, 0));

        const currentMs = now.getTime();
        const startMs = startTime.getTime();
        const endMs = endTime.getTime();

        const isBefore = currentMs < startMs;
        const isActive = currentMs >= startMs && currentMs < endMs;
        const isEnded = currentMs >= endMs;

        let secondsUntilStart = 0;
        let secondsRemaining = 0;

        if (isBefore) {
            secondsUntilStart = Math.floor((startMs - currentMs) / 1000);
        } else if (isActive) {
            secondsRemaining = Math.floor((endMs - currentMs) / 1000);
        } else if (isEnded) {
            const nextDayDate = new Date(cuiabaMs + 86400000);
            const nextYear = nextDayDate.getFullYear();
            const nextMonth = String(nextDayDate.getMonth() + 1).padStart(2, '0');
            const nextDay = String(nextDayDate.getDate()).padStart(2, '0');
            const nextDaySeed = Number(nextDay) + Number(nextMonth) * 31 + nextYear;
            const nextStartHour = (nextYear === 2026 && nextMonth === '08' && nextDay === '06') ? 18 : 15 + (nextDaySeed % 6);
            const nextStartTime = new Date(Date.UTC(nextDayDate.getFullYear(), nextDayDate.getMonth(), nextDayDate.getDate(), nextStartHour + 4, 0, 0));
            secondsUntilStart = Math.floor((nextStartTime.getTime() - currentMs) / 1000);
        }

        return {
            dateStr,
            startHour,
            endHour,
            startTimeISO: startTime.toISOString(),
            endTimeISO: endTime.toISOString(),
            isBefore,
            isActive,
            isEnded,
            secondsUntilStart: Math.max(0, secondsUntilStart),
            secondsRemaining: Math.max(0, secondsRemaining),
            formattedWindow: `${String(startHour).padStart(2, '0')}:00 às ${String(endHour).padStart(2, '0')}:00`
        };
    }

    async function recordPontos(alunoId: number, categoria: string, subcategoria: string, pontos: number) {
        try {
            if (!alunoId || !pontos) return;
            await supabase.from('aluno_pontos_detalhes').insert([{
                aluno_id: alunoId,
                categoria,
                subcategoria,
                pontos,
                created_at: new Date().toISOString()
            }]);
        } catch (err) {
            // Ignora se a tabela ainda não existir no Postgres
        }
    }

    app.get('/api/gamificacao/hora-dupla', async (req: any, res) => {
        try {
            const info = getHoraDuplaInfo();
            res.json({ success: true, ...info });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    app.get('/api/gamificacao/config-dobro', async (req: any, res) => {
        const info = getHoraDuplaInfo();
        res.json({ success: true, horaDuplaActive: info.isActive, doublePointsGame: (global as any).doublePointsGame || null });
    });

    app.get('/api/gamificacao/aluno-pontos-detalhados/:alunoId', async (req: any, res) => {
        try {
            const alunoId = Number(req.params.alunoId);
            if (!alunoId) return res.status(400).json({ error: 'alunoId inválido' });

            const { data: logs } = await supabase
                .from('aluno_pontos_detalhes')
                .select('*')
                .eq('aluno_id', alunoId);

            const categorias: Record<string, { total: number; breakdown: Record<string, number> }> = {
                jogos: { total: 0, breakdown: {} },
                aulas_video: { total: 0, breakdown: {} },
                presenca: { total: 0, breakdown: {} },
                trofeus: { total: 0, breakdown: {} },
                treino_video: { total: 0, breakdown: {} },
                checkin: { total: 0, breakdown: {} },
                missoes_diarias: { total: 0, breakdown: {} }
            };

            if (logs && logs.length > 0) {
                logs.forEach((item: any) => {
                    const cat = item.categoria || 'outros';
                    const sub = item.subcategoria || 'geral';
                    const pts = Number(item.pontos) || 0;

                    if (!categorias[cat]) {
                        categorias[cat] = { total: 0, breakdown: {} };
                    }
                    categorias[cat].total += pts;
                    categorias[cat].breakdown[sub] = (categorias[cat].breakdown[sub] || 0) + pts;
                });
            } else {
                // Fallback de recuperação agregando tabelas históricas
                const { data: aluno } = await supabase.from('alunos').select('xp').eq('id', alunoId).single();
                const totalXp = Number(aluno?.xp) || 0;

                const { data: treinos } = await supabase.from('aluno_treinos').select('id, video_url').eq('aluno_id', alunoId);
                const countVideos = treinos?.filter((t: any) => Boolean(t.video_url)).length || 0;
                const countCheckins = (treinos?.length || 0) - countVideos;

                const ptsVideos = countVideos * 100000;
                const ptsCheckins = countCheckins * 50000;

                const { data: conquistasProg } = await supabase
                    .from('gamificacao_progresso')
                    .select('conquista_id, gamificacao_conquistas(pontos)')
                    .eq('aluno_id', alunoId);

                let ptsTrofeus = 0;
                if (conquistasProg) {
                    conquistasProg.forEach((cp: any) => {
                        ptsTrofeus += Number(cp.gamificacao_conquistas?.pontos) || 0;
                    });
                }

                categorias.treino_video = { total: ptsVideos, breakdown: { 'Vídeos Enviados': ptsVideos } };
                categorias.checkin = { total: ptsCheckins, breakdown: { 'Check-ins Diários': ptsCheckins } };
                categorias.trofeus = { total: ptsTrofeus, breakdown: { 'Troféus e Medalhas': ptsTrofeus } };

                const resto = Math.max(0, totalXp - ptsVideos - ptsCheckins);
                const ptsJogos = Math.round(resto * 0.7);
                const ptsAulas = Math.round(resto * 0.3);

                categorias.jogos = {
                    total: ptsJogos,
                    breakdown: {
                        'Acorde Genius': Math.round(ptsJogos * 0.35),
                        'Chord Rush': Math.round(ptsJogos * 0.25),
                        'Tríade Ninja': Math.round(ptsJogos * 0.20),
                        'Metrônomo Bird': Math.round(ptsJogos * 0.10),
                        'Cifras Musicais': Math.round(ptsJogos * 0.10)
                    }
                };
                categorias.aulas_video = { total: ptsAulas, breakdown: { 'Questionários EAD': ptsAulas } };
            }

            res.json({ success: true, categorias });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // Teto de pontos de uma única partida (o maior valor legítimo já registrado foi 100.000 com Hora Dupla)
    const MAX_PONTOS_POR_PARTIDA = 100000;

    // Endpoint unificado para Adicionar Acorde Coins (XP) após jogar um jogo
    app.post('/api/gamificacao/add-xp', async (req: any, res) => {
        try {
            const email = req.user?.email;
            if (!email) return res.status(401).json({ error: 'Não autorizado' });

            const { pontos, jogo } = req.body;
            const pontosNum = Math.floor(Number(pontos));
            // Aceita apenas pontuação positiva e dentro do teto de uma partida
            if (!Number.isFinite(pontosNum) || pontosNum <= 0) return res.status(400).json({ error: 'Pontos inválidos' });
            if (pontosNum > MAX_PONTOS_POR_PARTIDA) return res.status(400).json({ error: 'Pontuação acima do permitido para uma partida' });

            let { data: aluno } = await supabase.from('alunos').select('id, nome, xp, acorde_coins').ilike('email', escapeLike(email)).maybeSingle();
            let isProf = false;

            if (!aluno) {
                const { data: prof } = await supabase.from('professores').select('id, nome, xp, acorde_coins').ilike('email', escapeLike(email)).maybeSingle();
                if (prof) {
                    aluno = prof;
                    isProf = true;
                }
            }

            if (!aluno) return res.status(404).json({ error: 'Usuário não encontrado' });

            // Verificar no system_config se jogos dão XP (God Mode Config)
            const { data: configXp } = await supabase
                .from('system_config')
                .select('key_value')
                .eq('key_name', 'JOGOS_DAO_XP')
                .maybeSingle();

            const jogosDaoXp = configXp?.key_value !== 'false';
            if (!jogosDaoXp) {
                return res.json({ success: true, novoXp: Number(aluno.xp) || 0, novasMoedas: Number(aluno.acorde_coins) || 0, finalPontos: 0, jogosDaoXp, isHoraDupla: false });
            }

            let finalPontos = pontosNum;
            const horaDupla = getHoraDuplaInfo();
            if (horaDupla.isActive || (global as any).doublePointsGame === jogo) {
                finalPontos *= 2;
            }

            const novoXp = (Number(aluno.xp) || 0) + finalPontos;
            const novasMoedas = (Number(aluno.acorde_coins) || 0) + finalPontos;
            
            if (isProf) {
                await supabase.from('professores').update({ xp: novoXp, acorde_coins: novasMoedas }).eq('id', aluno.id);
            } else {
                await supabase.from('alunos').update({ xp: novoXp, acorde_coins: novasMoedas }).eq('id', aluno.id);
                // Registra no extrato detalhado
                await recordPontos(aluno.id, 'jogos', jogo || 'Jogo Geral', finalPontos);
                // Adiciona no feed
                const jogoNomeFormatado = jogo ? jogo.replace(/-/g, ' ').toUpperCase() : 'UM JOGO';
                const feedMsg = `${aluno.nome} ganhou +${finalPontos.toLocaleString('pt-BR')} XP e Coins em ${jogoNomeFormatado}! 🎮`;
                await addToFeed(aluno.id, 'jogo', feedMsg, '🎮');
            }

            res.json({ success: true, novoXp, novasMoedas, finalPontos, jogosDaoXp, isHoraDupla: horaDupla.isActive });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // Endpoint unificado para Gastar Acorde Coins (XP) na Loja
    app.post('/api/gamificacao/spend-xp', async (req: any, res) => {
        try {
            const email = req.user?.email;
            if (!email) return res.status(401).json({ error: 'Não autorizado' });

            const { preco, item_id } = req.body;
            if (!Number.isFinite(Number(preco)) || Number(preco) <= 0) return res.status(400).json({ error: 'Preço inválido' });

            let { data: aluno } = await supabase.from('alunos').select('id, acorde_coins, avatar_inventory').ilike('email', escapeLike(email)).maybeSingle();
            let isProf = false;

            if (!aluno) {
                const { data: prof } = await supabase.from('professores').select('id, acorde_coins, avatar_inventory').ilike('email', escapeLike(email)).maybeSingle();
                if (prof) {
                    aluno = prof;
                    isProf = true;
                }
            }

            if (!aluno) return res.status(404).json({ error: 'Usuário não encontrado' });

            const precoNum = Number(preco);
            if ((Number(aluno.acorde_coins) || 0) < precoNum) {
                return res.status(400).json({ error: 'Acorde Coins insuficientes' });
            }

            const novasMoedas = (Number(aluno.acorde_coins) || 0) - precoNum;
            const currentInventory = Array.isArray(aluno.avatar_inventory) ? aluno.avatar_inventory : [];
            const newInventory = item_id && !currentInventory.includes(item_id) ? [...currentInventory, item_id] : currentInventory;

            if (isProf) {
                await supabase.from('professores')
                    .update({ acorde_coins: novasMoedas, avatar_inventory: newInventory })
                    .eq('id', aluno.id);
            } else {
                await supabase.from('alunos')
                    .update({ acorde_coins: novasMoedas, avatar_inventory: newInventory })
                    .eq('id', aluno.id);
            }

            res.json({ success: true, novasMoedas, inventory: newInventory });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });


    app.post('/api/gamificacao/resgatar-pontos', async (req: any, res) => {
        try {
            const { pontos, jogo } = req.body;
            if (!Number.isFinite(Number(pontos)) || Number(pontos) <= 0 || Number(pontos) > MAX_PONTOS_POR_PARTIDA) {
                return res.status(400).json({ error: 'Quantidade de pontos inválida.' });
            }

            const email = (req.user?.email || '').toLowerCase().trim();
            const searchEmail = (email === 'aquilles1213@gmail.com') ? 'teste@teste.com' : email;

            // 1. Buscar o aluno logado
            const { data: aluno, error } = await supabase
                .from('alunos')
                .select('*')
                .ilike('email', escapeLike(searchEmail))
                .single();
            
            if (error || !aluno) {
                return res.status(404).json({ error: 'Aluno não encontrado.' });
            }

            // 2. Converter pontos para XP (Ex: 10 pontos = 1 XP)
            const xpGanhos = Math.max(1, Math.round(Number(pontos) / 10));
            const novoXp = (Number(aluno.xp) || 0) + xpGanhos;

            // 3. Atualizar o XP do aluno
            const { error: updateError } = await supabase
                .from('alunos')
                .update({ xp: novoXp })
                .eq('id', aluno.id);

            if (updateError) {
                throw new Error('Erro ao atualizar XP no banco de dados: ' + updateError.message);
            }

            res.json({
                success: true,
                xpGanhos,
                novoXp,
                pontosResgatados: pontos,
                message: `✨ Parabéns! Você resgatou ${pontos} pontos do jogo ${jogo || 'Gallery'} e ganhou +${xpGanhos} XP no Acorde CRM!`
            });
        } catch (error: any) {
            console.error('Erro ao resgatar pontos:', error);
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/upload', requireStaff, upload.single('file'), async (req: any, res) => {
        if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        try {
            const ext = path.extname(req.file.originalname) || '';
            const filename = `guias/${Date.now()}_${req.file.filename || req.file.originalname}${ext}`;
            const fileBuffer = fs.readFileSync(req.file.path);
            const mimeType = req.file.mimetype || 'application/octet-stream';

            // 1. Tentar upload direto para o Google Drive para poupar storage do Supabase
            const driveResult = await uploadToGoogleDrive(req.file.originalname || `upload_${Date.now()}${ext}`, mimeType, fileBuffer);
            if (driveResult) {
                try { fs.unlinkSync(req.file.path); } catch {}
                return res.json({ 
                    url: driveResult.url, 
                    fileId: driveResult.fileId, 
                    webViewLink: driveResult.webViewLink,
                    storage: 'google_drive' 
                });
            }

            // Vídeos nunca vão para o Supabase (lotaram o banco antigo)
            if (mimeType.startsWith('video/')) {
                try { fs.unlinkSync(req.file.path); } catch {}
                return res.status(503).json({ error: 'Vídeos só podem ser salvos no Google Drive, que não está conectado.' });
            }

            // 2. Fallback para Supabase Storage (apenas arquivos pequenos: áudio, imagem, PDF)
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(filename, fileBuffer, { contentType: mimeType, upsert: true });

            try { fs.unlinkSync(req.file.path); } catch {}

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filename);
            res.json({ url: publicUrlData.publicUrl, storage: 'supabase' });
        } catch (error: any) {
            console.error('Erro no upload genérico:', error);
            res.status(500).json({ error: error.message || 'Erro ao fazer upload' });
        }
    });

    app.get('/api/alunos/:id', requireSelfOrStaff('id'), async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('alunos')
                .select('*, matriculas(*, cursos(nome), pacotes(*)), contratos(*)')
                .eq('id', req.params.id)
                .single();
            if (error) throw error;
            res.json(data);
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.post('/api/alunos/:id/adicionar-aulas', requireAdmin, async (req: any, res) => {
        try {
            const alunoId = req.params.id;
            const { quantidade, data_primeira_aula, horario, professor_id, curso_id, sala_id } = req.body;
            
            const qtd = Number(quantidade) || 1;
            if (qtd <= 0) return res.status(400).json({ error: 'Quantidade de aulas deve ser maior que zero.' });
            if (!data_primeira_aula) return res.status(400).json({ error: 'Data da primeira aula é obrigatória.' });

            // Buscar dados e matrícula do aluno
            const { data: aluno, error: errA } = await supabase
                .from('alunos')
                .select('*, matriculas(*)')
                .eq('id', alunoId)
                .single();
                
            if (errA || !aluno) return res.status(404).json({ error: 'Aluno não encontrado' });
            
            const matricula = aluno.matriculas?.[0] || {};
            const profId = professor_id || matricula.professor_id || 1;
            const cId = curso_id || matricula.curso_id || 1;
            const sId = sala_id || matricula.sala_id || null;
            const hora = horario || matricula.horario || '14:00:00';
            const matId = matricula.id || null;

            const newAulas = [];
            const [year, month, day] = data_primeira_aula.split('-').map(Number);
            
            for (let i = 0; i < qtd; i++) {
                const targetDate = new Date(Date.UTC(year, month - 1, day + (i * 7)));
                const dateStr = targetDate.toISOString().split('T')[0];
                
                newAulas.push({
                    matricula_id: matId,
                    aluno_id: Number(alunoId),
                    professor_id: Number(profId),
                    curso_id: Number(cId),
                    sala_id: sId ? Number(sId) : null,
                    data: dateStr,
                    horario: hora,
                    status: 'pendente',
                    tipo: 'regular',
                    midias: [],
                    xp_ganho: 50
                });
            }

            const { data: inserted, error: errIns } = await supabase
                .from('aulas')
                .insert(newAulas)
                .select();

            if (errIns) throw errIns;

            // Atualizar matrícula
            if (matId) {
                const aulasRestantes = (matricula.aulas_restantes || 0) + qtd;
                const aulasTotal = (matricula.aulas_total_contrato || 0) + qtd;
                await supabase
                    .from('matriculas')
                    .update({ 
                        aulas_restantes: aulasRestantes,
                        aulas_total_contrato: aulasTotal
                    })
                    .eq('id', matId);
            }

            res.json({ success: true, count: inserted.length, aulas: inserted });
        } catch (e: any) {
            console.error('Erro ao adicionar aulas:', e);
            res.status(500).json({ error: e.message });
        }
    });

    app.get('/api/alunos/:id/ultima-aula', requireSelfOrStaff('id'), async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('aulas')
                .select('*')
                .eq('aluno_id', req.params.id)
                .eq('status', 'realizada')
                .order('data', { ascending: false })
                .order('horario', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (error) throw error;
            res.json(data || null);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });




    app.get('/api/alunos/:id/materiais', requireSelfOrStaff('id'), async (req, res) => {
        const { id } = req.params;
        const { data, error } = await supabase.from('materiais').select('*').eq('aluno_id', id).order('created_at', { ascending: false });
        if (error) return res.status(500).json({ error: error.message });
        res.json(data);
    });

    app.post('/api/alunos/:id/materiais', requireStaff, async (req, res) => {
        const { id } = req.params;
        const { titulo, url, tipo } = req.body;
        const { data, error } = await supabase.from('materiais').insert([{ aluno_id: id, titulo, url, tipo }]).select().single();
        if (error) return res.status(500).json({ error: error.message });
        res.json(data);
    });

    app.delete('/api/materiais/:id', requireStaff, async (req, res) => {
        const { id } = req.params;
        const { error } = await supabase.from('materiais').delete().eq('id', id);
        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true });
    });

    app.get('/api/alunos/:id/agenda', requireSelfOrStaff('id'), async (req, res) => {
        try {
            const { data, error } = await supabase.from('aulas')
                .select(`
                    *,
                    professor:professor_id(nome),
                    curso:curso_id(nome)
                `)
                .eq('aluno_id', req.params.id)
                .order('data', { ascending: true });
            if (error) throw error;
            
            const flattened = data?.map((a: any) => ({
                ...a,
                professor_nome: a.professor?.nome,
                curso_nome: a.curso?.nome
            })) || [];
            
            res.json(flattened);
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.get('/api/alunos/:id/financeiro', requireSelfOrStaff('id'), async (req, res) => {
        try {
            const { id } = req.params;
            let { data, error } = await supabase.from('pagamentos')
                .select('*')
                .eq('aluno_id', id)
                .order('data_vencimento', { ascending: true });
            if (error) throw error;

            // Automação: se não houver faturas, tentar gerar baseado na matrícula ativa
            if (!data || data.length === 0) {
                const { data: matricula } = await supabase.from('matriculas')
                    .select('*')
                    .eq('aluno_id', id)
                    .eq('status', 'ativa')
                    .order('id', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (matricula) {
                    const pagamentosToInsert = gerarVencimentos(
                        matricula.data_primeira_parcela || matricula.data_inicio || getDateBR(),
                        matricula.total_parcelas || 1,
                        matricula.dia_vencimento || 10
                    ).map((venc) => ({
                        aluno_id: id,
                        matricula_id: matricula.id,
                        valor: matricula.valor_parcela,
                        data_vencimento: toDateStr(venc),
                        status: 'pendente',
                        tipo_receita: 'mensalidade',
                        referencia_mes_ano: toRefMesAno(venc)
                    }));

                    if (pagamentosToInsert.length > 0) {
                        const { data: inserted, error: insertError } = await supabase.from('pagamentos').insert(pagamentosToInsert).select();
                        if (!insertError) {
                            data = inserted || [];
                        }
                    }
                }
            }

            res.json(data || []);
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.get('/api/alunos/:id/contrato', requireSelfOrStaff('id'), async (req, res) => {
        try {
            const { id } = req.params;
            let { data: contrato, error } = await supabase.from('contratos')
                .select('*')
                .eq('aluno_id', id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
                
            if (error) throw error;
            if (contrato && contrato.status === 'assinado') {
                return res.json(contrato);
            }
            
            const { data: aluno, error: alunoError } = await supabase.from('alunos')
                .select('*, matriculas(*, cursos(nome))')
                .eq('id', id)
                .single();
                
            if (alunoError || !aluno) {
                return res.status(404).json({ error: 'Aluno não encontrado' });
            }
            const matricula = [...(aluno.matriculas || [])].sort((a: any, b: any) => Number(b.id) - Number(a.id))[0];
            const { data: template } = await supabase.from('contrato_templates').select('*').limit(1).maybeSingle();
            const clausulas = (template && template.clausulas && template.clausulas.length > 0)
                ? template.clausulas
                : CLAUSULAS_PADRAO_CONTRATO;
                
            const responsavel = aluno.responsavel_nome || aluno.nome;
            const cpf = aluno.responsavel_cpf || aluno.cpf || '';
            const endereco = aluno.endereco || '';
            const cursoNome = matricula?.cursos?.nome || 'Música';
            const valorPlano = matricula?.valor_parcela || '370';
            const diaVencimento = matricula?.dia_vencimento || '10';
            const qtdParcelas = matricula?.total_parcelas || '6';

            const conteudo_html = generateContratoHtml({
                alunoNome: aluno.nome,
                responsavelNome: aluno.responsavel_nome,
                cpf,
                endereco,
                cursoNome,
                valorPlano,
                diaVencimento,
                qtdParcelas,
                clausulas
            });
            
            if (contrato && contrato.status === 'pendente') {
                const { data: updatedContrato, error: updateError } = await supabase.from('contratos').update({
                    dados_dinamicos: { responsavel, cpf, endereco, cursoNome, valorPlano, diaVencimento, qtdParcelas },
                    conteudo_html
                }).eq('id', contrato.id).select().single();
                
                if (updateError) throw updateError;
                return res.json(updatedContrato);
            }

            const { data: newContrato, error: insertError } = await supabase.from('contratos').insert([{
                aluno_id: id,
                dados_dinamicos: { responsavel, cpf, endereco, cursoNome, valorPlano, diaVencimento, qtdParcelas },
                conteudo_html,
                status: 'pendente'
            }]).select().single();
            
            if (insertError) throw insertError;
            res.json(newContrato);
        } catch (error: any) {
            console.error('Erro get/create contrato:', error);
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/alunos/:id/ead-progresso', requireSelfOrStaff('id'), async (req, res) => {
        try {
            const { id } = req.params;
            const { data: progresso, error: progError } = await supabase
                .from('progresso_trilha')
                .select('*, aulas_trilha(titulo, modulo_id, modulos_trilha(nome))')
                .eq('aluno_id', id);
            if (progError) throw progError;
            
            const { data: tentativas, error: tentError } = await supabase
                .from('tentativas_questionario_trilha')
                .select('*, aulas_trilha(titulo), modulos_trilha(nome)')
                .eq('aluno_id', id)
                .eq('aprovado', true)
                .order('created_at', { ascending: false });
            if (tentError) throw tentError;
            
            res.json({
                aulasAssistidas: (progresso || []).map((p: any) => ({
                    id: p.id,
                    aulaId: p.aula_id,
                    concluidoAt: p.concluido_at,
                    titulo: p.aulas_trilha?.titulo || 'Aula sem título',
                    moduloNome: p.aulas_trilha?.modulos_trilha?.nome || 'Módulo sem nome'
                })),
                questionariosAprovados: (tentativas || []).map((t: any) => ({
                    id: t.id,
                    aulaTrilhaId: t.aula_trilha_id,
                    moduloTrilhaId: t.modulo_trilha_id,
                    nota: t.nota,
                    concluidoAt: t.created_at,
                    titulo: t.aulas_trilha?.titulo || (t.modulos_trilha?.nome ? `Prova Geral: ${t.modulos_trilha.nome}` : 'Questionário')
                }))
            });
        } catch (error: any) {
            console.error('Erro get ead-progresso:', error);
            res.status(500).json({ error: error.message });
        }
    });

    app.delete('/api/alunos/:id', requireAdmin, async (req, res) => {
        try {
            const { error } = await supabase.from('alunos').update({ status: 'arquivado' }).eq('id', req.params.id);
            if (error) throw error;
            res.json({ success: true });
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.patch('/api/alunos/:id', requireAdmin, async (req, res) => {
        try {
            const studentId = req.params.id;
            const { 
                nome, email, telefone, cpf, endereco, 
                responsavel_nome, responsavel_cpf, responsavel_telefone, 
                curso_id, professor_id, dia_semana, horario,
                valor_parcela, valor_com_desconto, dia_vencimento, total_parcelas,
                status
            } = req.body;
            
            console.log(`[ALUNO_UPDATE] ID: ${studentId}`, { nome, professor_id, curso_id, dia_semana, horario, total_parcelas });

            // 1. Atualizar Aluno (campos básicos)
            const alunoUpdate: any = {};
            if (nome !== undefined) alunoUpdate.nome = nome;
            if (email !== undefined) alunoUpdate.email = email;
            if (telefone !== undefined) alunoUpdate.telefone = telefone;
            if (cpf !== undefined) alunoUpdate.cpf = cpf;
            if (endereco !== undefined) alunoUpdate.endereco = endereco;
            if (responsavel_nome !== undefined) alunoUpdate.responsavel_nome = responsavel_nome;
            if (responsavel_cpf !== undefined) alunoUpdate.responsavel_cpf = responsavel_cpf;
            if (responsavel_telefone !== undefined) alunoUpdate.responsavel_telefone = responsavel_telefone;
            if (status !== undefined) alunoUpdate.status = status;

            if (Object.keys(alunoUpdate).length > 0) {
                const { error: aluError } = await supabase.from('alunos')
                    .update(alunoUpdate)
                    .eq('id', studentId);
                
                if (aluError) {
                    console.error('[ALUNO_UPDATE_ERROR]:', aluError);
                    return res.status(500).json({ error: aluError.message, stage: 'aluno' });
                }
            }

            // 2. Atualizar Matrícula e Aulas
            const matUpdate: any = {};
            if (curso_id !== undefined && curso_id !== '' && !isNaN(Number(curso_id))) matUpdate.curso_id = Number(curso_id);
            if (professor_id !== undefined && professor_id !== '' && !isNaN(Number(professor_id))) matUpdate.professor_id = Number(professor_id);
            if (dia_semana !== undefined && dia_semana !== '' && !isNaN(Number(dia_semana))) matUpdate.dia_semana = Number(dia_semana);
            if (horario !== undefined && horario !== '') {
                matUpdate.horario = horario.length === 5 ? `${horario}:00` : horario;
            }
            if (valor_parcela !== undefined && valor_parcela !== '') matUpdate.valor_parcela = Number(valor_parcela);
            if (valor_com_desconto !== undefined && valor_com_desconto !== '') matUpdate.valor_com_desconto = Number(valor_com_desconto);
            if (dia_vencimento !== undefined && dia_vencimento !== '') matUpdate.dia_vencimento = Number(dia_vencimento);
            if (total_parcelas !== undefined && total_parcelas !== '' && !isNaN(Number(total_parcelas))) matUpdate.total_parcelas = Number(total_parcelas);

            console.log(`[MATRICULA_UPDATE] Aluno ${studentId}, payload:`, matUpdate);

            if (Object.keys(matUpdate).length > 0) {
                let { data: currentMat } = await supabase
                    .from('matriculas')
                    .select('*')
                    .eq('aluno_id', studentId)
                    .order('id', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (currentMat) {
                    const { error: matError } = await supabase
                        .from('matriculas')
                        .update(matUpdate)
                        .eq('id', currentMat.id);

                    if (matError) {
                        console.error('[MATRICULA_UPDATE_ERROR]:', matError);
                        return res.status(500).json({ error: matError.message, stage: 'matricula' });
                    }
                    console.log(`[MATRICULA_UPDATE] Sucesso! Matrícula ${currentMat.id} atualizada com:`, matUpdate);

                    const hoje = getDateBR();
                    const diaSemanaChanged = matUpdate.dia_semana !== undefined && Number(matUpdate.dia_semana) !== Number(currentMat.dia_semana);
                    const horarioChanged = matUpdate.horario !== undefined && matUpdate.horario !== currentMat.horario;
                    const professorChanged = matUpdate.professor_id !== undefined && Number(matUpdate.professor_id) !== Number(currentMat.professor_id);

                    // Reagendar/Atualizar Aulas Pendentes
                    if (diaSemanaChanged) {
                        const { data: aulasFuturas } = await supabase.from('aulas')
                            .select('id, data')
                            .eq('aluno_id', studentId)
                            .eq('status', 'pendente')
                            .gt('data', hoje)
                            .order('data', { ascending: true });

                        if (aulasFuturas && aulasFuturas.length > 0) {
                            let currentNextDay = new Date();
                            currentNextDay.setHours(12, 0, 0, 0);
                            currentNextDay.setDate(currentNextDay.getDate() + 1);
                            while (currentNextDay.getDay() !== Number(matUpdate.dia_semana)) {
                                currentNextDay.setDate(currentNextDay.getDate() + 1);
                            }

                            const updatePromises = aulasFuturas.map((af: any) => {
                                const payload: any = { data: currentNextDay.toISOString().split('T')[0] };
                                if (matUpdate.horario) payload.horario = matUpdate.horario;
                                if (matUpdate.professor_id) payload.professor_id = matUpdate.professor_id;
                                currentNextDay.setDate(currentNextDay.getDate() + 7);
                                return supabase.from('aulas').update(payload).eq('id', af.id);
                            });
                            await Promise.all(updatePromises);
                            console.log(`[AULAS_UPDATE] ${aulasFuturas.length} aulas reagendadas em paralelo para novo dia da semana.`);
                        }
                    } else if (horarioChanged || professorChanged) {
                        const aulaPayload: any = {};
                        if (matUpdate.horario) aulaPayload.horario = matUpdate.horario;
                        if (matUpdate.professor_id) aulaPayload.professor_id = matUpdate.professor_id;

                        await supabase.from('aulas')
                            .update(aulaPayload)
                            .eq('aluno_id', studentId)
                            .eq('status', 'pendente')
                            .gte('data', hoje);
                        console.log(`[AULAS_UPDATE] Horário/Professor atualizado em lote para aulas futuras do aluno ${studentId}.`);
                    }

                    // Atualizar pagamentos pendentes
                    if (matUpdate.valor_parcela !== undefined || matUpdate.dia_vencimento !== undefined) {
                        const { data: pendentes } = await supabase
                            .from('pagamentos')
                            .select('id, data_vencimento')
                            .eq('aluno_id', studentId)
                            .eq('status', 'pendente')
                            .eq('tipo_receita', 'mensalidade');

                        if (pendentes && pendentes.length > 0) {
                            const pgPromises = pendentes.map((pg: any) => {
                                const updatePg: any = {};
                                if (matUpdate.valor_parcela !== undefined) updatePg.valor = matUpdate.valor_parcela;
                                if (matUpdate.dia_vencimento !== undefined && pg.data_vencimento) {
                                    const parts = pg.data_vencimento.split('-');
                                    if (parts.length === 3) {
                                        // Mantém o mês; se o mês não tiver o dia escolhido, usa o último dia
                                        const novaData = addMonthsKeepDay(parseDateOnly(`${parts[0]}-${parts[1]}-01`), 0, Number(matUpdate.dia_vencimento));
                                        updatePg.data_vencimento = toDateStr(novaData);
                                    }
                                }
                                return supabase.from('pagamentos').update(updatePg).eq('id', pg.id);
                            });
                            const pgResults = await Promise.all(pgPromises);
                            const pgErro = pgResults.find((r: any) => r.error);
                            if (pgErro) console.error('[PAGAMENTOS_UPDATE_ERROR]:', pgErro.error);
                            console.log('[PAGAMENTOS_UPDATE] Pagamentos pendentes atualizados em paralelo.');
                        }
                    }

                    if (matUpdate.total_parcelas !== undefined) {
                        const newTotal = matUpdate.total_parcelas;
                        const { data: todasParc } = await supabase
                            .from('pagamentos')
                            .select('*')
                            .eq('aluno_id', studentId)
                            .eq('tipo_receita', 'mensalidade')
                            .order('data_vencimento', { ascending: true });

                        if (todasParc && todasParc.length > newTotal) {
                            const excedentes = todasParc.slice(newTotal).filter((p: any) => p.status === 'pendente');
                            if (excedentes.length > 0) {
                                const excIds = excedentes.map((e: any) => e.id);
                                await supabase.from('pagamentos').delete().in('id', excIds);
                                console.log(`[PAGAMENTOS_UPDATE] Removidas ${excedentes.length} parcelas excedentes.`);
                            }
                        }
                    }
                } else {
                    console.warn(`[MATRICULA_UPDATE] Nenhuma matrícula encontrada para aluno ${studentId}`);
                }
            }

            // 3. Sincronizar dados do contrato (se houver contrato cadastrado)
            try {
                // Contratos assinados são documentos finais: nunca são reescritos
                const { data: contratosExistentes } = await supabase
                    .from('contratos')
                    .select('*')
                    .eq('aluno_id', studentId)
                    .neq('status', 'assinado');

                if (contratosExistentes && contratosExistentes.length > 0) {
                    const { data: fullAluno } = await supabase
                        .from('alunos')
                        .select('*, matriculas(*, cursos(nome))')
                        .eq('id', studentId)
                        .single();

                    if (fullAluno) {
                        const { data: template } = await supabase.from('contrato_templates').select('*').limit(1).maybeSingle();
                        const clausulasBase = (template && template.clausulas && template.clausulas.length > 0)
                            ? template.clausulas
                            : CLAUSULAS_PADRAO_CONTRATO;

                        const m = [...(fullAluno.matriculas || [])].sort((a: any, b: any) => Number(b.id) - Number(a.id))[0];
                        const responsavel = fullAluno.responsavel_nome || fullAluno.nome;
                        const cpfFinal = fullAluno.responsavel_cpf || fullAluno.cpf || '';
                        const enderecoFinal = fullAluno.endereco || '';
                        const cursoFinal = m?.cursos?.nome || 'Música';
                        const valorFinal = m?.valor_parcela || '370';
                        const vencimentoFinal = m?.dia_vencimento || '10';
                        const parcelasFinal = m?.total_parcelas || '6';

                        const syncPromises = contratosExistentes.map((cont: any) => {
                            const newHtml = generateContratoHtml({
                                alunoNome: fullAluno.nome,
                                responsavelNome: fullAluno.responsavel_nome,
                                cpf: cpfFinal,
                                endereco: enderecoFinal,
                                cursoNome: cursoFinal,
                                valorPlano: valorFinal,
                                diaVencimento: vencimentoFinal,
                                qtdParcelas: parcelasFinal,
                                clausulas: clausulasBase,
                                dataAssinatura: cont.data_assinatura ? new Date(cont.data_assinatura) : new Date(cont.created_at || Date.now())
                            });

                            const newDados = {
                                responsavel,
                                cpf: cpfFinal,
                                endereco: enderecoFinal,
                                cursoNome: cursoFinal,
                                valorPlano: valorFinal,
                                diaVencimento: vencimentoFinal,
                                qtdParcelas: parcelasFinal
                            };

                            return supabase.from('contratos').update({
                                conteudo_html: newHtml,
                                dados_dinamicos: newDados
                            }).eq('id', cont.id);
                        });

                        await Promise.all(syncPromises);
                        console.log(`[CONTRATO_SYNC] ${contratosExistentes.length} contratos sincronizados para aluno ${studentId}.`);
                    }
                }
            } catch (conErr) {
                console.error('[CONTRATO_SYNC_ERROR]:', conErr);
            }

            res.json({ success: true });
        } catch (error: any) {
            console.error('[FATAL_ALUNO_UPDATE]:', error);
            res.status(500).json({ error: error.message, stack: error.stack });
        }
    });

    app.delete('/api/cursos/:id', requireAdmin, async (req, res) => {
        try {
            const { error } = await supabase.from('cursos').delete().eq('id', req.params.id);
            if (error) throw error;
            res.json({ success: true });
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.get('/api/aulas', requireStaff, async (req: any, res) => {
        try {
            const { professor_id, start, end } = req.query;
            let query = supabase.from('aulas').select('id, data, horario, status, professor_id, aluno_id, alunos(nome)');
            
            if (professor_id) query = query.eq('professor_id', professor_id);
            if (start) query = query.gte('data', start);
            if (end) query = query.lte('data', end);
            
            const { data, error } = await query.order('data', { ascending: false });
            if (error) throw error;
            
            res.json(data);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/aulas', requireStaff, async (req: any, res) => {
        try {
            const { aluno_id, data, horario, horario_fim, curso_nome, status, conteudo, tarefa_casa, midias, xp_ganho, professor_id } = req.body;
            
            if (!req.user) {
                return res.status(401).json({ error: 'Não autorizado' });
            }
            
            let finalProfId = null;
            let profObj: any = null;

            if (req.user.role === 'admin' && professor_id) {
                finalProfId = professor_id;
                const { data: fetchedProf } = await supabase.from('professores').select('*').eq('id', professor_id).single();
                profObj = fetchedProf;
            } else {
                const { data: prof, error: profErr } = await supabase.from('professores')
                    .select('*')
                    .ilike('email', escapeLike(req.user.email))
                    .maybeSingle();
                    
                if (profErr || !prof) {
                    return res.status(404).json({ error: 'Professor não cadastrado com este e-mail' });
                }
                finalProfId = prof.id;
                profObj = prof;
            }

            // Calcular horario_fim de forma segura, evitando NaN:00
            const calcHorarioFim = (h: string | undefined, hFim: string | undefined): string => {
                if (hFim && hFim !== 'undefined' && !hFim.includes('NaN')) return hFim;
                if (!h || h === 'undefined') return '13:00';
                const parts = h.split(':');
                const hNum = parseInt(parts[0], 10);
                const mNum = parseInt(parts[1] || '0', 10);
                if (isNaN(hNum)) return '13:00';
                const newH = (hNum + 1) % 24;
                return `${String(newH).padStart(2, '0')}:${String(mNum).padStart(2, '0')}`;
            };

            let finalAlunoId = aluno_id;
            if (!finalAlunoId) {
                const { data: avulso } = await supabase.from('alunos').select('id').ilike('nome', '%Avulso%').limit(1).maybeSingle();
                if (avulso) {
                    finalAlunoId = avulso.id;
                } else {
                    const { data: newAvulso } = await supabase.from('alunos').insert([{ nome: 'Aluno Avulso', email: 'avulso@acorde.com', telefone: '00000000000' }]).select().single();
                    if (newAvulso) finalAlunoId = newAvulso.id;
                }
            }

            let cursoIdToInsert = req.body.curso_id || null;
            if (!cursoIdToInsert && finalAlunoId) {
                const { data: mat } = await supabase.from('matriculas').select('curso_id').eq('aluno_id', finalAlunoId).order('data_inicio', { ascending: false }).limit(1).maybeSingle();
                if (mat && mat.curso_id) cursoIdToInsert = mat.curso_id;
            }
            if (!cursoIdToInsert) {
                const { data: cur } = await supabase.from('cursos').select('id').limit(1).maybeSingle();
                if (cur && cur.id) cursoIdToInsert = cur.id;
            }

            const newAula = {
                aluno_id: finalAlunoId,
                professor_id: finalProfId,
                curso_id: cursoIdToInsert,
                data,
                horario: horario || '12:00',
                status: status || 'realizada',
                conteudo: conteudo || '',
                tarefa_casa: tarefa_casa || '',
                midias: midias || [],
                xp_ganho: xp_ganho !== undefined ? xp_ganho : 50
            };

            const { data: createdAula, error: createErr } = await supabase.from('aulas').insert([newAula]).select().single();
            if (createErr) throw createErr;

            
            if (newAula.status === 'realizada') {
                if (aluno_id) {
                    const { data: aluno } = await supabase.from('alunos').select('xp').eq('id', aluno_id).single();
                    if (aluno) {
                        const novoXp = (Number(aluno.xp) || 0) + Number(newAula.xp_ganho);
                        await supabase.from('alunos').update({ xp: novoXp }).eq('id', aluno_id);
                    }
                }
            }

            // Avisar o professor sobre a nova aula
            if (profObj?.id && profObj?.email) {
                const titulo = 'Nova aula agendada!';
                const msg = `Uma nova aula foi adicionada na sua agenda para o dia ${data} às ${horario}.`;
                await sendPushNotification(titulo, msg, String(profObj.id), profObj.email);
            }

            res.json({ success: true, data: createdAula });
        } catch (error: any) {
            console.error('Erro ao criar aula:', error);
            res.status(500).json({ error: error.message });
        }
    });

    app.patch('/api/aulas/:id/status', requireStaff, async (req, res) => {
        try {
            const { status, type, conteudo, tarefa_casa, midias, xp_ganho } = req.body;
            const table = type === 'experimental' ? 'aulas_experimentais' : 'aulas';
            
            // Buscar aula antes do update para ver o status, data e o professor anterior
            const { data: aulaAntiga } = await supabase.from(table).select('status, data, professor_id').eq('id', req.params.id).single();
            
            const updatePayload: any = { status };
            if (conteudo !== undefined) updatePayload.conteudo = conteudo;
            if (tarefa_casa !== undefined) updatePayload.tarefa_casa = tarefa_casa;
            if (midias !== undefined) updatePayload.midias = midias;
            if (xp_ganho !== undefined) updatePayload.xp_ganho = xp_ganho;
            
            // Se for aula regular e a data antiga começar com 2099, ao dar presença (realizada/falta_aluno), joga para o dia de hoje
            if (table === 'aulas' && aulaAntiga && aulaAntiga.data && aulaAntiga.data.startsWith('2099') && ['realizada', 'falta_aluno'].includes(status)) {
                updatePayload.data = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');
            }
            
            const { data, error } = await supabase.from(table).update(updatePayload).eq('id', req.params.id).select().single();
            if (error) throw error;

            // Lógica de Saldo de Professor por Presença/Falta foi movida para cálculo dinâmico na leitura.

            // Lógica de conceder XP para o aluno quando a aula é realizada
            // Só credita XP se a aula NÃO estava realizada antes (evita duplicação)
            const jaEraRealizada = aulaAntiga?.status === 'realizada';
            if (status === 'realizada' && !jaEraRealizada && table === 'aulas' && data?.aluno_id) {
                const xpDado = Number(xp_ganho) || Number(data.xp_ganho) || 50;
                const { data: aluno } = await supabase.from('alunos').select('xp').eq('id', data.aluno_id).single();
                if (aluno) {
                    const novoXp = (Number(aluno.xp) || 0) + xpDado;
                    await supabase.from('alunos').update({ xp: novoXp }).eq('id', data.aluno_id);
                }
            }

            // Automação para Lead
            if (type === 'experimental' && status === 'realizada' && data?.lead_id) {
                await supabase.from('leads').update({ status: 'experimental_concluida' }).eq('id', data.lead_id);
            }

            res.json({ success: true, data });
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.get('/api/salas', async (req, res) => {
        const { data } = await supabase.from('salas').select('*').order('id');
        res.json(data || []);
    });

    app.get('/api/dashboard/stats', requireAdmin, async (req, res) => {
        try {
            const today = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');
            const mesAtual = getMesAtualBR();

            const { count: totalAlunos } = await supabase.from('alunos').select('*', { count: 'exact', head: true }).eq('status', 'ativo');
            
            // Contar aulas regulares + experimentais de hoje
            const { count: aulasRegHoje } = await supabase.from('aulas').select('*', { count: 'exact', head: true }).eq('data', today);
            const { count: aulasExpHoje } = await supabase.from('aulas_experimentais').select('*', { count: 'exact', head: true }).eq('data', today);
            const aulasHoje = (aulasRegHoje || 0) + (aulasExpHoje || 0);

            // Receita: apenas mensalidades pagas no mês atual
            const { data: pagamentosMes } = await supabase.from('pagamentos')
                .select('valor, valor_pago')
                .eq('status', 'pago')
                .eq('tipo_receita', 'mensalidade')
                .eq('referencia_mes_ano', mesAtual);
            const receitaMensal = pagamentosMes?.reduce((acc: number, curr: any) => acc + Number(curr.valor_pago != null ? curr.valor_pago : curr.valor), 0) || 0;
            
            // Aulas do dia (regulares)
            const { data: aulasRegData } = await supabase.from('aulas')
                .select('id, data, horario, status, alunos(nome), professores(nome)')
                .eq('data', today)
                .order('horario');

            // Aulas experimentais do dia
            const { data: aulasExpData } = await supabase.from('aulas_experimentais')
                .select('id, data, horario, status, leads(nome), professores(nome)')
                .eq('data', today)
                .order('horario');
            
            const proximasAulas = [
                ...(aulasRegData?.map((a: any) => ({ 
                    id: a.id, horario: a.horario.substring(0, 5), 
                    aluno_nome: a.alunos?.nome, professor_nome: a.professores?.nome, 
                    status: a.status, type: 'regular'
                })) || []),
                ...(aulasExpData?.map((e: any) => ({ 
                    id: e.id, horario: e.horario.substring(0, 5), 
                    aluno_nome: `[EXP] ${e.leads?.nome}`, professor_nome: e.professores?.nome, 
                    status: e.status, type: 'experimental'
                })) || [])
            ].sort((a, b) => a.horario.localeCompare(b.horario));

            // Alunos ativos e se já ativaram o app/notificações (card "Status de instalação do App")
            const { data: alunosPush } = await supabase.from('alunos')
                .select('id, nome, push_ativo')
                .eq('status', 'ativo')
                .order('nome');
            const alunosAppStatus = (alunosPush || [])
                .map((a: any) => ({ id: a.id, nome: a.nome, ativo: Boolean(a.push_ativo) }))
                .sort((a: any, b: any) => Number(a.ativo) - Number(b.ativo));

            res.json({ totalAlunos: totalAlunos || 0, aulasHoje, receitaMensal, proximasAulas, alunosAppStatus });
        } catch (error) { res.status(500).json({ error: 'Erro ao carregar estatísticas' }); }
    });

    // Alunos + Matrícula
    app.get('/api/alunos', requireStaff, async (req, res) => {
        const { status } = req.query;
        let query = supabase.from('alunos').select('*, matriculas(*, cursos(nome)), aulas(status)').order('nome');
        
        if (status === 'arquivado') {
            query = query.eq('status', 'arquivado');
        } else {
            query = query.neq('status', 'arquivado');
        }

        const { data, error } = await query;
        if (error) {
            console.error('[GET /api/alunos] Erro:', error);
            return res.status(500).json({ error: error.message });
        }
        const formatted = data?.map((aluno: any) => {
            const aulasPendentes = aluno.aulas?.filter((a: any) => a.status?.toLowerCase() === 'pendente').length || 0;
            const alunoFormatado = { ...aluno, aulas_restantes: aulasPendentes };
            delete alunoFormatado.aulas; // Remover as aulas para não pesar a resposta
            return alunoFormatado;
        });
        res.json(formatted || []);
    });

    app.post('/api/alunos', requireAdmin, async (req, res) => {
        try {
            const { 
                nome, email, telefone, cpf, endereco, curso_id, professor_id, 
                dia_semana, horario, sala_id, pacote_id, 
                data_primeira_parcela, dia_vencimento, valor_parcela, total_parcelas 
            } = req.body;

            // 1. Criar Aluno
            const { data: aluno, error: errA } = await supabase.from('alunos').insert([{ 
                nome, 
                email: email || null, 
                telefone: telefone || null, 
                cpf: cpf || null, 
                endereco: endereco || null,
                data_nascimento: req.body.data_nascimento || null,
                responsavel_nome: req.body.responsavel_nome || null,
                responsavel_telefone: req.body.responsavel_telefone || null,
                responsavel_cpf: req.body.responsavel_cpf || null
            }]).select().single();
            if (errA) throw errA;

            // 2. Buscar Pacote e Calcular Valor com Desconto
            const { data: pacote } = await supabase.from('pacotes').select('*').eq('id', pacote_id).single();
            let effectiveValorDesconto = (req.body.valor_com_desconto != null && req.body.valor_com_desconto !== '') ? Number(req.body.valor_com_desconto) : null;
            if (effectiveValorDesconto === null) {
                const descAuto = Number(pacote?.desconto_automatico || 0);
                effectiveValorDesconto = descAuto > 0 ? Math.max(0, Number(valor_parcela) - descAuto) : Number(valor_parcela);
            }

            // 3. Criar Matrícula
            // Datas 'YYYY-MM-DD' interpretadas ao meio-dia UTC: o dia da semana não muda com o fuso do servidor
            const parsedDiaSemana = parseDateOnly(dia_semana || getDateBR());
            const { data: matricula, error: errM } = await supabase.from('matriculas').insert([{
                aluno_id: aluno.id, 
                curso_id, 
                professor_id, 
                dia_semana: !isNaN(parsedDiaSemana.getTime()) ? parsedDiaSemana.getUTCDay() : null,
                horario, 
                sala_id: sala_id || null, 
                pacote_id,
                data_primeira_parcela: data_primeira_parcela || null,
                dia_vencimento,
                valor_parcela,
                valor_com_desconto: effectiveValorDesconto,
                total_parcelas,
                data_inicio: dia_semana || null
            }]).select().single();
            if (errM) {
                await supabase.from('alunos').delete().eq('id', aluno.id);
                throw new Error(`Erro ao criar matrícula: ${errM.message || JSON.stringify(errM)}`);
            }

            // 4. Automação de Aulas (Reserva na Agenda)
            const totalAulas = pacote?.total_aulas || 1;
            
            const aulasToInsert = [];
            let currentAulaDate = parseDateOnly(dia_semana || getDateBR());
            
            for (let i = 0; i < totalAulas; i++) {
                // Pular feriados
                while (isHoliday(currentAulaDate)) {
                    currentAulaDate.setDate(currentAulaDate.getDate() + 7);
                }

                aulasToInsert.push({
                    aluno_id: aluno.id,
                    matricula_id: matricula.id,
                    professor_id,
                    curso_id,
                    sala_id: sala_id || null,
                    data: currentAulaDate.toISOString().split('T')[0],
                    horario,
                    status: 'pendente',
                    tipo: 'regular'
                });
                // Próxima semana
                currentAulaDate.setDate(currentAulaDate.getDate() + 7);
            }
            if (aulasToInsert.length > 0) {
                const { error: errAulas } = await supabase.from('aulas').insert(aulasToInsert);
                if (errAulas) {
                    await supabase.from('matriculas').delete().eq('id', matricula.id);
                    await supabase.from('alunos').delete().eq('id', aluno.id);
                    throw new Error(`Erro ao gerar aulas: ${errAulas.message || JSON.stringify(errAulas)}`);
                }
            }

            // 5. Geração de Pagamentos (Parcelas)
            // Parcelas mensais; se o mês não tiver o dia escolhido, vence no último dia do mês
            const pagamentosToInsert = gerarVencimentos(
                data_primeira_parcela || getDateBR(),
                total_parcelas || 1,
                dia_vencimento ? (parseInt(dia_vencimento, 10) || 10) : undefined
            ).map((venc) => ({
                aluno_id: aluno.id,
                matricula_id: matricula.id,
                valor: valor_parcela,
                valor_com_desconto: effectiveValorDesconto,
                data_vencimento: toDateStr(venc),
                status: 'pendente',
                tipo_receita: 'mensalidade',
                referencia_mes_ano: toRefMesAno(venc)
            }));
            if (pagamentosToInsert.length > 0) {
                const { error: errPagamentos } = await supabase.from('pagamentos').insert(pagamentosToInsert);
                if (errPagamentos) {
                    await supabase.from('aulas').delete().eq('matricula_id', matricula.id);
                    await supabase.from('matriculas').delete().eq('id', matricula.id);
                    await supabase.from('alunos').delete().eq('id', aluno.id);
                    throw errPagamentos;
                }
            }
            // 5. Automatização do Status do Lead para Matriculado
            if (telefone) {
                const telClean = telefone.replace(/\D/g, '');
                if (telClean) {
                    const { data: leadsMatch } = await supabase
                        .from('leads')
                        .select('id, status, telefone')
                        .neq('status', 'matriculado');
                    if (leadsMatch) {
                        const matchedLead = leadsMatch.find((l: any) => {
                            const lTelClean = (l.telefone || '').replace(/\D/g, '');
                            return lTelClean && (lTelClean.includes(telClean) || telClean.includes(lTelClean));
                        });
                        if (matchedLead) {
                            await supabase
                                .from('leads')
                                .update({ status: 'matriculado', data_atualizacao: new Date() })
                                .eq('id', matchedLead.id);
                        }
                    }
                }
            }

            res.json({ id: aluno.id });
        } catch (error: any) { 
            console.error(error);
            res.status(500).json({ error: 'Erro ao cadastrar aluno, aulas e parcelas', details: error.message || error }); 
        }
    });

    // Migração (Sala de Espera)
    app.get('/api/migracao/alunos', requireAdmin, async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('migracao_alunos')
                .select('*')
                .eq('status', 'pendente')
                .order('nome');
            
            if (error) throw error;
            res.json(data || []);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/migracao/batch', requireAdmin, async (req, res) => {
        try {
            const { students } = req.body;
            const { error } = await supabase.from('migracao_alunos').insert(students);
            if (error) throw error;
            res.json({ success: true });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/alunos/migracao', requireAdmin, async (req, res) => {
        const { migracao_id, ...studentData } = req.body;
        try {
            const { 
                nome, email, telefone, cpf, endereco, 
                data_nascimento, responsavel_nome, responsavel_telefone, responsavel_cpf,
                curso_id, professor_id, dia_semana, horario, pacote_id,
                aulas_restantes, reposicoes, faturas_pendentes, fatura_mes_atraso,
                valor_parcela, dia_vencimento
            } = req.body;

            // 1. Criar Aluno
            const { data: aluno, error: errA } = await supabase.from('alunos').insert([{ 
                nome, 
                email: email || null, 
                telefone: telefone || null, 
                cpf: cpf || null, 
                endereco: endereco || null,
                data_nascimento: data_nascimento || null,
                responsavel_nome: responsavel_nome || null,
                responsavel_telefone: responsavel_telefone || null,
                responsavel_cpf: responsavel_cpf || null,
                status: 'ativo'
            }]).select().single();
            if (errA) throw errA;

            // 2. Criar Matrícula
            const diasMap: { [key: string]: number } = { 'domingo': 0, 'segunda': 1, 'terca': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sabado': 6 };
            const diaIndex = typeof dia_semana === 'string' ? (diasMap[dia_semana.toLowerCase()] ?? 1) : dia_semana;

            const { data: matricula, error: errM } = await supabase.from('matriculas').insert([{
                aluno_id: aluno.id, 
                curso_id, 
                professor_id, 
                dia_semana: diaIndex,
                horario, 
                pacote_id,
                dia_vencimento: dia_vencimento || 10,
                valor_parcela: valor_parcela || 0,
                data_inicio: getDateBR()
            }]).select().single();
            if (errM) {
                await supabase.from('alunos').delete().eq('id', aluno.id);
                throw errM;
            }

            // 3. Criar Aulas Restantes
            if (aulas_restantes > 0) {
                const aulasToInsert = [];
                let currentAulaDate = new Date();
                const targetDay = diaIndex;
                const currentDay = currentAulaDate.getDay();
                let diff = targetDay - currentDay;
                if (diff <= 0) diff += 7;
                currentAulaDate.setDate(currentAulaDate.getDate() + diff);

                for (let i = 0; i < aulas_restantes; i++) {
                    while (isHoliday(currentAulaDate)) {
                        currentAulaDate.setDate(currentAulaDate.getDate() + 7);
                    }
                    aulasToInsert.push({
                        aluno_id: aluno.id,
                        matricula_id: matricula.id,
                        professor_id,
                        curso_id,
                        data: currentAulaDate.toISOString().split('T')[0],
                        horario,
                        status: 'pendente',
                        tipo: 'regular'
                    });
                    currentAulaDate.setDate(currentAulaDate.getDate() + 7);
                }
                await supabase.from('aulas').insert(aulasToInsert);
            }

            // 4. Criar Reposições
            if (reposicoes > 0) {
                const reposToInsert = [];
                for (let i = 0; i < reposicoes; i++) {
                    reposToInsert.push({
                        aluno_id: aluno.id,
                        matricula_id: matricula.id,
                        professor_id,
                        curso_id,
                        data: '2099-12-31', // Placeholder longe no futuro para reposição a agendar
                        horario: '00:00',
                        status: 'pendente',
                        tipo: 'reposicao'
                    });
                }
                await supabase.from('aulas').insert(reposToInsert);
            }

            // 5. Criar Faturas
            const pagamentosToInsert = [];
            const diaVenc = Number(dia_vencimento) || 10;
            const hojeBR = parseDateOnly(getDateBR());
            const vencMesAtual = addMonthsKeepDay(hojeBR, 0, diaVenc);
            
            // Fatura do mês atual
            pagamentosToInsert.push({
                aluno_id: aluno.id,
                matricula_id: matricula.id,
                valor: valor_parcela,
                data_vencimento: toDateStr(vencMesAtual),
                status: fatura_mes_atraso ? 'atrasado' : 'pendente',
                tipo_receita: 'mensalidade',
                referencia_mes_ano: toRefMesAno(vencMesAtual)
            });

            // Parcelas restantes: a partir do mês que vem (é o que a tela de Migração pede).
            // Antes eram criadas para trás como "atrasado", gerando dívidas falsas.
            for (let i = 1; i <= (Number(faturas_pendentes) || 0); i++) {
                const nextDate = addMonthsKeepDay(hojeBR, i, diaVenc);
                pagamentosToInsert.push({
                    aluno_id: aluno.id,
                    matricula_id: matricula.id,
                    valor: valor_parcela,
                    data_vencimento: toDateStr(nextDate),
                    status: 'pendente',
                    tipo_receita: 'mensalidade',
                    referencia_mes_ano: toRefMesAno(nextDate)
                });
            }

            if (pagamentosToInsert.length > 0) {
                await supabase.from('pagamentos').insert(pagamentosToInsert);
            }

            // 6. Marcar como concluído na sala de espera
            if (migracao_id) {
                await supabase.from('migracao_alunos').update({ status: 'concluido' }).eq('id', migracao_id);
            }

            res.json({ success: true, id: aluno.id });
        } catch (error: any) { 
            console.error('Migration error:', error);
            res.status(500).json({ error: error.message || 'Erro na migração' }); 
        }
    });

    // Cursos
    app.get('/api/cursos', async (req, res) => {
        const { data } = await supabase.from('cursos').select('*').order('nome');
        res.json(data || []);
    });

    app.post('/api/cursos', requireAdmin, async (req, res) => {
        try {
            const { data, error } = await supabase.from('cursos').insert([req.body]).select().single();
            if (error) throw error;
            res.json(data);
        } catch (error) { res.status(500).json({ error: 'Erro ao salvar curso' }); }
    });

    // Professores
    app.get('/api/professores/me', async (req: any, res) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Não autorizado' });
            }
            const { data: prof, error } = await supabase.from('professores')
                .select('*')
                .ilike('email', escapeLike(req.user.email))
                .maybeSingle();
            
            if (error) throw error;
            if (!prof) {
                return res.status(404).json({ error: 'Professor não cadastrado com este e-mail' });
            }

            // Cálculo dinâmico do saldo do mês atual
            // Cálculo do histórico financeiro (últimos 6 meses)
            // Últimos 6 meses calculados com a mesma regra da folha (valor da aula por nº de alunos do mês)
            const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            const meses: string[] = [];
            let cursor = getMesAtualBR();
            for (let i = 0; i < 6; i++) { meses.push(cursor); cursor = mesAnterior(cursor); }
            const folhas = await Promise.all(meses.map((m) => calcularFolhaProfessores(m, prof.id)));

            const historico = folhas.map((f, i) => {
                const meu = f.professores.find((p: any) => Number(p.professor_id) === Number(prof.id));
                const [m, y] = meses[i].split('/');
                return {
                    mes_ano: `${monthNames[Number(m) - 1]} ${y}`,
                    aulas: meu?.aulas_realizadas || 0,
                    valor: meu?.valor_realizado || 0,
                    aulas_previstas: meu?.aulas_previstas || 0,
                    valor_previsto_total: meu?.valor_previsto_total || 0,
                    valor_aula: meu?.valor_aula || valorAulaPorQtdAlunos(0),
                    alunos_no_mes: meu?.alunos_no_mes || 0
                };
            });

            const atual = historico[0];
            prof.saldo = atual.valor;
            prof.saldo_previsto_mes = atual.valor_previsto_total;
            prof.valor_aula_calculado = atual.valor_aula;
            prof.alunos_ativos = atual.alunos_no_mes;
            prof.historico_financeiro = historico;

            res.json(prof);
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.delete('/api/aulas/:id', async (req: any, res) => {
        try {
            if (!req.user || req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Acesso negado. Apenas admin.' });
            }
            const { error } = await supabase.from('aulas').delete().eq('id', req.params.id);
            if (error) throw error;
            res.json({ success: true });
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.get('/api/horarios-disponiveis', async (req, res) => {
        const data = [
            "08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
        ];
        res.json(data);
    });

    app.get('/api/professores', requireStaff, async (req, res) => {
        let profQuery = supabase.from('professores').select('*').order('nome');
        if (req.query.incluir_inativos !== '1') profQuery = profQuery.neq('status', 'inativo');
        const { data } = await profQuery;
        // Filter out duplicates by nome
        const uniqueData = data ? Array.from(new Map(data.map(item => [item.nome.trim().toLowerCase(), item])).values()) : [];
        res.json(uniqueData);
    });

    app.post('/api/professores', requireAdmin, async (req, res) => {
        try {
            const { data, error } = await supabase.from('professores').insert([req.body]).select().single();
            if (error) throw error;
            res.json(data);
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    // Admin edita qualquer professor; professor só edita o próprio cadastro (sem mexer em valor/status/email)
    const requireAdminOrOwnProfessor = async (req: any, res: any, next: any) => {
        if (req.user?.role === 'admin') return next();
        if (req.user?.role !== 'professor') return res.status(403).json({ error: 'Acesso negado.' });
        const { data: prof } = await supabase.from('professores').select('id').ilike('email', escapeLike(req.user.email)).maybeSingle();
        if (!prof || Number(prof.id) !== Number(req.params.id)) {
            return res.status(403).json({ error: 'Acesso negado: você só pode editar seu próprio cadastro.' });
        }
        if (req.body && typeof req.body === 'object') {
            for (const campo of ['id', 'valor_aula', 'status', 'email', 'xp', 'acorde_coins', 'saldo']) delete req.body[campo];
        }
        next();
    };

    app.post('/api/professores/:id/disponibilidade', requireAdminOrOwnProfessor, async (req, res) => {
        try {
            const { disponibilidade } = req.body;
            const { data, error } = await supabase.from('professores').update({ disponibilidade }).eq('id', req.params.id).select().single();
            if (error) throw error;
            res.json(data);
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.put('/api/professores/:id', requireAdminOrOwnProfessor, async (req, res) => {
        try {
            const { data, error } = await supabase.from('professores')
                .update(req.body)
                .eq('id', req.params.id)
                .select()
                .single();
            if (error) throw error;
            res.json(data);
        } catch (error) { res.status(500).json({ error: 'Erro ao atualizar professor' }); }
    });

    app.patch('/api/professores/:id', requireAdminOrOwnProfessor, async (req, res) => {
        try {
            const { data, error } = await supabase.from('professores')
                .update(req.body)
                .eq('id', req.params.id)
                .select()
                .single();
            if (error) throw error;
            res.json(data);
        } catch (error) { res.status(500).json({ error: 'Erro ao atualizar professor' }); }
    });

    app.delete('/api/professores/:id', requireAdmin, async (req, res) => {
        try {
            const profId = req.params.id;

            // Com histórico (matrículas ou aulas), o professor é arquivado: matrículas, aulas e pagamentos
            // dos alunos ficam preservados. Sem histórico, o cadastro é excluído.
            const { count: qtdMatriculas } = await supabase.from('matriculas').select('id', { count: 'exact', head: true }).eq('professor_id', profId);
            const { count: qtdAulas } = await supabase.from('aulas').select('id', { count: 'exact', head: true }).eq('professor_id', profId);
            const { count: qtdExp } = await supabase.from('aulas_experimentais').select('id', { count: 'exact', head: true }).eq('professor_id', profId);

            if ((qtdMatriculas || 0) + (qtdAulas || 0) + (qtdExp || 0) > 0) {
                const { error } = await supabase.from('professores').update({ status: 'inativo' }).eq('id', profId);
                if (error) throw error;
                return res.json({ success: true, arquivado: true, message: 'Professor possui histórico e foi arquivado (dados preservados).' });
            }

            const { error } = await supabase.from('professores').delete().eq('id', profId);
            if (error) throw error;
            res.json({ success: true });
        } catch (error: any) { res.status(500).json({ error: error.message || 'Erro ao excluir professor' }); }
    });

    // Leads (Atendimento)
    app.get('/api/leads', requireAdmin, async (req, res) => {
        try {
            const { data, error } = await supabase.from('leads').select('*, cursos(nome)').order('data_criacao', { ascending: false });
            if (error) {
                console.error('[GET /api/leads] Erro ao buscar com relação:', error);
                const { data: rawLeads, error: rawError } = await supabase.from('leads').select('*').order('data_criacao', { ascending: false });
                if (rawError) throw rawError;
                return res.json(rawLeads || []);
            }
            res.json(data || []);
        } catch (error: any) {
            console.error('[GET /api/leads] Erro inesperado:', error);
            res.status(500).json({ error: error.message || 'Erro ao buscar leads' });
        }
    });

    app.post('/api/leads', requireAdmin, async (req, res) => {
        try {
            const { nome, telefone, interesse_curso_id, status, observacoes, origem } = req.body;
            if (!telefone) {
                return res.status(400).json({ error: 'O telefone do lead é obrigatório' });
            }
            let parsedCursoId = null;
            if (interesse_curso_id !== undefined && interesse_curso_id !== null && interesse_curso_id !== '') {
                const parsed = parseInt(String(interesse_curso_id), 10);
                if (!isNaN(parsed)) parsedCursoId = parsed;
            }
            const { data, error } = await supabase.from('leads').insert([{
                nome: nome || null,
                telefone,
                interesse_curso_id: parsedCursoId,
                status: status || 'em_atendimento',
                observacoes: observacoes || null,
                origem: origem || null,
                data_atualizacao: new Date()
            }]).select().single();
            if (error) throw error;
            res.json(data);
        } catch (error: any) { res.status(500).json({ error: error.message || 'Erro ao salvar lead' }); }
    });

    app.patch('/api/leads/:id/status', requireAdmin, async (req, res) => {
        try {
            const { status } = req.body;
            const { id } = req.params;
            const { data, error } = await supabase
                .from('leads')
                .update({ status, data_atualizacao: new Date() })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            res.json(data);
        } catch (error: any) { res.status(500).json({ error: error.message || 'Erro ao atualizar status do lead' }); }
    });

    app.patch('/api/leads/:id', requireAdmin, async (req, res) => {
        try {
            const { nome, telefone, interesse_curso_id, status, observacoes, origem } = req.body;
            const { id } = req.params;
            const updateData: any = { data_atualizacao: new Date() };
            if (nome !== undefined) updateData.nome = nome || null;
            if (telefone !== undefined) {
                if (!telefone) return res.status(400).json({ error: 'O telefone é obrigatório' });
                updateData.telefone = telefone;
            }
            if (interesse_curso_id !== undefined) {
                let parsedCursoId = null;
                if (interesse_curso_id !== null && interesse_curso_id !== '') {
                    const parsed = parseInt(String(interesse_curso_id), 10);
                    if (!isNaN(parsed)) parsedCursoId = parsed;
                }
                updateData.interesse_curso_id = parsedCursoId;
            }
            if (status !== undefined) updateData.status = status;
            if (observacoes !== undefined) updateData.observacoes = observacoes || null;
            if (origem !== undefined) updateData.origem = origem || null;

            const { data, error } = await supabase
                .from('leads')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            res.json(data);
        } catch (error: any) { res.status(500).json({ error: error.message || 'Erro ao atualizar lead' }); }
    });

    app.post('/api/leads/verificar-followup', requireAdmin, async (req, res) => {
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const { data: leadsPendentes, error: errL } = await supabase
                .from('leads')
                .select('*, cursos(nome)')
                .in('status', ['em_atendimento', 'nao_responde', 'aula_marcada']);

            if (errL) throw errL;
            if (!leadsPendentes || leadsPendentes.length === 0) {
                return res.json({ success: true, message: 'Nenhum lead em aberto para follow-up.' });
            }

            const leadsParaNotificar = leadsPendentes.filter((lead: any) => {
                const dataLead = new Date(lead.data_atualizacao || lead.data_criacao || new Date());
                const dataLeadStr = dataLead.toISOString().split('T')[0];
                const isOlderThanToday = dataLeadStr < todayStr;
                const jaNotificadoHoje = lead.notificado_followup_em === todayStr;
                return isOlderThanToday && !jaNotificadoHoje;
            });

            if (leadsParaNotificar.length === 0) {
                return res.json({ success: true, message: 'Os leads já foram notificados hoje ou são recentes.' });
            }

            const { data: configs } = await supabase.from('system_config').select('*');
            let smtpEmail = configs?.find((c: any) => c.key_name === 'SMTP_EMAIL' || c.chave === 'SMTP_EMAIL')?.key_value || configs?.find((c: any) => c.key_name === 'SMTP_EMAIL' || c.chave === 'SMTP_EMAIL')?.valor || process.env.SMTP_EMAIL;
            let smtpPass = configs?.find((c: any) => c.key_name === 'SMTP_PASSWORD' || c.key_name === 'SMTP_PASS' || c.chave === 'SMTP_PASSWORD' || c.chave === 'SMTP_PASS')?.key_value || configs?.find((c: any) => c.key_name === 'SMTP_PASSWORD' || c.key_name === 'SMTP_PASS' || c.chave === 'SMTP_PASSWORD' || c.chave === 'SMTP_PASS')?.valor || process.env.SMTP_PASSWORD || process.env.SMTP_PASS;

            if (!smtpEmail || !smtpPass) {
                return res.status(400).json({ error: 'Configurações de SMTP não encontradas.' });
            }

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: smtpEmail, pass: smtpPass }
            });

            const leadsHtmlList = leadsParaNotificar.map((l: any) => {
                const dataFormatada = new Date(l.data_atualizacao || l.data_criacao).toLocaleDateString('pt-BR');
                const statusMap: { [key: string]: string } = {
                    iniciado: 'Atendimento Iniciado',
                    em_atendimento: 'Em Atendimento',
                    nao_responde: 'Não Responde',
                    aula_marcada: 'Aula Marcada'
                };
                const statusFormatado = statusMap[l.status] || l.status;
                return `
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 10px; font-weight: bold;">${l.nome || 'Sem Nome'}</td>
                        <td style="padding: 10px;">${l.telefone || 'Sem Telefone'}</td>
                        <td style="padding: 10px; color: #ff6b00; font-weight: bold;">${statusFormatado}</td>
                        <td style="padding: 10px;">${l.cursos?.nome || 'Não Informado'}</td>
                        <td style="padding: 10px;">${dataFormatada}</td>
                    </tr>
                `;
            }).join('');

            const emailHtml = `
                <div style="font-family: sans-serif; padding: 20px; background: #fff8f6; border: 4px solid #261812; color: #261812; max-width: 650px; margin: 0 auto;">
                    <h2 style="color: #ff6b00; text-transform: uppercase; border-bottom: 2px solid #261812; padding-bottom: 10px;">ALERTA DE FOLLOW-UP - ACORDE CRM</h2>
                    <p style="font-size: 14px; font-weight: bold;">Olá!</p>
                    <p>O sistema identificou <strong>${leadsParaNotificar.length} lead(s) em aberto</strong> aguardando contato ou acompanhamento (criados ou atualizados antes de hoje):</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: white; border: 1px solid #ccc;">
                        <thead>
                            <tr style="background: #261812; color: white;">
                                <th style="padding: 10px; text-align: left; font-size: 12px; text-transform: uppercase;">Nome</th>
                                <th style="padding: 10px; text-align: left; font-size: 12px; text-transform: uppercase;">Telefone</th>
                                <th style="padding: 10px; text-align: left; font-size: 12px; text-transform: uppercase;">Status</th>
                                <th style="padding: 10px; text-align: left; font-size: 12px; text-transform: uppercase;">Curso</th>
                                <th style="padding: 10px; text-align: left; font-size: 12px; text-transform: uppercase;">Última Interação</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${leadsHtmlList}
                        </tbody>
                    </table>
                    
                    <p>Por favor, acesse o painel de atendimento para dar andamento ou finalizar estes leads:</p>
                    <div style="text-align: center; margin: 25px 0;">
                        <a href="https://acordecrm.vercel.app/atendimento" style="background-color: #ff6b00; color: white; padding: 12px 25px; text-decoration: none; font-weight: bold; border: 2px solid #261812;">IR PARA O ATENDIMENTO</a>
                    </div>
                </div>
            `;

            const destinatarios = [smtpEmail, 'antonycorp11@gmail.com'].filter(Boolean).join(', ');

            await transporter.sendMail({
                from: `"Acorde CRM Follow-up" <${smtpEmail}>`,
                to: destinatarios,
                subject: `⚠️ ALERTA: ${leadsParaNotificar.length} Leads aguardando Follow-up - Studio Acorde`,
                html: emailHtml
            });

            const leadIds = leadsParaNotificar.map((l: any) => l.id);
            const { error: errU } = await supabase
                .from('leads')
                .update({ notificado_followup_em: todayStr })
                .in('id', leadIds);

            if (errU) throw errU;

            res.json({ success: true, count: leadsParaNotificar.length });
        } catch (error: any) {
            console.error('[FOLLOW_UP] Erro:', error);
            res.status(500).json({ error: error.message || 'Erro ao processar' });
        }
    });

    // Agendamento de Aula Experimental
    app.post('/api/leads/experimental', requireAdmin, async (req, res) => {
        try {
            const { lead_id, professor_id, curso_id, data, horario, sala_id } = req.body;
            const { data: exp, error: errE } = await supabase.from('aulas_experimentais').insert([{
                lead_id, professor_id, curso_id, data, horario, sala_id, status: 'agendada'
            }]).select().single();
            if (errE) throw errE;
            
            // Atualizar status do lead
            await supabase.from('leads').update({ status: 'aula_marcada', data_atualizacao: new Date() }).eq('id', lead_id);
            
            res.json(exp);
        } catch (error) { res.status(500).json({ error: 'Erro ao agendar aula experimental' }); }
    });

    app.get('/api/leads/experimentais-pendentes', requireAdmin, async (req, res) => {
        try {
            const today = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');
            const { data, error } = await supabase
                .from('aulas_experimentais')
                .select('*, leads(nome, telefone), professores(nome), cursos(nome)')
                .gte('data', today)
                .order('data')
                .order('horario');
            if (error) throw error;
            res.json(data || []);
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    // Locações
    app.post('/api/locacoes', requireAdmin, async (req, res) => {
        try {
            const { data, error } = await supabase.from('locacoes').insert([req.body]).select().single();
            if (error) throw error;
            if (data) {
                await supabase.from('pagamentos').insert([{
                    valor: data.valor,
                    data_vencimento: data.data,
                    status: 'pendente',
                    tipo_receita: data.tipo === 'sala_ensaio' ? 'locacao_sala' : 'locacao_equipamento',
                    locacao_id: data.id
                }]);
            }
            res.json(data);
        } catch (error) { res.status(500).json({ error: 'Erro ao registrar locação' }); }
    });

    // Pagamentos Global
    app.get('/api/pagamentos', requireAdmin, async (req, res) => {
        try {
            const { mes, desconto_dia_10 } = req.query;
            const applyDiscount = desconto_dia_10 === 'true';

            let dbQuery = supabase
                .from('pagamentos')
                .select('*, aluno:aluno_id(nome, status, telefone, responsavel_telefone, matriculas(id, status, valor_com_desconto))');
            
            if (mes && mes !== 'undefined' && mes !== '') {
                dbQuery = dbQuery.eq('referencia_mes_ano', String(mes).trim());
            }

            const { data, error } = await dbQuery.order('data_vencimento', { ascending: true });
            if (error) throw error;
            
            let filteredData = data?.filter((p: any) => {
                if (p.aluno && p.aluno.status === 'arquivado') return false;
                return true;
            }) || [];

            // Get matricula_ids to find their max vencimento
            const matriculaIds = [...new Set(filteredData.filter((p: any) => p.matricula_id).map((p: any) => p.matricula_id))];
            
            let lastPagamentosMap: Record<number, string> = {};
            if (matriculaIds.length > 0) {
                const { data: allPagsForMatriculas } = await supabase.from('pagamentos')
                    .select('id, matricula_id, data_vencimento')
                    .in('matricula_id', matriculaIds)
                    .order('data_vencimento', { ascending: false });
                
                if (allPagsForMatriculas) {
                    allPagsForMatriculas.forEach(p => {
                        if (!lastPagamentosMap[p.matricula_id]) {
                            lastPagamentosMap[p.matricula_id] = p.id;
                        }
                    });
                }
            }

            const formatted = filteredData.map((p: any) => {
                let valorEfetivo = Number(p.valor);
                if (applyDiscount && p.tipo_receita === 'mensalidade' && p.status !== 'pago') {
                    const alunoObj: any = Array.isArray(p.aluno) ? p.aluno[0] : p.aluno;
                    const matriculas = alunoObj?.matriculas;
                    let matriculaAlvo: any = null;
                    if (Array.isArray(matriculas) && matriculas.length > 0) {
                        matriculaAlvo = p.matricula_id ? matriculas.find((m: any) => String(m.id) === String(p.matricula_id)) : null;
                        if (!matriculaAlvo) matriculaAlvo = matriculas.find((m: any) => m.status === 'ativa');
                    }
                    if (matriculaAlvo && matriculaAlvo.valor_com_desconto != null && Number(matriculaAlvo.valor_com_desconto) > 0) {
                        valorEfetivo = Number(matriculaAlvo.valor_com_desconto);
                    }
                }
                const alunoNome = p.aluno?.nome || p.descricao || 'S/N';
                return { 
                    ...p, 
                    aluno_nome: alunoNome, 
                    valor: valorEfetivo,
                    is_ultima_parcela: p.matricula_id ? lastPagamentosMap[p.matricula_id] === p.id : false
                };
            });
            res.json(formatted);
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    // Baixar (marcar como pago) um pagamento
    app.patch('/api/pagamentos/:id/baixa', requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const { metodo_pagamento, valor_pago } = req.body;
            const today = getDateBR();
            const update: any = { status: 'pago', data_pagamento: today, metodo_pagamento: metodo_pagamento || 'dinheiro' };
            // Guarda o valor efetivamente recebido (a tela envia; antes era descartado)
            if (valor_pago !== undefined && valor_pago !== null && valor_pago !== '' && Number.isFinite(Number(valor_pago)) && Number(valor_pago) >= 0) {
                update.valor_pago = Number(valor_pago);
            }
            const { data, error } = await supabase.from('pagamentos')
                .update(update)
                .eq('id', id).select().single();
            if (error) throw error;
            res.json(data);
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    // Registrar cobrança enviada por WhatsApp
    app.post('/api/pagamentos/:id/registrar-cobranca', requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const { data: pg, error: getError } = await supabase
                .from('pagamentos')
                .select('cobranca_contador')
                .eq('id', id)
                .single();
            if (getError) throw getError;

            const novoContador = (pg?.cobranca_contador || 0) + 1;
            const { data, error } = await supabase.from('pagamentos')
                .update({ 
                    ultima_cobranca_em: new Date().toISOString(), 
                    cobranca_contador: novoContador 
                })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            res.json(data);
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    // Alterar data de vencimento de um pagamento
    app.patch('/api/pagamentos/:id', requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body; // { data_vencimento, referencia_mes_ano, etc }
            const { data, error } = await supabase.from('pagamentos')
                .update(updates).eq('id', id).select().single();
            if (error) throw error;
            res.json(data);
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    // Excluir um pagamento
    app.delete('/api/pagamentos/:id', requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const { error } = await supabase.from('pagamentos').delete().eq('id', id);
            if (error) throw error;
            res.json({ success: true });
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    // Adicionar entrada extra (ensaio, aluguel, multa, etc)
    app.post('/api/pagamentos/entrada-extra', requireAdmin, async (req, res) => {
        try {
            const { descricao, valor, tipo_receita, data_vencimento, referencia_mes_ano, aluno_id } = req.body;
            const now = new Date();
            const { data, error } = await supabase.from('pagamentos').insert([{
                aluno_id: aluno_id || null,
                descricao,
                valor,
                tipo_receita: tipo_receita || 'outros',
                data_vencimento: data_vencimento || now.toISOString().split('T')[0],
                referencia_mes_ano: referencia_mes_ano || `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`,
                status: 'pendente'
            }]).select().single();
            if (error) throw error;
            res.json(data);
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    // ==========================================
    // ENDPOINTS DE DESPESAS (CONTAS A PAGAR)
    // ==========================================

    app.get('/api/despesas', requireAdmin, async (req, res) => {
        try {
            const { mes } = req.query;
            const mesRef = (mes && mes !== 'undefined' && mes !== '') ? String(mes).trim() : getMesAtualBR();
            
            const [m, y] = mesRef.split('/');
            const startDate = `${y}-${m}-01`;
            const endDate = new Date(Number(y), Number(m), 0).toISOString().split('T')[0];

            const { data, error } = await supabase.from('despesas')
                .select('*')
                .gte('data_vencimento', startDate)
                .lte('data_vencimento', endDate)
                .order('data_vencimento', { ascending: true });
            
            if (error) throw error;
            res.json(data);
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.post('/api/despesas', requireAdmin, async (req, res) => {
        try {
            const { descricao, valor, data_vencimento, categoria, tipo_recorrencia, total_parcelas, professor_id } = req.body;
            
            let numParcelas = total_parcelas || 1;
            if (categoria === 'fixa') {
                numParcelas = 12; // Gera 12 meses para frente
            }
            
            if (numParcelas > 1) {
                // Gerar múltiplas faturas (uma por mês)
                const faturas = [];
                const vencimentos = gerarVencimentos(data_vencimento, numParcelas);
                
                for (let i = 1; i <= numParcelas; i++) {
                    const currentDate = vencimentos[i - 1];
                    const descSuffix = categoria === 'fixa' ? '' : ` (${i}/${numParcelas})`;
                    faturas.push({
                        descricao: `${descricao}${descSuffix}`,
                        valor: Number(valor),
                        data_vencimento: currentDate.toISOString().split('T')[0],
                        categoria,
                        tipo_recorrencia: categoria === 'fixa' ? 'mensal' : 'unica',
                        parcela_atual: categoria === 'fixa' ? null : i,
                        total_parcelas: categoria === 'fixa' ? null : numParcelas,
                        professor_id: professor_id || null,
                        status: 'pendente'
                    });
                }
                
                const { data, error } = await supabase.from('despesas').insert(faturas).select();
                if (error) throw error;
                return res.json(data);
            } else {
                // Fatura única
                const { data, error } = await supabase.from('despesas').insert([{
                    descricao,
                    valor: Number(valor),
                    data_vencimento,
                    categoria: categoria || 'outros',
                    tipo_recorrencia: tipo_recorrencia || 'unica',
                    professor_id: professor_id || null,
                    status: 'pendente'
                }]).select().single();
                if (error) throw error;
                return res.json(data);
            }
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.patch('/api/despesas/:id/baixa', requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const now = new Date();
            const { data, error } = await supabase.from('despesas')
                .update({ status: 'pago', data_pagamento: now.toISOString().split('T')[0] })
                .eq('id', id).select().single();
            if (error) throw error;
            res.json(data);
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.delete('/api/despesas/:id', requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const { error } = await supabase.from('despesas').delete().eq('id', id);
            if (error) throw error;
            res.json({ success: true });
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    const DEFAULT_MENSAGEM_COBRANCA = {
        mensagem_pendente: `Olá {nome}, tudo bem?\n\nSua mensalidade está próxima do vencimento ({vencimento}).\nPague até o dia do vencimento para garantir o seu valor com desconto de R$ {valor}.\n\nAguardamos o comprovante para dar baixa no sistema! Obrigado.\n\nChave PIX CNPJ (toque para copiar):\n\`{chave_pix}\``,
        mensagem_atrasada: `Olá {nome}, tudo bem?\n\nO pagamento da sua mensalidade no valor de R$ {valor} está em atraso.\n\nAguardamos o comprovante para dar baixa no sistema! Obrigado.\n\nChave PIX CNPJ (toque para copiar):\n\`{chave_pix}\``,
        chave_pix: `55273720000112`
    };

    // Configurações de Mensagem de Cobrança
    app.get('/api/financeiro/mensagem-cobranca', requireAdmin, async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('system_config')
                .select('key_value')
                .eq('key_name', 'CONFIG_MENSAGEM_COBRANCA')
                .maybeSingle();

            if (error) throw error;

            if (data && data.key_value) {
                try {
                    const parsed = JSON.parse(data.key_value);
                    return res.json({
                        mensagem_pendente: parsed.mensagem_pendente || DEFAULT_MENSAGEM_COBRANCA.mensagem_pendente,
                        mensagem_atrasada: parsed.mensagem_atrasada || DEFAULT_MENSAGEM_COBRANCA.mensagem_atrasada,
                        chave_pix: (parsed.chave_pix !== undefined && parsed.chave_pix !== null) ? parsed.chave_pix : DEFAULT_MENSAGEM_COBRANCA.chave_pix
                    });
                } catch (e) {
                    console.error('Erro ao fazer parse de CONFIG_MENSAGEM_COBRANCA:', e);
                }
            }
            res.json(DEFAULT_MENSAGEM_COBRANCA);
        } catch (error: any) {
            console.error('Erro get mensagem-cobranca:', error);
            res.json(DEFAULT_MENSAGEM_COBRANCA);
        }
    });

    app.post('/api/financeiro/mensagem-cobranca', requireAdmin, async (req, res) => {
        try {
            const { mensagem_pendente, mensagem_atrasada, chave_pix } = req.body;
            const payload = JSON.stringify({
                mensagem_pendente: mensagem_pendente || DEFAULT_MENSAGEM_COBRANCA.mensagem_pendente,
                mensagem_atrasada: mensagem_atrasada || DEFAULT_MENSAGEM_COBRANCA.mensagem_atrasada,
                chave_pix: (chave_pix !== undefined && chave_pix !== null) ? chave_pix : DEFAULT_MENSAGEM_COBRANCA.chave_pix
            });

            const { data: existing } = await supabase
                .from('system_config')
                .select('id')
                .eq('key_name', 'CONFIG_MENSAGEM_COBRANCA')
                .maybeSingle();

            let result;
            if (existing) {
                result = await supabase
                    .from('system_config')
                    .update({ key_value: payload, updated_at: new Date().toISOString() })
                    .eq('key_name', 'CONFIG_MENSAGEM_COBRANCA');
            } else {
                result = await supabase
                    .from('system_config')
                    .insert([{ key_name: 'CONFIG_MENSAGEM_COBRANCA', key_value: payload }]);
            }

            if (result.error) throw result.error;
            res.json({ success: true, config: JSON.parse(payload) });
        } catch (error: any) {
            console.error('Erro post mensagem-cobranca:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Resumo financeiro do mês
    app.get('/api/financeiro/resumo', requireAdmin, async (req, res) => {
        try {
            const { mes, desconto_dia_10 } = req.query;
            const applyDiscount = desconto_dia_10 === 'true';
            const mesRef = (mes && mes !== 'undefined' && mes !== '') ? String(mes).trim() : getMesAtualBR();
            
            // Só somar pagamentos de alunos ativos, trazendo matrículas para considerar desconto
            const { data: rawPags, error } = await supabase.from('pagamentos')
                .select('valor, valor_pago, status, tipo_receita, matricula_id, aluno:aluno_id(status, matriculas(id, status, valor_com_desconto, valor_parcela))')
                .eq('referencia_mes_ano', mesRef)
                .neq('status', 'cancelado');
            
            if (error) throw error;
            
            const pags = rawPags?.filter((p: any) => {
                if (p.aluno && p.aluno.status === 'arquivado') return false;
                return true;
            });

            let faturamentoPrevisto = 0;
            let receitaMes = 0;
            let pendentes = 0;

            if (pags) {
                for (const p of pags) {
                    let valorEfetivo = Number(p.valor);
                    
                    if (applyDiscount && p.tipo_receita === 'mensalidade' && p.status !== 'pago') {
                        const alunoObj: any = Array.isArray(p.aluno) ? p.aluno[0] : p.aluno;
                        const matriculas = alunoObj?.matriculas;
                        let matriculaAlvo: any = null;
                        
                        if (Array.isArray(matriculas) && matriculas.length > 0) {
                            if (p.matricula_id) {
                                matriculaAlvo = matriculas.find((m: any) => String(m.id) === String(p.matricula_id));
                            }
                            if (!matriculaAlvo) {
                                matriculaAlvo = matriculas.find((m: any) => m.status === 'ativa');
                            }
                        }
                        
                        if (matriculaAlvo && matriculaAlvo.valor_com_desconto !== null && matriculaAlvo.valor_com_desconto !== undefined && Number(matriculaAlvo.valor_com_desconto) > 0) {
                            valorEfetivo = Number(matriculaAlvo.valor_com_desconto);
                        }
                    }

                    const recebidoParcela = Number(p.valor_pago != null ? p.valor_pago : p.valor);
                    if (p.status === 'pago') {
                        receitaMes += recebidoParcela;
                    } else {
                        pendentes += valorEfetivo;
                    }
                    faturamentoPrevisto += (p.status === 'pago' ? recebidoParcela : valorEfetivo);
                }
            }
            const [m, y] = mesRef.split('/');
            const startDate = `${y}-${m}-01`;
            const endDate = new Date(Number(y), Number(m), 0).toISOString().split('T')[0];

            // Buscar despesas do mês
            const { data: despesasMes, error: errDespesas } = await supabase.from('despesas')
                .select('valor, status, categoria')
                .gte('data_vencimento', startDate)
                .lte('data_vencimento', endDate);

            if (errDespesas) throw errDespesas;

            let despesasPagas = 0;
            let despesasPendentes = 0;
            
            let custoEstrutural = 0;
            let custoVariavel = 0;
            let custoFiscal = 0;
            let custoOutros = 0;

            if (despesasMes) {
                for (const d of despesasMes) {
                    const val = Number(d.valor);
                    if (d.status === 'pago') despesasPagas += val;
                    else despesasPendentes += val;
                    
                    if (d.categoria === 'fixa') custoEstrutural += val;
                    else if (d.categoria === 'parcelada' || d.categoria === 'divida') custoVariavel += val;
                    else if (d.categoria === 'imposto') custoFiscal += val;
                    else custoOutros += val;
                }
            }

            // Calcular salários previstos (aulas do mês anterior)
            let mNumPrev = parseInt(m, 10) - 1;
            let yNumPrev = parseInt(y, 10);
            if (mNumPrev === 0) {
                mNumPrev = 12;
                yNumPrev -= 1;
            }
            const prevMStr = mNumPrev.toString().padStart(2, '0');
            const prevStartDate = `${yNumPrev}-${prevMStr}-01`;
            const prevEndDate = new Date(yNumPrev, mNumPrev, 0).toISOString().split('T')[0];

            // Tela Financeiro: salário REAL = só aulas já dadas (realizadas/falta do aluno) do mês anterior.
            // A previsão com aulas ainda agendadas fica apenas nos Relatórios.
            const folhaPrev = await calcularFolhaProfessores(`${prevMStr}/${yNumPrev}`);
            const salariosPrevistos = folhaPrev.total_realizado;
            const custoOperacional = salariosPrevistos;

            const lucroMes = receitaMes - despesasPagas; // Lucro Real (recebido - pago sem salários automáticos, a não ser que lance manual)
            const margemLucro = receitaMes > 0 ? (lucroMes / receitaMes) * 100 : 0;
            
            const despesasTotalPrevistas = despesasPagas + despesasPendentes + salariosPrevistos;
            const lucroPrevisto = faturamentoPrevisto - despesasTotalPrevistas;
            const margemLucroPrevisto = faturamentoPrevisto > 0 ? (lucroPrevisto / faturamentoPrevisto) * 100 : 0;
            
            res.json({ 
                faturamentoPrevisto, 
                receitaMes, 
                pendentes, 
                total: receitaMes,
                despesasPagas,
                despesasPendentes,
                despesasTotalPrevistas,
                salariosPrevistos,
                lucroMes,
                margemLucro,
                lucroPrevisto,
                margemLucroPrevisto,
                custos: {
                    estrutural: custoEstrutural,
                    variavel: custoVariavel,
                    fiscal: custoFiscal,
                    operacional: custoOperacional,
                    outros: custoOutros
                }
            });
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.get('/api/financeiro/remuneracao', requireAdmin, async (req, res) => {
        try {
            const { mes_ano } = req.query;
            if (!mes_ano || typeof mes_ano !== 'string') return res.status(400).json({ error: 'mes_ano inválido' });
            
            let [mStr, yStr] = mes_ano.split('/');
            let mNum = parseInt(mStr, 10);
            let yNum = parseInt(yStr, 10);
            
            // Retroceder 1 mês (pagamento de Agosto referente a Julho)
            mNum -= 1;
            if (mNum === 0) {
                mNum = 12;
                yNum -= 1;
            }
            
            const prevMStr = mNum.toString().padStart(2, '0');
            const startDate = `${yNum}-${prevMStr}-01`;
            const endDate = new Date(yNum, mNum, 0).toISOString().split('T')[0];

            const folha = await calcularFolhaProfessores(`${prevMStr}/${yNum}`);
            const finalRemun = folha.professores
                // Financeiro mostra o real: só professores com aulas já dadas
                .filter((p: any) => p.aulas_realizadas > 0)
                .map((p: any) => ({
                    professor_id: p.professor_id,
                    professor_nome: p.professor_nome,
                    total_aulas: p.aulas_realizadas,
                    valor_estimado: p.valor_realizado,
                    valor_aula: p.valor_aula,
                    alunos_ativos: p.alunos_no_mes,
                    aulas_previstas: p.aulas_previstas,
                    reposicoes: p.reposicoes_realizadas + p.reposicoes_previstas,
                    valor_previsto_total: p.valor_previsto_total
                }));

            res.json(finalRemun);
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    // Pacotes
    app.get('/api/pacotes', async (req, res) => {
        const { data } = await supabase.from('pacotes').select('*').order('id');
        res.json(data || []);
    });

    app.post('/api/pacotes', requireAdmin, async (req, res) => {
        try {
            const { data, error } = await supabase.from('pacotes').insert([req.body]).select().single();
            if (error) throw error;
            res.json(data);
        } catch (error) { res.status(500).json({ error: 'Erro ao salvar pacote' }); }
    });

    // Agenda / Aulas (Unificando regulares e experimentais)
    app.get('/api/agenda', async (req: any, res) => {
        try {
            const start = (req.query.start || req.query.date) as string;
            const end = (req.query.end || req.query.date) as string;
            const statusFilter = req.query.status as string;
            
            console.log(`[AGENDA] Request params: start=${start}, end=${end}, status=${statusFilter}`);

            let filterProfId = req.query.professor_id as string;
            let filterAlunoId: string | null = null;

            if (req.user && req.user.role === 'professor') {
                const { data: prof } = await supabase.from('professores').select('id, nome').ilike('email', escapeLike(req.user.email)).single();
                if (prof) {
                    const nome = prof.nome.toLowerCase();
                    // Se não for o Aquilles (dono), restringe a visão. Se for ele, permite ver tudo/outros.
                    if (!nome.includes('aquilles') && !nome.includes('áquilles')) {
                        filterProfId = String(prof.id);
                    }
                } else {
                    filterProfId = '-1'; // Forçar retorno vazio caso professor não seja encontrado
                }
            } else if (req.user && req.user.role === 'aluno') {
                // ALUNO: filtrar somente as aulas do aluno logado
                const { data: aluno } = await supabase.from('alunos').select('id').ilike('email', escapeLike(req.user.email)).maybeSingle();
                if (aluno) {
                    filterAlunoId = String(aluno.id);
                    console.log(`[AGENDA] Aluno logado: id=${filterAlunoId}, email=${req.user.email}`);
                } else {
                    console.warn(`[AGENDA] Aluno não encontrado para email: ${req.user.email}`);
                    filterAlunoId = '-1'; // Forçar retorno vazio
                }
            }

            // Busca paginada: o Supabase devolve no máximo 1000 linhas por consulta
            // (antes as aulas mais recentes eram cortadas da agenda do professor)
            const montarConsulta = () => {
                let query = supabase.from('aulas')
                    .select('id, data, horario, status, professor_id, aluno_id, conteudo, tarefa_casa, midias, xp_ganho, data_original, motivo_cancelamento, tipo, alunos(nome, status, telefone, responsavel_telefone), professores(nome), cursos(nome), matriculas(status)')
                    .order('data', { ascending: true })
                    .order('id', { ascending: true });
                if (start) query = query.gte('data', start);
                if (end) query = query.lte('data', end);
                if (filterProfId) query = query.eq('professor_id', filterProfId);
                if (filterAlunoId) query = query.eq('aluno_id', filterAlunoId);
                if (statusFilter) {
                    if (statusFilter === 'reposicao') {
                        query = query.or('status.eq.reposicao,status.eq.a_repor');
                    } else {
                        query = query.eq('status', statusFilter);
                    }
                }
                return query;
            };

            let rawAulas: any[] = [];
            try {
                rawAulas = await fetchAllRows(montarConsulta);
            } catch (errA) {
                console.error('[AGENDA] Erro aulas:', errA);
            }
            
            const aulas = (rawAulas || []).filter((a: any) => {
                const aluno = Array.isArray(a.alunos) ? a.alunos[0] : a.alunos;
                const matricula = Array.isArray(a.matriculas) ? a.matriculas[0] : a.matriculas;
                const isAlunoArquivado = aluno && aluno.status === 'arquivado';
                const isMatriculaArquivada = matricula && matricula.status === 'arquivada';
                return !isAlunoArquivado && !isMatriculaArquivada;
            });
            console.log(`[AGENDA] Retornadas ${aulas.length} aulas regulares`);

            let expQuery = supabase.from('aulas_experimentais')
                .select('id, data, horario, status, professor_id, lead_id, leads(id, nome, telefone), professores(nome)');
                
            if (start) expQuery = expQuery.gte('data', start);
            if (end) expQuery = expQuery.lte('data', end);
            if (filterProfId) expQuery = expQuery.eq('professor_id', filterProfId);
            if (statusFilter) expQuery = expQuery.eq('status', statusFilter);

            // Aluno não vê aulas experimentais (contêm nome e telefone de leads)
            const { data: experimentais, error: errE } = filterAlunoId
                ? { data: [], error: null }
                : await expQuery;
            if (errE) console.error('[AGENDA] Erro aulas experimentais:', errE);

            const combined = [
                ...(aulas?.map((a: any) => {
                    const aluno = Array.isArray(a.alunos) ? a.alunos[0] : a.alunos;
                    const professor = Array.isArray(a.professores) ? a.professores[0] : a.professores;
                    const curso = Array.isArray(a.cursos) ? a.cursos[0] : a.cursos;
                    return {
                        ...a,
                        id: `reg-${a.id}`,
                        originalId: a.id,
                        type: 'regular',
                        nome: aluno?.nome,
                        aluno_nome: aluno?.nome,
                        professor_nome: professor?.nome,
                        curso_nome: curso?.nome || 'Curso',
                        telefone: aluno?.telefone || aluno?.responsavel_telefone || null
                    };
                }) || []),
                ...(experimentais?.map((e: any) => {
                    const lead = Array.isArray(e.leads) ? e.leads[0] : e.leads;
                    const professor = Array.isArray(e.professores) ? e.professores[0] : e.professores;
                    // Usa nome do lead, ou telefone como fallback
                    const nomeExibido = lead?.nome || lead?.telefone || null;
                    return {
                        ...e,
                        id: `exp-${e.id}`,
                        originalId: e.id,
                        type: 'experimental',
                        nome: nomeExibido,
                        aluno_nome: nomeExibido,
                        professor_nome: professor?.nome,
                        curso_nome: 'Experimental',
                        telefone: lead?.telefone
                    };
                }) || [])
            ];

            res.json(combined);
        } catch (error: any) {
            console.error('[AGENDA] Erro fatal:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Módulo de Confirmação de Aula: Solicitar confirmação (Admin/Professor -> Aluno)
    app.post('/api/agenda/:id/solicitar-confirmacao', requireStaff, async (req: any, res) => {
        try {
            const { id } = req.params;
            const originalId = id.replace('reg-', '').replace('exp-', ''); 

            const { data: aula, error: errA } = await supabase.from('aulas').select('*, alunos(nome, id)').eq('id', originalId).single();
            if (errA || !aula) throw new Error('Aula não encontrada');

            // Atualizar status
            await supabase.from('aulas').update({ status: 'aguardando_confirmacao' }).eq('id', originalId);

            // Enviar Push para o Aluno
            if (aula.alunos?.id) {
                const { data: alunoData } = await supabase.from('alunos').select('email').eq('id', aula.alunos.id).single();
                const titulo = 'Confirme sua próxima aula! 🎸';
                const msg = `Olá ${aula.alunos.nome.split(' ')[0]}, precisamos confirmar sua presença na próxima aula. Toque aqui e acesse sua Área do Aluno!`;
                await sendPushNotification(titulo, msg, String(aula.alunos.id), alunoData?.email);
            }

            res.json({ success: true, status: 'aguardando_confirmacao' });
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    // Módulo de Confirmação de Aula: Aluno confirmando
    app.post('/api/agenda/:id/confirmar', async (req: any, res) => {
        try {
            const { id } = req.params;
            const originalId = id.replace('reg-', '').replace('exp-', '');

            const { data: aula, error: errA } = await supabase.from('aulas').select('*, alunos(nome), professores(id, nome)').eq('id', originalId).maybeSingle();
            if (errA || !aula) return res.status(404).json({ error: 'Aula não encontrada' });

            if (!isStaff(req)) {
                const meuAlunoId = await getAlunoIdDoUsuario(req);
                if (!meuAlunoId || Number(aula.aluno_id) !== Number(meuAlunoId)) {
                    return res.status(403).json({ error: 'Você só pode confirmar as suas próprias aulas.' });
                }
            }

            // Trava de 24 horas para confirmação pelo aluno (horário de Cuiabá, UTC-4)
            if (req.user?.role === 'aluno' && aula.data) {
                const horaAula = String(aula.horario || '00:00:00').substring(0, 8).padEnd(8, ':00');
                const aulaTime = new Date(`${aula.data}T${horaAula}-04:00`).getTime();
                const diffHoras = (aulaTime - Date.now()) / (1000 * 3600);
                if (diffHoras > 24) {
                    return res.status(400).json({ error: 'A confirmação só pode ser realizada com até 24 horas de antecedência.' });
                }
            }

            // Atualizar status
            await supabase.from('aulas').update({ status: 'confirmada' }).eq('id', originalId);

            // Enviar Notificação Interna e Push para o Professor
            if (aula.professores?.id) {
                const { data: profData } = await supabase.from('professores').select('email').eq('id', aula.professores.id).single();
                const titulo = 'Aula Confirmada! ✅';
                const msg = `O aluno ${aula.alunos?.nome || 'seu aluno'} confirmou a presença na próxima aula!`;
                
                await supabase.from('notificacoes').insert([{
                    titulo, mensagem: msg, tipo: 'agenda', aluno_id: aula.aluno_id
                }]);

                await sendPushNotification(titulo, msg, String(aula.professores.id), profData?.email);
            }

            // Aviso imediato para a direção
            if (req.user?.role === 'aluno' && (await getAutomacoes()).AUTO_AVISO_CONFIRMACAO) {
                const quando = `${String(aula.data || '').split('-').reverse().join('/')} às ${String(aula.horario || '').substring(0, 5)}`;
                await enviarEmailAviso(
                    `✅ Aula confirmada: ${aula.alunos?.nome || 'aluno'}`,
                    `${aula.alunos?.nome || 'O aluno'} confirmou presença na aula de ${quando} com ${aula.professores?.nome || 'o professor'}.`,
                    EMAIL_AVISOS_DONO
                );
            }

            res.json({ success: true, status: 'confirmada' });
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });


    app.patch('/api/aulas/:id/reschedule', requireStaff, async (req, res) => {
        try {
            const { data, horario } = req.body;
            const { error } = await supabase.from('aulas').update({ data, horario }).eq('id', req.params.id);
            if (error) throw error;
            res.json({ success: true });
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.post('/api/agenda/:id/pagar', requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            let type = 'reg';
            let originalId = id;
            if (id.includes('-')) {
                [type, originalId] = id.split('-');
            }
            if (type !== 'reg') return res.status(400).json({ error: 'Pagamento disponível apenas para aulas regulares' });

            const { data: aula } = await supabase.from('aulas').select('aluno_id, valor_aula').eq('id', originalId).single();
            if (!aula) throw new Error('Aula não encontrada');

            const hoje = getDateBR();
            const ref = toRefMesAno(parseDateOnly(hoje));

            // Dá baixa na mensalidade em aberto do mês atual (não cria cobrança nova)
            const { data: abertas } = await supabase.from('pagamentos')
                .select('id, status')
                .eq('aluno_id', aula.aluno_id)
                .eq('referencia_mes_ano', ref)
                .eq('tipo_receita', 'mensalidade')
                .neq('status', 'pago')
                .order('data_vencimento', { ascending: true })
                .limit(1);

            const existing = abertas?.[0];
            if (!existing) {
                return res.status(404).json({ error: `Nenhuma mensalidade em aberto em ${ref} para este aluno.` });
            }
            const { error: errPag } = await supabase.from('pagamentos').update({ status: 'pago', data_pagamento: hoje }).eq('id', existing.id);
            if (errPag) throw errPag;
            res.json({ success: true, pagamento_id: existing.id });
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.patch('/api/agenda/:id', requireStaff, async (req, res) => {
        const { id } = req.params;
        const { data, horario, sala_id, professor_id } = req.body;
        let type = 'reg';
        let originalId = id;
        if (id.includes('-')) {
            [type, originalId] = id.split('-');
        }
        const table = type === 'reg' ? 'aulas' : 'aulas_experimentais';
        
        const updatePayload: any = { data, horario };
        if (sala_id !== undefined) updatePayload.sala_id = sala_id;
        if (professor_id !== undefined) updatePayload.professor_id = professor_id;

        const { data: updated, error } = await supabase.from(table).update(updatePayload).eq('id', originalId).select().single();
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        res.json(updated);
    });

    
    app.patch('/api/agenda/:id/cancelar', requireStaff, async (req, res) => {
        try {
            const { id } = req.params;
            const { reposicao } = req.body;
            let type = 'reg';
            let originalId = id;
            if (id.includes('-')) {
                [type, originalId] = id.split('-');
            }
            if (type !== 'reg') {
                await supabase.from('aulas_experimentais').delete().eq('id', originalId);
                return res.json({ success: true, action: 'deleted' });
            }

            if (reposicao) {
                const hojeStr = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');

                await supabase.from('aulas').update({ 
                    status: 'reposicao', 
                    data: '2099-12-31', 
                    horario: '00:00',
                    data_original: hojeStr 
                }).eq('id', originalId);
            } else {
                await supabase.from('aulas').update({ status: 'falta' }).eq('id', originalId);
            }
            res.json({ success: true, action: 'updated' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.delete('/api/agenda/:id', requireAdmin, async (req, res) => {
        const { id } = req.params;
        let type = 'reg';
        let originalId = id;
        if (id.includes('-')) {
            [type, originalId] = id.split('-');
        }
        const table = type === 'reg' ? 'aulas' : 'aulas_experimentais';
        await supabase.from(table).delete().eq('id', originalId);
        res.json({ success: true });
    });


    app.post('/api/alunos/:id/gerar-financeiro', requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            // Buscar matrícula ativa
            const { data: matricula } = await supabase.from('matriculas').select('*').eq('aluno_id', id).eq('status', 'ativa').order('id', { ascending: false }).limit(1).maybeSingle();
            if (!matricula) throw new Error('Nenhuma matrícula ativa encontrada');

            // Evita gerar as parcelas duas vezes para a mesma matrícula
            const { count: jaGeradas } = await supabase.from('pagamentos')
                .select('id', { count: 'exact', head: true })
                .eq('matricula_id', matricula.id)
                .eq('tipo_receita', 'mensalidade');
            if ((jaGeradas || 0) > 0) {
                return res.status(400).json({ error: 'As mensalidades desta matrícula já foram geradas.' });
            }

            const pagamentosToInsert = gerarVencimentos(
                matricula.data_primeira_parcela || matricula.data_inicio || getDateBR(),
                matricula.total_parcelas || 1,
                matricula.dia_vencimento || 10
            ).map((venc) => ({
                aluno_id: id,
                matricula_id: matricula.id,
                valor: matricula.valor_parcela,
                data_vencimento: toDateStr(venc),
                status: 'pendente',
                tipo_receita: 'mensalidade',
                referencia_mes_ano: toRefMesAno(venc)
            }));
            const { error: errIns } = await supabase.from('pagamentos').insert(pagamentosToInsert);
            if (errIns) throw errIns;
            res.json({ success: true });
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.post('/api/financeiro/importar-pdf', requireAdmin, upload.single('pdf'), async (req: any, res) => {
        if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

        try {
            const pdfBuffer = fs.readFileSync(req.file.path);
            // Import dinâmico para não crashar no startup da Vercel
            const pdfParseModule: any = await import('pdf-parse');
            const pdfParse = pdfParseModule.default || pdfParseModule;
            const pdfData = await pdfParse(pdfBuffer);
            const text = pdfData.text;
            
            const lines = text.split('\n');
            const { data: allAlunos } = await supabase.from('alunos').select('id, nome');
            const stats = { atualizados: 0, criados: 0, extras: 0, erros: 0 };
            
            let currentStudentId: string | null = null;

            // Normaliza nomes (sem acento, espaços simples, maiúsculas) para comparar com segurança
            const normNome = (n: string) => String(n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
            const alunosNorm = (allAlunos || [])
                .map((a: any) => ({ ...a, nomeNorm: normNome(a.nome) }))
                .filter((a: any) => a.nomeNorm.length > 3);

            // Nome completo contido no texto; se houver mais de um candidato, fica o nome mais longo (mais específico)
            const encontrarAlunoNoTexto = (texto: string) => {
                const alvo = normNome(texto);
                const candidatos = alunosNorm.filter((a: any) => alvo.includes(a.nomeNorm));
                if (candidatos.length === 0) return null;
                candidatos.sort((a: any, b: any) => b.nomeNorm.length - a.nomeNorm.length);
                if (candidatos.length > 1 && candidatos[0].nomeNorm.length === candidatos[1].nomeNorm.length) return null;
                return candidatos[0];
            };

            // Pré-detectar se é uma Ficha Financeira (nome no rodapé ou cabeçalho)
            const fichaMatch = text.match(/Ficha Financeira - ([^-]+)/i);
            if (fichaMatch) {
                const potentialName = normNome(fichaMatch[1]);
                console.log('Buscando aluno para:', potentialName);
                const exato = alunosNorm.filter((a: any) => a.nomeNorm === potentialName);
                const student = exato.length === 1 ? exato[0] : encontrarAlunoNoTexto(potentialName);
                if (student) {
                    currentStudentId = student.id;
                    console.log('Aluno identificado:', student.nome);
                } else {
                    console.warn('Nenhum aluno identificado com segurança para:', potentialName);
                }
            }
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                // Em relatórios gerais, o nome aparece na linha acima ou na própria linha
                const studentInLine = encontrarAlunoNoTexto(line);
                if (studentInLine && (!fichaMatch || line.includes('Contas a Receber'))) {
                    currentStudentId = studentInLine.id;
                }

                if (currentStudentId) {
                    const parcelaMatch = line.match(/Parcela (\d{2}\/\d{4})/);
                    const isExtra = line.toUpperCase().includes('ENSAIO') || line.toUpperCase().includes('MULTA') || line.toUpperCase().includes('ALUGUEL');
                    
                    const allValues = line.match(/(\d{1,3}([.,]\d{3})*[.,]\d{2})/g);
                    let valor = 0;
                    if (allValues) {
                        let raw = allValues[allValues.length - 1];
                        if (raw.includes(',') && raw.includes('.')) {
                            raw = raw.replace(/\./g, '').replace(',', '.');
                        } else if (raw.includes(',')) {
                            raw = raw.replace(',', '.');
                        }
                        valor = parseFloat(raw);
                    }
                    
                    const dates = line.match(/\d{2}\/\d{2}\/\d{4}/g);
                    const isPaid = (dates && dates.length >= 2) || /Pix|Dinheiro|Cart|Transf/i.test(line) || (lines[i+1] && /Pago em/i.test(lines[i+1]));

                    if (parcelaMatch) {
                        const ref = parcelaMatch[1];
                        
                        // Nunca volta uma parcela já paga para pendente
                        const { data: existentes } = await supabase
                            .from('pagamentos')
                            .select('id, status')
                            .eq('aluno_id', currentStudentId)
                            .eq('referencia_mes_ano', ref)
                            .eq('tipo_receita', 'mensalidade');
                        const idsAtualizaveis = (existentes || [])
                            .filter((p: any) => isPaid || p.status !== 'pago')
                            .map((p: any) => p.id);

                        let updated: any[] | null = [];
                        let updateError: any = null;
                        if (idsAtualizaveis.length > 0) {
                            const r = await supabase
                                .from('pagamentos')
                                .update({ 
                                    status: isPaid ? 'pago' : 'pendente',
                                    data_pagamento: isPaid ? (dates && dates[1] ? dates[1].split('/').reverse().join('-') : getDateBR()) : null,
                                    valor: valor > 0 ? valor : undefined
                                })
                                .in('id', idsAtualizaveis)
                                .select();
                            updated = r.data;
                            updateError = r.error;
                        }

                        if ((existentes || []).length > 0 && idsAtualizaveis.length === 0) {
                            // Parcela já estava paga no sistema: mantém como está
                            stats.atualizados++;
                            continue;
                        }

                        if (!updateError && updated && updated.length > 0) {
                            stats.atualizados++;
                        } else if ((existentes || []).length > 0) {
                            // A parcela existe mas a atualização falhou: não cria duplicada
                            stats.erros++;
                        } else {
                            // Se não existe, vamos criar (histórico missing)
                            const { error: insertError } = await supabase.from('pagamentos').insert([{
                                aluno_id: currentStudentId,
                                valor: valor,
                                status: isPaid ? 'pago' : 'pendente',
                                referencia_mes_ano: ref,
                                data_vencimento: dates && dates[0] ? dates[0].split('/').reverse().join('-') : getDateBR(),
                                data_pagamento: isPaid ? (dates && dates[1] ? dates[1].split('/').reverse().join('-') : getDateBR()) : null,
                                tipo_receita: 'mensalidade',
                                descricao: `Importado via PDF: Parcela ${ref}`
                            }]);
                            if (!insertError) stats.criados++;
                            else stats.erros++;
                        }
                    } else if (isExtra && valor > 0) {
                        const descricao = line.trim().substring(0, 100);
                        await supabase.from('pagamentos').insert([{
                            aluno_id: currentStudentId,
                            valor: valor,
                            status: isPaid ? 'pago' : 'pendente',
                            data_vencimento: dates && dates[0] ? dates[0].split('/').reverse().join('-') : getDateBR(),
                            data_pagamento: isPaid ? (dates && dates[1] ? dates[1].split('/').reverse().join('-') : getDateBR()) : null,
                            referencia_mes_ano: `${(new Date().getMonth() + 1).toString().padStart(2, '0')}/${new Date().getFullYear()}`,
                            tipo_receita: line.toUpperCase().includes('ENSAIO') ? 'ensaio' : 'outros',
                            descricao: descricao
                        }]);
                        stats.extras++;
                    }
                }
            }
            
            try { fs.unlinkSync(req.file.path); } catch(e) {}
            
            res.json({ 
                success: true, 
                message: `Processamento concluído. Atualizados: ${stats.atualizados}, Criados: ${stats.criados}, Extras: ${stats.extras}.`,
                stats 
            });
        } catch (error: any) {
            console.error('ERRO IMPORTAR PDF:', error);
            res.status(500).json({ error: error.message || 'Erro interno ao processar o arquivo' });
        }
    });

    // --- GAMIFICACAO ---
    app.get('/api/gamificacao/conquistas', async (req, res) => {
        try {
            const { temporada_id } = req.query;
            let query = supabase.from('gamificacao_conquistas').select('*').order('id', { ascending: false });
            
            if (temporada_id) {
                if (temporada_id !== 'all' && temporada_id !== 'todas') {
                    const tempIdNum = Number(temporada_id);
                    if (!isNaN(tempIdNum)) {
                        query = query.or(`temporada_id.eq.${tempIdNum},temporada_id.is.null`);
                    }
                }
            } else {
                // Se nao informado, busca a temporada ativa ou padrao 2
                const { data: tempAtiva } = await supabase.from('temporadas').select('id').eq('status', 'ativa').maybeSingle();
                const activeId = tempAtiva?.id || 2;
                query = query.or(`temporada_id.eq.${activeId},temporada_id.is.null`);
            }

            const { data, error } = await query;
            if (error) console.error('Erro ao buscar conquistas:', error);
            res.json(data || []);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // Endpoint de Reset de Ranking (zerar XP e Coins ao virar a temporada)
    app.post('/api/gamificacao/reset-ranking', requireAdmin, async (req, res) => {
        try {
            // Zera o xp e os acorde_coins dos alunos ativos para iniciar a nova temporada
            const { data, error } = await supabase
                .from('alunos')
                .update({ xp: 0, acorde_coins: 0 })
                .neq('status', 'arquivado')
                .select('id, nome');

            if (error) throw error;

            // Remove skins T2 compradas prematuramente se existirem em inventarios
            const { data: alunosSkins } = await supabase
                .from('alunos')
                .select('id, avatar_config, avatar_inventory')
                .neq('status', 'arquivado');

            if (alunosSkins) {
                for (const al of alunosSkins) {
                    let updated = false;
                    let newInv = al.avatar_inventory;
                    let newCfg = al.avatar_config;

                    if (Array.isArray(newInv)) {
                        const filtered = newInv.filter((item: string) => !item.startsWith('skin_t2_'));
                        if (filtered.length !== newInv.length) {
                            newInv = filtered;
                            updated = true;
                        }
                    }

                    if (newCfg && newCfg.skinId && newCfg.skinId.startsWith('skin_t2_')) {
                        newCfg = { ...newCfg, skinId: 'skin_m_1' };
                        updated = true;
                    }

                    if (updated) {
                        await supabase.from('alunos').update({ avatar_inventory: newInv, avatar_config: newCfg }).eq('id', al.id);
                    }
                }
            }

            res.json({
                success: true,
                message: `Reset de Temporada executado com sucesso! Alunos resetados: ${data?.length || 0}`,
                alunosResetados: data
            });
        } catch (error: any) {
            console.error('Erro no reset de ranking:', error);
            res.status(500).json({ error: error.message || 'Erro ao zerar ranking' });
        }
    });

    app.post('/api/gamificacao/conquistas', requireStaff, async (req, res) => {
        try {
            const { nome, descricao, pontos, regra_automatica, icone_url, classe } = req.body;
            const payload: any = { nome, descricao };
            if (pontos !== undefined) payload.pontos = Number(pontos);
            if (regra_automatica !== undefined) payload.regra_automatica = regra_automatica || null;
            if (icone_url !== undefined) payload.icone_url = icone_url || null;
            if (classe !== undefined) payload.classe = classe || 'Especial';

            const { data, error } = await supabase
                .from('gamificacao_conquistas')
                .insert([payload])
                .select()
                .single();
            if (error) throw error;
            res.json(data);
        } catch (error: any) { res.status(500).json({ error: error.message || 'Erro ao salvar conquista' }); }
    });

    app.put('/api/gamificacao/conquistas/:id', requireStaff, async (req, res) => {
        try {
            const { nome, descricao, pontos, regra_automatica, icone_url, classe } = req.body;
            const payload: any = {};
            if (nome !== undefined) payload.nome = nome;
            if (descricao !== undefined) payload.descricao = descricao;
            if (pontos !== undefined) payload.pontos = Number(pontos);
            if (regra_automatica !== undefined) payload.regra_automatica = regra_automatica || null;
            if (icone_url !== undefined) payload.icone_url = icone_url || null;
            if (classe !== undefined) payload.classe = classe || 'Especial';

            const { data, error } = await supabase
                .from('gamificacao_conquistas')
                .update(payload)
                .eq('id', req.params.id)
                .select()
                .single();
            if (error) throw error;
            res.json(data);
        } catch (error: any) { res.status(500).json({ error: error.message || 'Erro ao atualizar conquista' }); }
    });

    app.delete('/api/gamificacao/conquistas/:id', requireStaff, async (req, res) => {
        try {
            const { error } = await supabase.from('gamificacao_conquistas').delete().eq('id', req.params.id);
            if (error) throw error;
            res.json({ success: true });
        } catch (error: any) { res.status(500).json({ error: error.message || 'Erro ao excluir conquista' }); }
    });

    app.post('/api/gamificacao/upload', requireStaff, upload.single('icon'), async (req: any, res) => {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }
        try {
            const ext = path.extname(req.file.originalname) || '.png';
            const filename = `conquistas/${Date.now()}_${req.file.filename}${ext}`;
            const fileBuffer = fs.readFileSync(req.file.path);
            const mimeType = req.file.mimetype || 'image/png';

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(filename, fileBuffer, { contentType: mimeType, upsert: true });

            try { fs.unlinkSync(req.file.path); } catch {}

            if (uploadError) {
                console.error('[CONQUISTA_UPLOAD] Supabase Storage falhou:', uploadError.message);
                return res.status(500).json({ error: 'Falha ao salvar miniatura no Storage: ' + uploadError.message });
            }

            const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filename);
            const url = publicUrlData?.publicUrl || '';
            res.json({ url });
        } catch (error: any) {
            console.error('Erro no upload de conquista:', error);
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/gamificacao/ranking', async (req, res) => {
        try {
            await syncProvaTrophiesAndScores(supabase);

            const ranking = await calcularRanking();

            res.json(ranking);
        } catch (error) { console.error('Erro no ranking:', error); res.status(500).json({ error: 'Erro ao gerar ranking' }); }
    });

    // Troféus não cumulativos (classe diferente de "Especial") só podem ser concedidos uma vez por aluno
    const podeReceberTrofeu = async (alunoId: number, conquistaId: number) => {
        const { data: conq } = await supabase.from('gamificacao_conquistas').select('classe').eq('id', conquistaId).maybeSingle();
        if (conq?.classe === 'Especial') return true;
        const { data: ja } = await supabase.from('gamificacao_progresso').select('id').eq('aluno_id', alunoId).eq('conquista_id', conquistaId).limit(1);
        return !ja || ja.length === 0;
    };

    app.post('/api/gamificacao/atribuir', requireStaff, async (req, res) => {
        try {
            const { aluno_id, conquista_id } = req.body;
            if (!aluno_id || !conquista_id) {
                return res.status(400).json({ error: 'Parâmetros aluno_id e conquista_id são obrigatórios.' });
            }
            const alunoIdNum = Number(aluno_id);
            const conquistaIdNum = Number(conquista_id);
            if (isNaN(alunoIdNum) || isNaN(conquistaIdNum)) {
                return res.status(400).json({ error: 'Parâmetros de ID devem ser numéricos.' });
            }

            if (!(await podeReceberTrofeu(alunoIdNum, conquistaIdNum))) {
                return res.status(400).json({ error: 'O aluno já possui este troféu.' });
            }

            const { error } = await supabase
                .from('gamificacao_progresso')
                .insert([{ aluno_id: alunoIdNum, conquista_id: conquistaIdNum }]);
            
            if (error) throw error;

            const { data: alunoInfo } = await supabase.from('alunos').select('nome').eq('id', alunoIdNum).single();
            const { data: conquistaInfo } = await supabase.from('gamificacao_conquistas').select('nome').eq('id', conquistaIdNum).single();
            if (alunoInfo && conquistaInfo) {
                await addToFeed(alunoIdNum, 'conquista', `${alunoInfo.nome} ganhou a medalha ${conquistaInfo.nome}! 🏆`, '🏅');
            }

            res.json({ success: true });
        } catch (error: any) {
            console.error('[GAMIFICACAO_ATRIBUIR] Erro ao atribuir conquista:', error);
            res.status(500).json({ error: error.message || 'Erro ao atribuir conquista' });
        }
    });

    // ==========================================
    // NOTIFICAÇÕES PUSH ONESIGNAL & LOCAL FEED
    // ==========================================
    const escapeHtml = (t: any) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c]);

    // Credenciais do Gmail: system_config tem prioridade sobre as variáveis de ambiente
    async function getSmtpConfig() {
        const { data: smtpConfig } = await supabase.from('system_config').select('key_name, key_value').in('key_name', ['SMTP_EMAIL', 'SMTP_PASSWORD', 'SMTP_PASS']);
        const pick = (k: string) => smtpConfig?.find((c: any) => c.key_name === k)?.key_value;
        return {
            smtpEmail: pick('SMTP_EMAIL') || process.env.SMTP_EMAIL,
            smtpPass: pick('SMTP_PASSWORD') || pick('SMTP_PASS') || process.env.SMTP_PASSWORD || process.env.SMTP_PASS
        };
    }

    // Envio de e-mail em HTML pelo Gmail da escola
    async function enviarEmailHtml(titulo: string, html: string, emailTo: string) {
        try {
            const { smtpEmail, smtpPass } = await getSmtpConfig();
            if (!smtpEmail || !smtpPass) {
                console.warn('[EMAIL] SMTP_EMAIL/SMTP_PASSWORD não configurados. E-mail ignorado.');
                return false;
            }
            const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: smtpEmail, pass: smtpPass } });
            // Na Vercel a função é congelada após a resposta: o envio precisa terminar antes dela
            await Promise.race([
                transporter.sendMail({ from: `"Studio Acorde" <${smtpEmail}>`, to: emailTo, subject: titulo, html }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP Timeout (10s)')), 10000))
            ]);
            console.log('[EMAIL] Enviado para', emailTo, '-', titulo);
            return true;
        } catch (e: any) {
            console.error('[EMAIL] Falha ao enviar e-mail:', e?.message || e);
            return false;
        }
    }

    // E-mail de aviso simples (independente do OneSignal: se o push falhar, o e-mail ainda sai)
    async function enviarEmailAviso(titulo: string, mensagem: string, emailTo: string) {
        const emailHtml = `
            <div style="font-family: sans-serif; padding: 20px; background: #fff8f6; border: 4px solid #261812; color: #261812;">
                <h2 style="color: #ff6b00; text-transform: uppercase;">STUDIO ACORDE - AVISO DA ESCOLA</h2>
                <p style="font-size: 16px; font-weight: bold;">${escapeHtml(titulo)}</p>
                <p>${escapeHtml(mensagem)}</p>
                <br/>
                <a href="https://acordecrm.vercel.app" style="display: inline-block; padding: 15px 30px; background: #ff6b00; color: #fff; text-decoration: none; font-weight: bold; border-radius: 4px; border: 2px solid #261812; box-shadow: 4px 4px 0 #261812;">ACESSAR MEU APLICATIVO</a>
                <br/><br/>
                <hr style="border: 1px dashed #7b5647;" />
                <small style="color: #8e7164;">Esta é uma mensagem automática do Studio Acorde CRM. Não responda este e-mail.</small>
            </div>
        `;
        return enviarEmailHtml(titulo, emailHtml, emailTo);
    }

    // O app registra no OneSignal o id da tabela usuarios; aqui convertemos o e-mail do destinatário nesse id.
    // Sem destinatário identificado, o push não é enviado (nunca vira envio para todos).
    async function sendPushNotification(titulo: string, mensagem: string, _targetId?: string | string[], emailTo?: string, enviarEmail: boolean = true) {
        if (!emailTo) {
            console.warn('[PUSH_NOTIFICATION] Destinatário sem e-mail; aviso não enviado.');
            return;
        }

        const envioEmail = enviarEmail ? enviarEmailAviso(titulo, mensagem, emailTo) : Promise.resolve(false);

        const envioPush = (async () => {
            try {
                const { data: usuarioDestino } = await supabase.from('usuarios').select('id').ilike('email', escapeLike(emailTo)).limit(1).maybeSingle();
                if (!usuarioDestino?.id) {
                    console.warn('[PUSH_NOTIFICATION] Nenhum usuário com o e-mail', emailTo, '- push não enviado.');
                    return;
                }
                const { data: config } = await supabase.from('system_config').select('key_value').eq('key_name', 'ONESIGNAL_REST_API_KEY').maybeSingle();
                const appKey = config?.key_value || process.env.ONESIGNAL_REST_API_KEY;
                const appId = process.env.VITE_ONESIGNAL_APP_ID || ONESIGNAL_APP_ID;
                if (!appKey) {
                    console.error('[OneSignal] ONESIGNAL_REST_API_KEY não configurada. Push ignorado.');
                    return;
                }
                const response = await fetch('https://api.onesignal.com/notifications?c=push', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json; charset=utf-8',
                        // Chaves novas (os_v2_...) usam "Key"; chaves antigas usam "Basic"
                        'Authorization': String(appKey).startsWith('os_v2_') ? `Key ${appKey}` : `Basic ${appKey}`
                    },
                    body: JSON.stringify({
                        app_id: appId,
                        target_channel: 'push',
                        include_aliases: { external_id: [String(usuarioDestino.id)] },
                        headings: { en: titulo, pt: titulo },
                        contents: { en: mensagem, pt: mensagem },
                        url: 'https://acordecrm.vercel.app'
                    })
                });
                const data: any = await response.json().catch(() => ({}));
                if (!response.ok || data?.errors) {
                    console.error('[PUSH_NOTIFICATION] OneSignal recusou:', response.status, JSON.stringify(data));
                } else {
                    console.log('[PUSH_NOTIFICATION] Push enviado para usuário', usuarioDestino.id, 'id:', data?.id);
                }
            } catch (err) {
                console.error('[PUSH_NOTIFICATION] Erro ao enviar push OneSignal:', err);
            }
        })();

        await Promise.all([envioEmail, envioPush]);
    }

    // Notificação interna + push/e-mail para o professor da matrícula mais recente do aluno
    async function notificarProfessorDoAluno(alunoId: number, titulo: string, mensagem: string) {
        try {
            const { data: mat } = await supabase.from('matriculas')
                .select('professor_id, professores(id, email)')
                .eq('aluno_id', alunoId)
                .order('id', { ascending: false })
                .limit(1)
                .maybeSingle();
            const prof: any = Array.isArray(mat?.professores) ? mat?.professores[0] : mat?.professores;
            if (prof?.email) await sendPushNotification(titulo, mensagem, String(prof.id), prof.email, false);
        } catch (e) {
            console.error('[NOTIFICAR_PROFESSOR] Erro:', e);
        }
    }

    // 1. Obter treinos do aluno autenticado
    app.get('/api/treinos/me', async (req, res) => {
        try {
            const email = (req as any).user?.email;
            if (!email) return res.status(401).json({ error: 'Não autorizado.' });
            const cleanEmail = email.toLowerCase().trim();

            const { data: aluno } = await supabase.from('alunos').select('id').ilike('email', escapeLike(cleanEmail)).maybeSingle();
            if (!aluno) return res.status(404).json({ error: 'Estudante não encontrado.' });

            const { data: treinos, error } = await supabase
                .from('aluno_treinos')
                .select('*')
                .eq('aluno_id', aluno.id)
                .order('data', { ascending: false });

            if (error) throw error;
            res.json(treinos || []);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // 2. Registrar check-in de treino diário
    app.post('/api/treinos', async (req, res) => {
        try {
            const email = (req as any).user?.email;
            if (!email) return res.status(401).json({ error: 'Não autorizado.' });
            const cleanEmail = email.toLowerCase().trim();

            const { data: aluno } = await supabase.from('alunos').select('id, nome, xp, acorde_coins').ilike('email', escapeLike(cleanEmail)).maybeSingle();
            if (!aluno) return res.status(404).json({ error: 'Estudante não encontrado.' });

            const todayStr = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');

            const { data: existing } = await supabase
                .from('aluno_treinos')
                .select('id')
                .eq('aluno_id', aluno.id)
                .eq('data', todayStr)
                .maybeSingle();

            if (existing) {
                return res.status(400).json({ error: 'Você já marcou seu check-in de treino hoje!' });
            }

            const { data: treino, error } = await supabase
                .from('aluno_treinos')
                .insert([{ aluno_id: aluno.id, data: todayStr }])
                .select()
                .single();

            if (error) throw error;

            // Criar notificação para o professor
            try {
                const titulo = 'Treino registrado! 🔥';
                const mensagem = `${aluno.nome} marcou seu check-in de treino diário!`;
                await supabase.from('notificacoes').insert([{ titulo, mensagem, tipo: 'treino', aluno_id: aluno.id }]);
                await notificarProfessorDoAluno(aluno.id, titulo, mensagem);
            } catch (e) {
                console.error('[TREINO] Erro notificação:', e);
            }

            // Update XP and Coins (50.000 pts para check-in sem vídeo)
            let novoXp = 0;
            let novasMoedas = 0;
            try {
                novoXp = (Number(aluno.xp) || 0) + 50000;
                novasMoedas = (Number(aluno.acorde_coins) || 0) + 50000;
                await supabase.from('alunos').update({ xp: novoXp, acorde_coins: novasMoedas }).eq('id', aluno.id);
                await recordPontos(aluno.id, 'checkin', 'Check-in Diário', 50000);
                await addToFeed(aluno.id, 'treino', `${aluno.nome} marcou o treino do dia (+50.000 pts)! 💪`, '🎸');
            } catch (e) {
                console.error('[TREINO] Erro ao pontuar:', e);
            }

            res.json({ success: true, data: treino, novoXp, novasMoedas });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // =====================================================================
    // GOOGLE DRIVE (conta Google da escola, 15GB grátis)
    // Vídeos de treino vão SOMENTE para o Drive (nunca para o Supabase).
    // A escola conecta a própria conta uma vez (OAuth); o refresh token fica
    // salvo criptografado em system_config.
    // Pastas: "Acorde CRM - Treinos" (vídeos, limpeza automática) e
    //         "Acorde CRM - Materiais" (áudios/imagens das fichas, permanente).
    // =====================================================================
    const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
    const VIDEO_MAX_BYTES = 150 * 1024 * 1024;
    const DRIVE_CFG = {
        clientId: 'GOOGLE_OAUTH_CLIENT_ID',
        clientSecret: 'GOOGLE_OAUTH_CLIENT_SECRET',
        refreshToken: 'GOOGLE_OAUTH_REFRESH_TOKEN',
        conta: 'GOOGLE_DRIVE_CONTA',
        pastaTreinos: 'GOOGLE_DRIVE_PASTA_TREINOS',
        pastaMateriais: 'GOOGLE_DRIVE_PASTA_MATERIAIS',
        retencaoDias: 'VIDEO_RETENCAO_DIAS',
        alertaPct: 'DRIVE_ALERTA_PCT'
    };

    // Criptografia simples (AES-256-GCM) dos segredos do Drive guardados no banco
    const cryptoKey = crypto.createHash('sha256').update(`drive:${JWT_SECRET}`).digest();
    const encryptSecret = (plain: string) => {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', cryptoKey, iv);
        const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
        return `enc:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${enc.toString('base64')}`;
    };
    const decryptSecret = (value: string | null | undefined) => {
        if (!value) return null;
        if (!value.startsWith('enc:')) return value;
        try {
            const [, ivB, tagB, dataB] = value.split(':');
            const decipher = crypto.createDecipheriv('aes-256-gcm', cryptoKey, Buffer.from(ivB, 'base64'));
            decipher.setAuthTag(Buffer.from(tagB, 'base64'));
            return Buffer.concat([decipher.update(Buffer.from(dataB, 'base64')), decipher.final()]).toString('utf8');
        } catch {
            return null;
        }
    };

    const getConfigValues = async (keys: string[]) => {
        const { data } = await supabase.from('system_config').select('key_name, key_value').in('key_name', keys);
        const out: Record<string, string | null> = {};
        keys.forEach((k) => { out[k] = data?.find((d: any) => d.key_name === k)?.key_value ?? null; });
        return out;
    };
    // Grava uma configuração e CONFERE o resultado (antes os erros do banco eram ignorados)
    const setConfigValue = async (key: string, value: string | null) => {
        const { data: existentes, error: errSel } = await supabase.from('system_config').select('id').eq('key_name', key).order('id', { ascending: true });
        if (errSel) throw new Error(`Falha ao ler ${key}: ${errSel.message}`);
        if (value === null) {
            if (existentes && existentes.length) {
                const { error } = await supabase.from('system_config').delete().eq('key_name', key);
                if (error) throw new Error(`Falha ao remover ${key}: ${error.message}`);
            }
            return;
        }
        if (existentes && existentes.length) {
            const { error } = await supabase.from('system_config').update({ key_value: value, updated_at: new Date().toISOString() }).eq('key_name', key);
            if (error) throw new Error(`Falha ao atualizar ${key}: ${error.message}`);
        } else {
            const { error } = await supabase.from('system_config').insert([{ key_name: key, key_value: value }]);
            if (error) throw new Error(`Falha ao gravar ${key}: ${error.message}`);
        }
        const { data: conferido } = await supabase.from('system_config').select('key_value').eq('key_name', key).limit(1).maybeSingle();
        if (!conferido || conferido.key_value !== value) throw new Error(`O banco não confirmou a gravação de ${key}.`);
    };

    const getDriveSettings = async () => {
        const cfg = await getConfigValues(Object.values(DRIVE_CFG));
        return {
            clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || cfg[DRIVE_CFG.clientId],
            clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || decryptSecret(cfg[DRIVE_CFG.clientSecret]),
            refreshToken: decryptSecret(cfg[DRIVE_CFG.refreshToken]),
            conta: cfg[DRIVE_CFG.conta],
            pastaTreinos: cfg[DRIVE_CFG.pastaTreinos],
            pastaMateriais: cfg[DRIVE_CFG.pastaMateriais],
            retencaoDias: Math.max(1, Number(cfg[DRIVE_CFG.retencaoDias]) || 7),
            alertaPct: Math.min(99, Math.max(10, Number(cfg[DRIVE_CFG.alertaPct]) || 80))
        };
    };

    // Token de acesso de curta duração (cache por instância)
    let driveTokenCache: { token: string; exp: number } | null = null;
    const getDriveAccessToken = async (): Promise<string | null> => {
        if (driveTokenCache && driveTokenCache.exp > Date.now() + 60000) return driveTokenCache.token;
        const s = await getDriveSettings();
        if (!s.clientId || !s.clientSecret || !s.refreshToken) return null;
        const r = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: s.clientId,
                client_secret: s.clientSecret,
                refresh_token: s.refreshToken,
                grant_type: 'refresh_token'
            })
        });
        const data: any = await r.json().catch(() => ({}));
        if (!r.ok || !data.access_token) {
            console.error('[DRIVE] Falha ao renovar token:', data?.error || r.status);
            return null;
        }
        driveTokenCache = { token: data.access_token, exp: Date.now() + (Number(data.expires_in) || 3000) * 1000 };
        return data.access_token;
    };

    const driveFetch = async (url: string, init: any = {}) => {
        const token = await getDriveAccessToken();
        if (!token) throw new Error('Google Drive não conectado.');
        return fetch(url, { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` } });
    };

    // Garante a pasta no Drive (criada pelo próprio app, acessível com o escopo drive.file)
    const garantirPastaDrive = async (tipo: 'treinos' | 'materiais') => {
        const s = await getDriveSettings();
        const atual = tipo === 'treinos' ? s.pastaTreinos : s.pastaMateriais;
        if (atual) {
            const check = await driveFetch(`https://www.googleapis.com/drive/v3/files/${atual}?fields=id,trashed`);
            const j: any = await check.json().catch(() => ({}));
            if (check.ok && !j.trashed) return atual;
        }
        const nome = tipo === 'treinos' ? 'Acorde CRM - Treinos (apagados automaticamente)' : 'Acorde CRM - Materiais das fichas';
        const r = await driveFetch('https://www.googleapis.com/drive/v3/files?fields=id', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: nome, mimeType: 'application/vnd.google-apps.folder' })
        });
        const j: any = await r.json();
        if (!r.ok || !j.id) throw new Error('Não foi possível criar a pasta no Google Drive.');
        await setConfigValue(tipo === 'treinos' ? DRIVE_CFG.pastaTreinos : DRIVE_CFG.pastaMateriais, j.id);
        return j.id as string;
    };

    const tornarLeituraPublica = async (fileId: string) => {
        await driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'reader', type: 'anyone' })
        });
    };

    const driveIdDaUrl = (url: string | null | undefined) => {
        if (!url || !url.includes('drive.google.com')) return null;
        const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        return m?.[1] || null;
    };

    // Upload feito pelo servidor (arquivos pequenos: áudios/imagens das fichas)
    async function uploadToGoogleDrive(filename: string, mimeType: string, fileBuffer: Buffer, tipo: 'treinos' | 'materiais' = 'materiais'): Promise<{ url: string, fileId: string, webViewLink: string } | null> {
        try {
            if (!(await getDriveAccessToken())) return null;
            const folderId = await garantirPastaDrive(tipo);
            const boundary = `acorde${Date.now()}`;
            const meta = JSON.stringify({ name: filename, parents: [folderId] });
            const body = Buffer.concat([
                Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
                fileBuffer,
                Buffer.from(`\r\n--${boundary}--`)
            ]);
            const r = await driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
                method: 'POST',
                headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
                body
            });
            const j: any = await r.json();
            if (!r.ok || !j.id) {
                console.warn('[DRIVE] Upload falhou:', JSON.stringify(j).slice(0, 300));
                return null;
            }
            await tornarLeituraPublica(j.id);
            return {
                url: `https://drive.google.com/uc?export=download&id=${j.id}`,
                fileId: j.id,
                webViewLink: `https://drive.google.com/file/d/${j.id}/view`
            };
        } catch (e: any) {
            console.error('[GDRIVE_HELPER] Erro ao enviar para Google Drive:', e.message);
            return null;
        }
    }

    // Uso do Drive: cota da conta + tamanho da pasta de treinos
    const getDriveUso = async () => {
        const s = await getDriveSettings();
        const conectado = Boolean(s.clientId && s.clientSecret && s.refreshToken && await getDriveAccessToken());
        if (!conectado) return { conectado: false, retencaoDias: s.retencaoDias, alertaPct: s.alertaPct, temCredenciaisApp: Boolean(s.clientId && s.clientSecret) };

        const aboutR = await driveFetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota,user(emailAddress)');
        const about: any = await aboutR.json().catch(() => ({}));
        const limite = Number(about?.storageQuota?.limit) || 0;
        const usado = Number(about?.storageQuota?.usage) || 0;

        let videos = 0, bytesVideos = 0, maisAntigo: string | null = null;
        if (s.pastaTreinos) {
            let pageToken = '';
            do {
                const q = encodeURIComponent(`'${s.pastaTreinos}' in parents and trashed = false`);
                const r = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=nextPageToken,files(id,size,createdTime)&pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ''}`);
                const j: any = await r.json().catch(() => ({}));
                (j.files || []).forEach((f: any) => {
                    videos++;
                    bytesVideos += Number(f.size) || 0;
                    if (!maisAntigo || f.createdTime < maisAntigo) maisAntigo = f.createdTime;
                });
                pageToken = j.nextPageToken || '';
            } while (pageToken);
        }

        const pct = limite > 0 ? Math.round((usado / limite) * 1000) / 10 : 0;
        return {
            conectado: true,
            conta: about?.user?.emailAddress || s.conta,
            limiteBytes: limite,
            usadoBytes: usado,
            usoPct: pct,
            videos,
            bytesVideos,
            videoMaisAntigo: maisAntigo,
            retencaoDias: s.retencaoDias,
            alertaPct: s.alertaPct,
            alerta: limite > 0 && pct >= s.alertaPct
        };
    };

    // Apaga do Drive os vídeos da pasta de treinos mais antigos que N dias
    // (vão para a lixeira do Drive, de onde ainda podem ser recuperados por 30 dias)
    const limparVideosDrive = async (dias: number) => {
        const s = await getDriveSettings();
        if (!s.pastaTreinos || !(await getDriveAccessToken())) return { apagados: 0, bytes: 0 };
        const limite = new Date(Date.now() - dias * 86400000).toISOString();
        let apagados = 0, bytes = 0, pageToken = '';
        const idsApagados: string[] = [];
        do {
            const q = encodeURIComponent(`'${s.pastaTreinos}' in parents and trashed = false and createdTime < '${limite}'`);
            const r = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=nextPageToken,files(id,size)&pageSize=200${pageToken ? `&pageToken=${pageToken}` : ''}`);
            const j: any = await r.json().catch(() => ({}));
            for (const f of (j.files || [])) {
                const del = await driveFetch(`https://www.googleapis.com/drive/v3/files/${f.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ trashed: true })
                });
                if (del.ok) {
                    apagados++;
                    bytes += Number(f.size) || 0;
                    idsApagados.push(f.id);
                }
            }
            pageToken = j.nextPageToken || '';
        } while (pageToken);

        // Remove o link dos treinos cujos vídeos foram apagados (o check-in continua registrado)
        if (idsApagados.length > 0) {
            const { data: treinosComVideo } = await supabase.from('aluno_treinos').select('id, video_url').not('video_url', 'is', null);
            const alvos = (treinosComVideo || []).filter((t: any) => idsApagados.includes(driveIdDaUrl(t.video_url) || ''));
            for (const t of alvos) {
                await supabase.from('aluno_treinos').update({ video_url: null, video_created_at: null }).eq('id', t.id);
            }
        }
        return { apagados, bytes };
    };

    // --- Conexão da conta Google (OAuth) ---
    const getRedirectUri = (req: any) => {
        const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
        const host = (req.headers['x-forwarded-host'] as string) || req.headers.host;
        return `${proto.split(',')[0]}://${host}/api/drive/oauth/callback`;
    };

    app.get('/api/drive/status', requireAdmin, async (req, res) => {
        res.set('Cache-Control', 'no-store');
        try {
            const uso = await getDriveUso();
            res.json({ ...uso, redirectUri: getRedirectUri(req) });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/drive/config', requireAdmin, async (req, res) => {
        try {
            const corpo = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
            console.log('[DRIVE_CONFIG] campos recebidos:', Object.keys(corpo).join(', ') || '(nenhum)');
            const { clientId, clientSecret, retencaoDias, alertaPct } = corpo;
            if (clientId !== undefined && String(clientId).trim() && !String(clientId).trim().endsWith('.apps.googleusercontent.com')) {
                return res.status(400).json({ error: 'O Client ID deve terminar com ".apps.googleusercontent.com".' });
            }
            if (clientSecret && !String(clientSecret).trim().startsWith('GOCSPX-')) {
                return res.status(400).json({ error: 'O Client Secret deve começar com "GOCSPX-".' });
            }
            if (clientId !== undefined) await setConfigValue(DRIVE_CFG.clientId, String(clientId).trim() || null);
            if (clientSecret) await setConfigValue(DRIVE_CFG.clientSecret, encryptSecret(String(clientSecret).trim()));
            if (retencaoDias !== undefined) {
                const d = Math.floor(Number(retencaoDias));
                if (!d || d < 1 || d > 365) return res.status(400).json({ error: 'Dias de retenção devem estar entre 1 e 365.' });
                await setConfigValue(DRIVE_CFG.retencaoDias, String(d));
            }
            if (alertaPct !== undefined) {
                const p = Math.floor(Number(alertaPct));
                if (!p || p < 10 || p > 99) return res.status(400).json({ error: 'O alerta deve ficar entre 10% e 99%.' });
                await setConfigValue(DRIVE_CFG.alertaPct, String(p));
            }
            driveTokenCache = null;
            const s = await getDriveSettings();
            res.json({ success: true, temClientId: Boolean(s.clientId), temClientSecret: Boolean(s.clientSecret), temCredenciaisApp: Boolean(s.clientId && s.clientSecret) });
        } catch (error: any) {
            console.error('[DRIVE_CONFIG] Erro:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/drive/oauth/start', requireAdmin, async (req: any, res) => {
        try {
            const s = await getDriveSettings();
            if (!s.clientId || !s.clientSecret) return res.status(400).json({ error: 'Cadastre primeiro o Client ID e o Client Secret do Google.' });
            const state = jwt.sign({ purpose: 'drive_oauth', uid: req.user.id }, JWT_SECRET, { expiresIn: '15m' });
            const params = new URLSearchParams({
                client_id: s.clientId,
                redirect_uri: getRedirectUri(req),
                response_type: 'code',
                scope: DRIVE_SCOPE,
                access_type: 'offline',
                prompt: 'consent',
                include_granted_scopes: 'true',
                state
            });
            res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // Rota pública: o Google redireciona para cá após o consentimento (validada pelo "state" assinado)
    app.get('/api/drive/oauth/callback', async (req: any, res) => {
        const voltar = (status: string) => res.redirect(`/?drive=${encodeURIComponent(status)}`);
        try {
            const { code, state, error } = req.query;
            if (error) return voltar('cancelado');
            try {
                const decoded: any = jwt.verify(String(state || ''), JWT_SECRET);
                if (decoded?.purpose !== 'drive_oauth') return voltar('erro');
            } catch {
                return voltar('expirado');
            }
            const s = await getDriveSettings();
            const r = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    code: String(code || ''),
                    client_id: String(s.clientId || ''),
                    client_secret: String(s.clientSecret || ''),
                    redirect_uri: getRedirectUri(req),
                    grant_type: 'authorization_code'
                })
            });
            const data: any = await r.json().catch(() => ({}));
            if (!r.ok || !data.refresh_token) {
                console.error('[DRIVE_OAUTH] Troca de código falhou:', data?.error || r.status);
                return voltar('erro');
            }
            await setConfigValue(DRIVE_CFG.refreshToken, encryptSecret(data.refresh_token));
            driveTokenCache = { token: data.access_token, exp: Date.now() + (Number(data.expires_in) || 3000) * 1000 };

            const about = await driveFetch('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)');
            const aj: any = await about.json().catch(() => ({}));
            if (aj?.user?.emailAddress) await setConfigValue(DRIVE_CFG.conta, aj.user.emailAddress);

            await garantirPastaDrive('treinos');
            await garantirPastaDrive('materiais');
            voltar('ok');
        } catch (e: any) {
            console.error('[DRIVE_OAUTH] Erro:', e.message);
            voltar('erro');
        }
    });

    app.post('/api/drive/desconectar', requireAdmin, async (req, res) => {
        try {
            // Só remove a conexão; os arquivos já enviados continuam no Drive
            await setConfigValue(DRIVE_CFG.refreshToken, null);
            driveTokenCache = null;
            res.json({ success: true });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // Limpeza manual (botão no painel): apaga vídeos com mais de N dias
    app.post('/api/drive/limpar', requireAdmin, async (req, res) => {
        try {
            const dias = Math.floor(Number(req.body?.dias));
            if (!dias || dias < 1) return res.status(400).json({ error: 'Informe quantos dias manter (mínimo 1).' });
            const r = await limparVideosDrive(dias);
            res.json({ success: true, ...r });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // --- Vídeos de treino ---
    // 1) O app do aluno pede uma sessão de upload: o vídeo vai do celular direto para o Drive
    app.post('/api/treinos/drive-upload-session', async (req: any, res) => {
        try {
            const alunoId = await getAlunoIdDoUsuario(req);
            if (!alunoId) return res.status(404).json({ error: 'Estudante não encontrado.' });
            const tamanho = Number(req.body?.tamanho) || 0;
            const mimeType = String(req.body?.mimeType || 'video/mp4');
            if (!mimeType.startsWith('video/')) return res.status(400).json({ error: 'Envie um arquivo de vídeo.' });
            if (tamanho > VIDEO_MAX_BYTES) return res.status(400).json({ error: 'O vídeo passou de 150MB. Grave um vídeo mais curto.' });
            if (!(await getDriveAccessToken())) {
                return res.status(503).json({ error: 'O envio de vídeos está temporariamente indisponível. Avise a escola.' });
            }
            const folderId = await garantirPastaDrive('treinos');
            const ext = mimeType.includes('webm') ? 'webm' : 'mp4';
            const r = await driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,size,mimeType,parents,createdTime', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                    'X-Upload-Content-Type': mimeType,
                    ...(tamanho ? { 'X-Upload-Content-Length': String(tamanho) } : {}),
                    // Necessário para o navegador conseguir enviar direto para a URL de upload
                    ...(req.headers.origin ? { Origin: String(req.headers.origin) } : {})
                },
                body: JSON.stringify({ name: `treino_${alunoId}_${getDateBR()}_${Date.now()}.${ext}`, parents: [folderId] })
            });
            if (!r.ok) {
                console.error('[TREINO_UPLOAD_SESSION] Falha:', r.status, (await r.text()).slice(0, 300));
                return res.status(502).json({ error: 'Não foi possível iniciar o envio para o Google Drive.' });
            }
            res.json({ uploadUrl: r.headers.get('Location') });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // 2) Depois do upload, o app registra o vídeo (ou envia o arquivo pequeno direto pelo servidor)
    app.post('/api/treinos/upload-video', upload.single('video'), async (req: any, res) => {
        const limparTemp = () => { if (req.file?.path) { try { fs.unlinkSync(req.file.path); } catch {} } };
        try {
            const email = (req.user?.email || '').toLowerCase().trim();
            if (!email) { limparTemp(); return res.status(401).json({ error: 'Não autorizado.' }); }
            if (!req.file && !req.body.drive_file_id) {
                return res.status(400).json({ error: 'Nenhum vídeo enviado.' });
            }

            const { data: aluno } = await supabase.from('alunos').select('id, nome, xp, acorde_coins').ilike('email', escapeLike(email)).maybeSingle();
            if (!aluno) { limparTemp(); return res.status(404).json({ error: 'Estudante não encontrado para este email.' }); }

            if (!(await getDriveAccessToken())) {
                limparTemp();
                return res.status(503).json({ error: 'O envio de vídeos está temporariamente indisponível. Avise a escola.' });
            }
            const pastaTreinos = await garantirPastaDrive('treinos');

            let fileId: string | null = null;
            if (req.body.drive_file_id) {
                // Confere se o arquivo existe na pasta de treinos e é um vídeo
                fileId = String(req.body.drive_file_id).replace(/[^a-zA-Z0-9_-]/g, '');
                const info = await driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,parents,mimeType,size,trashed`);
                const j: any = await info.json().catch(() => ({}));
                if (!info.ok || j.trashed || !(j.parents || []).includes(pastaTreinos) || !String(j.mimeType || '').startsWith('video/')) {
                    return res.status(400).json({ error: 'Vídeo não encontrado no armazenamento da escola.' });
                }
                if (Number(j.size) > VIDEO_MAX_BYTES) {
                    await driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) });
                    return res.status(400).json({ error: 'O vídeo passou de 150MB.' });
                }
                await tornarLeituraPublica(fileId);
            } else {
                // Envio pequeno pelo servidor (a Vercel aceita até ~4,5MB por requisição)
                let mimeType = req.file.mimetype || 'video/mp4';
                if (!mimeType.startsWith('video/')) mimeType = 'video/mp4';
                const ext = mimeType.includes('webm') ? '.webm' : '.mp4';
                const buffer = fs.readFileSync(req.file.path);
                limparTemp();
                const up = await uploadToGoogleDrive(`treino_${aluno.id}_${getDateBR()}_${Date.now()}${ext}`, mimeType, buffer, 'treinos');
                if (!up) return res.status(502).json({ error: 'Falha ao salvar o vídeo no Google Drive.' });
                fileId = up.fileId;
            }

            const url = `https://drive.google.com/file/d/${fileId}/view`;
            const todayStr = getDateBR();

            let { data: treino } = await supabase
                .from('aluno_treinos')
                .select('*')
                .eq('aluno_id', aluno.id)
                .eq('data', todayStr)
                .maybeSingle();

            const jaTinhaTreino = Boolean(treino);
            const jaTinhaVideo = Boolean(treino?.video_url);

            if (!treino) {
                const { data: novoTreino, error: createError } = await supabase
                    .from('aluno_treinos')
                    .insert([{ aluno_id: aluno.id, data: todayStr }])
                    .select()
                    .single();
                if (createError) throw createError;
                treino = novoTreino;
            }

            const { data: updatedTreino, error: updateError } = await supabase
                .from('aluno_treinos')
                .update({ video_url: url, video_created_at: new Date().toISOString() })
                .eq('id', treino.id)
                .select()
                .single();
            if (updateError) throw updateError;

            // Pontos do vídeo só depois de salvo (se ainda não tinha vídeo hoje)
            if (!jaTinhaVideo) {
                try {
                    const pontosAdicionais = jaTinhaTreino ? 50000 : 100000;
                    const novoXp = (Number(aluno.xp) || 0) + pontosAdicionais;
                    const novasMoedas = (Number(aluno.acorde_coins) || 0) + pontosAdicionais;
                    await supabase.from('alunos').update({ xp: novoXp, acorde_coins: novasMoedas }).eq('id', aluno.id);
                    await recordPontos(aluno.id, 'treino_video', 'Vídeo de Treino', pontosAdicionais);
                    await addToFeed(aluno.id, 'treino', `${aluno.nome} enviou um vídeo de treino (+${pontosAdicionais.toLocaleString('pt-BR')} pts)! 📹`, '📹');
                } catch (e) {
                    console.error('[TREINO_VIDEO] Erro ao pontuar:', e);
                }
            }

            try {
                const titulo = 'Vídeo de treino enviado! 📹';
                const mensagem = `${aluno.nome} gravou um vídeo estudando hoje!`;
                await supabase.from('notificacoes').insert([{ titulo, mensagem, tipo: 'treino', aluno_id: aluno.id }]);
                await notificarProfessorDoAluno(aluno.id, titulo, mensagem);
            } catch (e) {
                console.error('[TREINO_VIDEO] Erro ao notificar professor:', e);
            }

            res.json({ success: true, url, data: updatedTreino });
        } catch (error: any) {
            limparTemp();
            console.error('[TREINO_VIDEO_UPLOAD] Erro geral:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // 4. Treinos de todos os alunos (Professor), com a data em que cada vídeo expira
    app.get('/api/treinos/prof', requireStaff, async (req, res) => {
        try {
            const { data: treinos, error } = await supabase
                .from('aluno_treinos')
                .select('*, alunos(id, nome, foto_url)')
                .order('id', { ascending: false })
                .limit(100);
            if (error) throw error;

            const { retencaoDias } = await getDriveSettings();
            const agora = Date.now();
            res.json((treinos || []).map((t: any) => {
                const expiraEm = t.video_created_at ? new Date(new Date(t.video_created_at).getTime() + retencaoDias * 86400000).toISOString() : null;
                const expirado = !expiraEm || new Date(expiraEm).getTime() <= agora;
                return { ...t, video_expira_em: expiraEm, video_url: expirado ? null : t.video_url, retencao_dias: retencaoDias };
            }));
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // Cron da Vercel: só aceita chamadas com o CRON_SECRET (a Vercel envia no header Authorization)
    const cronAutorizado = (req: any) => {
        const cronSecret = process.env.CRON_SECRET;
        if (cronSecret) return req.headers['authorization'] === `Bearer ${cronSecret}`;
        return String(req.headers['user-agent'] || '').includes('vercel-cron');
    };

    // Rotina diária (07h de Cuiabá): limpeza de vídeos + e-mails automáticos
    app.get('/api/cron/cleanup-videos', async (req, res) => {
        if (!cronAutorizado(req)) return res.status(401).json({ error: 'Não autorizado' });
        const hoje = getDateBR();
        const resultado: Record<string, any> = {};
        const etapa = async (nome: string, fn: () => Promise<any>) => {
            try { resultado[nome] = await fn(); } catch (e: any) { resultado[nome] = { erro: e.message }; console.error(`[CRON] ${nome}:`, e); }
        };

        // 1) Vídeos: apaga do Drive os que passaram do prazo de retenção
        await etapa('videos_drive', async () => {
            const { retencaoDias } = await getDriveSettings();
            return limparVideosDrive(retencaoDias);
        });

        // 2) Legado: vídeos antigos que ainda estejam no Supabase Storage
        await etapa('videos_supabase_legado', async () => {
            const { data: files } = await supabase.storage.from('uploads').list('treinos', { limit: 1000 });
            const antigos = (files || [])
                .filter((f: any) => f.name !== '.emptyFolderPlaceholder' && (Date.now() - new Date(f.created_at).getTime()) > 24 * 60 * 60 * 1000)
                .map((f: any) => `treinos/${f.name}`);
            if (antigos.length) await supabase.storage.from('uploads').remove(antigos);
            const { data: treinosSupa } = await supabase.from('aluno_treinos').select('id, video_url').like('video_url', '%/storage/v1/object/public/uploads/treinos/%');
            for (const t of (treinosSupa || [])) {
                const caminho = String(t.video_url).split('/uploads/')[1];
                if (antigos.includes(caminho)) await supabase.from('aluno_treinos').update({ video_url: null, video_created_at: null }).eq('id', t.id);
            }
            return { apagados: antigos.length };
        });

        // 3) E-mails: no máximo uma vez por dia
        const { AUTO_ULTIMO_ENVIO_DIARIO: ultimo } = await getConfigValues(['AUTO_ULTIMO_ENVIO_DIARIO']);
        if (ultimo === hoje) {
            resultado.emails = 'já enviados hoje';
        } else {
            await setConfigValue('AUTO_ULTIMO_ENVIO_DIARIO', hoje);
            const auto = await getAutomacoes();
            if (auto.AUTO_EMAIL_DIARIO_DONO) await etapa('relatorio_diario_direcao', () => relatorioDiarioDono(hoje));
            if (auto.AUTO_LEMBRETE_PRESENCA) await etapa('lembrete_presenca', () => lembretePresencaProfessores(hoje));
            if (auto.AUTO_COBRANCA_ALUNOS) await etapa('cobranca_alunos', () => cobrancaAlunos(hoje));
            if (auto.AUTO_RESUMO_SEMANAL && parseDateOnly(hoje).getUTCDay() === 1) await etapa('resumo_semanal', () => resumoSemanalEscola(hoje));
            // Sensor do Drive: avisa a direção quando o espaço passa do limite configurado
            await etapa('sensor_drive', async () => {
                const uso: any = await getDriveUso();
                if (uso.conectado && uso.alerta) {
                    await enviarEmailAviso('⚠️ Google Drive quase cheio',
                        `O Google Drive da escola está com ${uso.usoPct}% de uso (${uso.videos} vídeos de treino). Abra o painel do Google Drive no sistema para apagar vídeos antigos ou reduzir o prazo de retenção.`,
                        EMAIL_AVISOS_DONO);
                    return { alerta_enviado: true, usoPct: uso.usoPct };
                }
                return { alerta_enviado: false, usoPct: uso.usoPct ?? null };
            });
        }

        console.log('[CRON] Rotina diária:', JSON.stringify(resultado));
        res.json({ success: true, resultado });
    });

    // Backup semanal (domingo) no Google Drive
    app.get('/api/cron/backup', async (req, res) => {
        if (!cronAutorizado(req)) return res.status(401).json({ error: 'Não autorizado' });
        try {
            if (!(await getAutomacoes()).AUTO_BACKUP_SEMANAL) return res.json({ success: true, pulado: 'backup desativado' });
            const r = await fazerBackupDrive();
            if (!r.ok) await enviarEmailAviso('⚠️ Backup semanal não realizado', `O backup automático do banco falhou: ${r.motivo}.`, EMAIL_AVISOS_DONO);
            res.json({ success: true, ...r });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    // 5. Histórico de Aulas Concluídas de um aluno
    app.get('/api/alunos/:id/historico-aulas', requireSelfOrStaff('id'), async (req, res) => {
        try {
            const { id } = req.params;
            const alunoIdNum = Number(id);
            if (isNaN(alunoIdNum)) return res.status(400).json({ error: 'ID inválido.' });

            const { data: aulas, error } = await supabase
                .from('aulas')
                .select('*, professores(nome), cursos(nome)')
                .eq('aluno_id', alunoIdNum)
                .eq('status', 'realizada')
                .order('data', { ascending: false })
                .order('horario', { ascending: false });

            if (error) throw error;
            res.json(aulas || []);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // 6. Confirmar presença na próxima aula (Aluno)
    app.post('/api/aulas/:id/confirmar-aluno', async (req, res) => {
        try {
            const { id } = req.params;
            const email = (req as any).user?.email;
            if (!email) return res.status(401).json({ error: 'Não autorizado.' });

            const { data: aluno } = await supabase.from('alunos').select('id, nome').ilike('email', escapeLike(email)).limit(1).maybeSingle();
            if (!aluno) return res.status(404).json({ error: 'Estudante não encontrado.' });

            const { data: aula, error } = await supabase
                .from('aulas')
                .update({ status: 'confirmada' })
                .eq('id', Number(id))
                .eq('aluno_id', aluno.id)
                .select()
                .single();

            if (error) throw error;

            // Criar notificação
            const dataFormatada = new Date(aula.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            const titulo = 'Presença confirmada! 🎸';
            const mensagem = `${aluno.nome} confirmou que virá na aula do dia ${dataFormatada} às ${aula.horario?.substring(0, 5)}!`;

            await supabase.from('notificacoes').insert([{ titulo, mensagem, tipo: 'confirmacao', aluno_id: aluno.id }]);

            await notificarProfessorDoAluno(aluno.id, titulo, mensagem);
            if ((await getAutomacoes()).AUTO_AVISO_CONFIRMACAO) {
                await enviarEmailAviso(`✅ Aula confirmada: ${aluno.nome}`, mensagem, EMAIL_AVISOS_DONO);
            }

            res.json({ success: true, data: aula });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // 7. Listar notificações do feed do professor
    app.get('/api/notificacoes', requireStaff, async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('notificacoes')
                .select('*, aluno:aluno_id(id, nome, foto_url)')
                .order('id', { ascending: false })
                .limit(50);

            if (error) throw error;
            res.json(data || []);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // 8. Marcar notificação como lida
    app.post('/api/notificacoes/:id/lida', requireStaff, async (req, res) => {
        try {
            const { id } = req.params;
            const { data, error } = await supabase
                .from('notificacoes')
                .update({ lida: true })
                .eq('id', Number(id))
                .select()
                .single();

            if (error) throw error;
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // 9. Limpar todas as notificações
    app.post('/api/notificacoes/limpar', requireStaff, async (req, res) => {
        try {
            const { error } = await supabase
                .from('notificacoes')
                .delete()
                .neq('id', 0);

            if (error) throw error;
            res.json({ success: true });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/gamificacao/remover', requireStaff, async (req, res) => {
        try {
            const { aluno_id, conquista_id } = req.body;
            if (!aluno_id || !conquista_id) {
                return res.status(400).json({ error: 'Parâmetros aluno_id e conquista_id são obrigatórios.' });
            }
            const alunoIdNum = Number(aluno_id);
            const conquistaIdNum = Number(conquista_id);
            if (isNaN(alunoIdNum) || isNaN(conquistaIdNum)) {
                return res.status(400).json({ error: 'Parâmetros de ID devem ser numéricos.' });
            }

            // Buscar o registro mais recente para deletar apenas uma instância
            const { data: registros, error: fetchError } = await supabase
                .from('gamificacao_progresso')
                .select('id')
                .eq('aluno_id', alunoIdNum)
                .eq('conquista_id', conquistaIdNum)
                .order('id', { ascending: false });

            if (fetchError) throw fetchError;

            if (!registros || registros.length === 0) {
                return res.status(404).json({ error: 'O aluno não possui esta conquista.' });
            }

            // Deleta o registro mais recente
            const registroParaDeletar = registros[0].id;

            const { error: deleteError } = await supabase
                .from('gamificacao_progresso')
                .delete()
                .eq('id', registroParaDeletar);

            if (deleteError) throw deleteError;

            res.json({ success: true });
        } catch (error: any) {
            console.error('[GAMIFICACAO_REMOVER] Erro ao remover conquista:', error);
            res.status(500).json({ error: error.message || 'Erro ao remover conquista' });
        }
    });

    app.get('/api/gamificacao/solicitacoes', requireStaff, async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('gamificacao_solicitacoes')
                .select('*, aluno:aluno_id(id, nome), conquista:conquista_id(id, nome, descricao, pontos, icone_url)')
                .order('id', { ascending: false });
            
            if (error) throw error;
            res.json(data || []);
        } catch (error: any) {
            console.error('[GAMIFICACAO_SOLICITACOES_GET] Erro:', error);
            res.status(500).json({ error: error.message || 'Erro ao carregar solicitações' });
        }
    });

    app.post('/api/gamificacao/solicitar', requireSelfOrStaff('aluno_id', 'body'), async (req, res) => {
        try {
            const { aluno_id, conquista_id } = req.body;
            if (!aluno_id || !conquista_id) {
                return res.status(400).json({ error: 'Parâmetros aluno_id e conquista_id são obrigatórios.' });
            }
            const alunoIdNum = Number(aluno_id);
            const conquistaIdNum = Number(conquista_id);
            if (isNaN(alunoIdNum) || isNaN(conquistaIdNum)) {
                return res.status(400).json({ error: 'Parâmetros de ID devem ser numéricos.' });
            }

            // 0. Buscar classe da conquista para checar se é cumulativa (Especial)
            const { data: conquista, error: errorConq } = await supabase
                .from('gamificacao_conquistas')
                .select('classe')
                .eq('id', conquistaIdNum)
                .single();
            
            if (errorConq) throw errorConq;
            const isEspecial = conquista?.classe === 'Especial';

            if (!isEspecial) {
                // 1. Verificar se o aluno já possui a conquista
                const { data: jaPossui, error: errorPossui } = await supabase
                    .from('gamificacao_progresso')
                    .select('id')
                    .eq('aluno_id', alunoIdNum)
                    .eq('conquista_id', conquistaIdNum);
                
                if (errorPossui) throw errorPossui;
                if (jaPossui && jaPossui.length > 0) {
                    return res.status(400).json({ error: 'Você já conquistou este troféu!' });
                }
            }

            // 2. Verificar se já existe solicitação pendente
            const { data: jaSolicitou, error: errorSolicitou } = await supabase
                .from('gamificacao_solicitacoes')
                .select('id')
                .eq('aluno_id', alunoIdNum)
                .eq('conquista_id', conquistaIdNum)
                .eq('status', 'pendente');
            
            if (errorSolicitou) throw errorSolicitou;
            if (jaSolicitou && jaSolicitou.length > 0) {
                return res.status(400).json({ error: 'Você já tem uma solicitação pendente para este troféu.' });
            }

            // 3. Criar solicitação
            const { data, error: errorInsert } = await supabase
                .from('gamificacao_solicitacoes')
                .insert([{ aluno_id: alunoIdNum, conquista_id: conquistaIdNum, status: 'pendente' }])
                .select()
                .single();
            
            if (errorInsert) throw errorInsert;
            res.json(data);
        } catch (error: any) {
            console.error('[GAMIFICACAO_SOLICITAR] Erro:', error);
            res.status(500).json({ error: error.message || 'Erro ao processar solicitação' });
        }
    });

    app.post('/api/gamificacao/solicitacoes/:id/revisar', requireStaff, async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body; // 'aprovada' | 'rejeitada'
            if (!status || (status !== 'aprovada' && status !== 'rejeitada')) {
                return res.status(400).json({ error: 'Status inválido. Deve ser aprovada ou rejeitada.' });
            }

            const solicitacaoId = Number(id);
            if (isNaN(solicitacaoId)) {
                return res.status(400).json({ error: 'ID da solicitação deve ser numérico.' });
            }

            // 1. Buscar a solicitação
            const { data: solicitacao, error: errorGet } = await supabase
                .from('gamificacao_solicitacoes')
                .select('*')
                .eq('id', solicitacaoId)
                .single();
            
            if (errorGet || !solicitacao) {
                return res.status(404).json({ error: 'Solicitação não encontrada.' });
            }

            // 2. Atualizar status da solicitação
            const { error: errorUpdate } = await supabase
                .from('gamificacao_solicitacoes')
                .update({ status })
                .eq('id', solicitacaoId);
            
            if (errorUpdate) throw errorUpdate;

            // 3. Se aprovada, creditar na tabela de progresso
            if (status === 'aprovada' && solicitacao.status !== 'aprovada' && await podeReceberTrofeu(solicitacao.aluno_id, solicitacao.conquista_id)) {
                const { error: errorProg } = await supabase
                    .from('gamificacao_progresso')
                    .insert([{ aluno_id: solicitacao.aluno_id, conquista_id: solicitacao.conquista_id }]);
                
                if (errorProg) throw errorProg;

                const { data: alunoInfo } = await supabase.from('alunos').select('nome').eq('id', solicitacao.aluno_id).single();
                const { data: conquistaInfo } = await supabase.from('gamificacao_conquistas').select('nome').eq('id', solicitacao.conquista_id).single();
                if (alunoInfo && conquistaInfo) {
                    await addToFeed(solicitacao.aluno_id, 'conquista', `${alunoInfo.nome} ganhou a medalha ${conquistaInfo.nome}! 🏆`, '🏅');
                }
            }

            res.json({ success: true });
        } catch (error: any) {
            console.error('[GAMIFICACAO_REVISAR] Erro:', error);
            res.status(500).json({ error: error.message || 'Erro ao revisar solicitação' });
        }
    });

    // --- GAMIFICACAO 2.0 ROUTES ---

    // 1. Feed
    app.get('/api/feed', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('feed_atividades')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);
            if (error && error.code !== '42P01') throw error;

            // Anexa o nome do aluno de cada atividade (várias mensagens não citam o nome)
            const ids = Array.from(new Set((data || []).map((f: any) => f.aluno_id).filter(Boolean)));
            const nomes: Record<number, string> = {};
            if (ids.length > 0) {
                const { data: alunosFeed } = await supabase.from('alunos').select('id, nome').in('id', ids);
                (alunosFeed || []).forEach((a: any) => { nomes[a.id] = a.nome; });
            }
            res.json((data || []).map((f: any) => ({ ...f, aluno_nome: f.aluno_id ? (nomes[f.aluno_id] || null) : null })));
        } catch (error) {
            console.error('Error fetching feed:', error);
            res.json([]); // Fail gracefully until table exists
        }
    });

    app.post('/api/feed', requireStaff, async (req, res) => {
        try {
            const { mensagem, tipo, icone, aluno_id } = req.body;
            const { error } = await supabase.from('feed_atividades').insert([{
                mensagem, tipo, icone, aluno_id
            }]);
            if (error && error.code !== '42P01') throw error;
            res.json({ success: true });
        } catch (error) {
            console.error('Error posting to feed:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // --- GOD MODE ENDPOINTS (EXCLUSIVO ANTONY) ---
    app.get('/api/godmode/status', requireOwner, async (req: any, res) => {
        try {
            const { data, error } = await supabase.from('system_config').select('key_value').eq('key_name', 'JOGOS_DAO_XP').maybeSingle();
            if (error) throw error;
            res.json({ jogos_dao_xp: data?.key_value !== 'false' });
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.post('/api/godmode/config-xp', requireOwner, async (req: any, res) => {
        try {
            const { enabled } = req.body;
            const strVal = enabled ? 'true' : 'false';
            
            const { data: existing } = await supabase.from('system_config').select('id').eq('key_name', 'JOGOS_DAO_XP').maybeSingle();
            let err;
            if (existing) {
                const { error } = await supabase.from('system_config').update({ key_value: strVal }).eq('key_name', 'JOGOS_DAO_XP');
                err = error;
            } else {
                const { error } = await supabase.from('system_config').insert([{ key_name: 'JOGOS_DAO_XP', key_value: strVal }]);
                err = error;
            }
            if (err) throw err;
            res.json({ success: true, jogos_dao_xp: enabled });
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.post('/api/godmode/creditar', requireOwner, async (req: any, res) => {
        try {
            const { aluno_id, tipo, valor } = req.body;
            if (!aluno_id || !tipo || isNaN(Number(valor))) {
                return res.status(400).json({ error: 'Parâmetros inválidos.' });
            }
            
            const valorNum = Number(valor);
            const { data: aluno, error: getErr } = await supabase.from('alunos').select('id, nome, xp, acorde_coins').eq('id', aluno_id).single();
            if (getErr || !aluno) return res.status(404).json({ error: 'Aluno não encontrado.' });
            
            let updatePayload: any = {};
            if (tipo === 'xp') {
                updatePayload.xp = (Number(aluno.xp) || 0) + valorNum;
            } else if (tipo === 'moedas') {
                updatePayload.acorde_coins = (Number(aluno.acorde_coins) || 0) + valorNum;
            } else {
                return res.status(400).json({ error: 'Tipo inválido.' });
            }
            
            const { error: updErr } = await supabase.from('alunos').update(updatePayload).eq('id', aluno_id);
            if (updErr) throw updErr;
            
            const msg = tipo === 'xp' 
                ? `O Administrador creditou +${valorNum} XP para o aluno ${aluno.nome}! ✨` 
                : `O Administrador creditou +${valorNum} Acorde Coins para o aluno ${aluno.nome}! 💰`;
            await addToFeed(aluno.id, 'admin', msg, '⚡');
            
            res.json({ success: true, novoValor: tipo === 'xp' ? updatePayload.xp : updatePayload.acorde_coins });
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    // 2. Avatar
    app.put('/api/alunos/:id/avatar', requireSelfOrStaff('id'), async (req, res) => {
        try {
            const { avatar_config } = req.body;
            const { error } = await supabase
                .from('alunos')
                .update({ avatar_config })
                .eq('id', req.params.id);
            if (error) throw error;
            res.json({ success: true });
        } catch (error) {
            console.error('Error updating avatar:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // 3. Videos
    app.get('/api/aulas-video', async (req, res) => {
        try {
            const { data, error } = await supabase.from('aulas_video').select('*, aulas_video_questoes(*)').order('created_at', { ascending: false });
            if (error && error.code !== '42P01') throw error;
            res.json(data || []);
        } catch(error) {
            res.json([]);
        }
    });

    app.post('/api/aulas-video', requireStaff, async (req, res) => {
        try {
            const { youtube_url, youtube_id, titulo, descricao, questoes } = req.body;
            const { data, error } = await supabase.from('aulas_video').insert([{
                youtube_url, youtube_id, titulo, descricao
            }]).select();
            if (error) throw error;
            const videoId = data[0].id;
            
            if (questoes && questoes.length > 0) {
                const questaoData = questoes.map(q => ({
                    aula_video_id: videoId,
                    pergunta: q.pergunta,
                    opcoes: q.opcoes,
                    resposta_correta: q.resposta_correta
                }));
                await supabase.from('aulas_video_questoes').insert(questaoData);
            }
            res.json(data[0]);
        } catch(error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Helper utilitário robusto para decodificar perguntas de questionários e provas
    function parseTrilhaQuestions(rawQuestions: any): any[] {
        if (!rawQuestions) return [];
        if (Array.isArray(rawQuestions)) return rawQuestions;
        if (typeof rawQuestions === 'object') {
            if (Array.isArray(rawQuestions.questions)) return rawQuestions.questions;
            if (Array.isArray(rawQuestions.questoes)) return rawQuestions.questoes;
            return [];
        }
        if (typeof rawQuestions === 'string') {
            try {
                const parsed = JSON.parse(rawQuestions);
                if (Array.isArray(parsed)) return parsed;
                if (parsed && typeof parsed === 'object') {
                    if (Array.isArray(parsed.questions)) return parsed.questions;
                    if (Array.isArray(parsed.questoes)) return parsed.questoes;
                }
            } catch (e) {
                try {
                    const cleaned = rawQuestions
                        .replace(/\\+"([^"]+?)\\+"/g, "'$1'")
                        .replace(/\\\\"/g, '"');
                    const parsed = JSON.parse(cleaned);
                    if (Array.isArray(parsed)) return parsed;
                } catch (e2) {
                    console.error('Erro ao processar questionário:', e2);
                }
            }
        }
        return [];
    }

    // --- TRILHA EAD & QUESTIONARIOS ---
    app.get('/api/trilha/modulos', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('modulos_trilha')
                .select('*')
                .order('ordem', { ascending: true });
            if (error) throw error;
            res.json(data || []);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/trilha/modulos', requireStaff, async (req, res) => {
        try {
            const { id, nome, descricao, ordem, arte_index, prova_final, conquista_id } = req.body;
            const parsedProvaFinal = parseTrilhaQuestions(prova_final);
            let result;
            if (id) {
                result = await supabase
                    .from('modulos_trilha')
                    .update({ 
                        nome, 
                        descricao, 
                        ordem, 
                        arte_index, 
                        prova_final: parsedProvaFinal, 
                        conquista_id: conquista_id ? Number(conquista_id) : null 
                    })
                    .eq('id', id)
                    .select();
            } else {
                result = await supabase
                    .from('modulos_trilha')
                    .insert([{ 
                        nome, 
                        descricao, 
                        ordem, 
                        arte_index, 
                        prova_final: parsedProvaFinal, 
                        conquista_id: conquista_id ? Number(conquista_id) : null 
                    }])
                    .select();
            }
            if (result.error) throw result.error;
            res.json(result.data[0]);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.delete('/api/trilha/modulos/:id', requireStaff, async (req, res) => {
        try {
            const { error } = await supabase
                .from('modulos_trilha')
                .delete()
                .eq('id', req.params.id);
            if (error) throw error;
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/trilha/aulas', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('aulas_trilha')
                .select('*')
                .order('ordem', { ascending: true });
            if (error) throw error;
            res.json(data || []);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/trilha/aulas', requireStaff, async (req, res) => {
        try {
            const { id, modulo_id, titulo, youtube_url, ordem, questionario, conquista_id } = req.body;
            const parsedQuestionario = parseTrilhaQuestions(questionario);
            let result;
            if (id) {
                result = await supabase
                    .from('aulas_trilha')
                    .update({ 
                        modulo_id, 
                        titulo, 
                        youtube_url, 
                        ordem, 
                        questionario: parsedQuestionario, 
                        conquista_id: conquista_id ? Number(conquista_id) : null 
                    })
                    .eq('id', id)
                    .select();
            } else {
                result = await supabase
                    .from('aulas_trilha')
                    .insert([{ 
                        modulo_id, 
                        titulo, 
                        youtube_url, 
                        ordem, 
                        questionario: parsedQuestionario, 
                        conquista_id: conquista_id ? Number(conquista_id) : null 
                    }])
                    .select();
            }
            if (result.error) throw result.error;
            res.json(result.data[0]);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.delete('/api/trilha/aulas/:id', requireStaff, async (req, res) => {
        try {
            const { error } = await supabase
                .from('aulas_trilha')
                .delete()
                .eq('id', req.params.id);
            if (error) throw error;
            res.json({ success: true });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/trilha/progresso/:alunoId', requireSelfOrStaff('alunoId'), async (req, res) => {
        try {
            const alunoId = req.params.alunoId;
            const { data: prog, error } = await supabase
                .from('progresso_trilha')
                .select('*')
                .eq('aluno_id', alunoId);
            if (error) throw error;

            const { data: aprovadas } = await supabase
                .from('tentativas_questionario_trilha')
                .select('aula_trilha_id, created_at')
                .eq('aluno_id', alunoId)
                .eq('aprovado', true)
                .not('aula_trilha_id', 'is', null);

            const map = new Map<number, any>();
            (prog || []).forEach((p: any) => {
                if (p.aula_id) map.set(Number(p.aula_id), p);
            });

            if (aprovadas && aprovadas.length > 0) {
                for (const ap of aprovadas) {
                    const aId = Number(ap.aula_trilha_id);
                    if (!map.has(aId)) {
                        map.set(aId, {
                            id: `quiz-${aId}`,
                            aluno_id: Number(alunoId),
                            aula_id: aId,
                            concluido_at: ap.created_at
                        });
                        try {
                            await supabase.from('progresso_trilha')
                                .insert([{ aluno_id: Number(alunoId), aula_id: aId }]);
                        } catch (_) {}
                    }
                }
            }

            res.json(Array.from(map.values()));
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/trilha/progresso', requireSelfOrStaff('aluno_id', 'body'), async (req, res) => {
        try {
            const { aluno_id, aula_id } = req.body;
            const targetAlunoId = aluno_id || req.body.alunoId;
            const targetAulaId = aula_id || req.body.aulaId;
            if (!targetAlunoId || !targetAulaId) {
                return res.status(400).json({ error: 'aluno_id e aula_id são obrigatórios.' });
            }

            const { data: existing } = await supabase
                .from('progresso_trilha')
                .select('*')
                .eq('aluno_id', Number(targetAlunoId))
                .eq('aula_id', Number(targetAulaId))
                .maybeSingle();

            if (existing) {
                return res.json(existing);
            }

            const { data, error } = await supabase
                .from('progresso_trilha')
                .insert([{
                    aluno_id: Number(targetAlunoId),
                    aula_id: Number(targetAulaId)
                }])
                .select();
            if (error) throw error;

            const { data: aluno } = await supabase
                .from('alunos')
                .select('id, nome, xp, acorde_coins')
                .eq('id', targetAlunoId)
                .single();
                
            if (aluno) {
                const novoXp = (Number(aluno.xp) || 0) + 200;
                const novasMoedas = (Number(aluno.acorde_coins) || 0) + 200;
                await supabase
                     .from('alunos')
                     .update({ xp: novoXp, acorde_coins: novasMoedas })
                     .eq('id', aluno.id);
                     
                await recordPontos(
                    targetAlunoId,
                    'aulas_video',
                    'Concluiu aula da Trilha EAD',
                    200
                );

                await addToFeed(
                     aluno.id,
                     'aula_trilha_concluida',
                     `Concluiu a aula da trilha e ganhou +200 XP & +200 Coins!`,
                     '🎓'
                );
            }
            
            res.json(data ? data[0] : { success: true });
         } catch (error: any) {
            res.status(500).json({ error: error.message });
         }
    });

    app.post('/api/trilha/gerar-questionario-ia', requireStaff, async (req, res) => {
        try {
            const { textoBruto } = req.body;
            if (!textoBruto) {
                return res.status(400).json({ error: 'Texto bruto é obrigatório.' });
            }

            const apiKey = await getGeminiKey();
            if (!apiKey) {
                return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no servidor nem no banco de dados (tabela system_config).' });
            }

            const prompt = `Você é um assistente de educação musical especializado em estruturar questionários de múltipla escolha para alunos de música.
Seu objetivo é ler o seguinte texto contendo perguntas e respostas de música e retornar EXCLUSIVAMENTE um array de objetos JSON estruturado (com as chaves exatas: pergunta, opcoes e resposta_correta_idx) sem formatação markdown (como blocos de código com \`\`\`json) ou textos adicionais, contendo todas as perguntas processadas do texto de entrada.

Regras de Saída JSON:
[
  {
    "pergunta": "Texto da pergunta",
    "opcoes": ["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"],
    "resposta_correta_idx": 0 // index da alternativa correta no array opcoes (0-based)
  }
]

Texto com perguntas e respostas a ser estruturado:
"""
${textoBruto}
"""`;

            const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: 'application/json' }
                })
            });

            if (!geminiResponse.ok) {
                const errText = await geminiResponse.text();
                throw new Error(`Erro na API do Gemini: ${errText}`);
            }

            const responseData = await geminiResponse.json();
            const rawText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

            const parsedQuestions = parseTrilhaQuestions(cleanedText);
            res.json(parsedQuestions);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/trilha/responder-questionario', requireSelfOrStaff('aluno_id', 'body'), async (req, res) => {
        try {
            const { aluno_id, aula_trilha_id, modulo_trilha_id, respostas, perguntas_sorteadas } = req.body;
            if (!aluno_id || (!aula_trilha_id && !modulo_trilha_id) || !respostas) {
                return res.status(400).json({ error: 'aluno_id, respostas e um identificador de aula ou módulo são obrigatórios.' });
            }

            let gabaQuestions: any[] = [];
            let moduloId = modulo_trilha_id;
            let aulaId = aula_trilha_id;
            let conquistaId: number | null = null;
            let tituloReferencia = '';

            // Se for responder o questionário de uma Aula
            if (aulaId) {
                const { data: aula, error: aulaErr } = await supabase
                    .from('aulas_trilha')
                    .select('id, titulo, questionario, conquista_id, modulo_id')
                    .eq('id', aulaId)
                    .single();
                if (aulaErr || !aula) throw new Error('Aula não encontrada.');
                
                moduloId = aula.modulo_id;
                conquistaId = aula.conquista_id;
                tituloReferencia = aula.titulo;
                
                gabaQuestions = parseTrilhaQuestions(aula.questionario);
            } 
            // Se for a prova final de um Módulo
            else if (moduloId) {
                const { data: modulo, error: modErr } = await supabase
                    .from('modulos_trilha')
                    .select('id, nome, prova_final, conquista_id')
                    .eq('id', moduloId)
                    .single();
                if (modErr || !modulo) throw new Error('Módulo não encontrado.');
                
                conquistaId = modulo.conquista_id;
                tituloReferencia = `Prova Geral: ${modulo.nome}`;

                gabaQuestions = parseTrilhaQuestions(modulo.prova_final);
            }

            // Se for a prova final de um Módulo, verificar se já passou (única tentativa permitida)
            // Envio repetido em sequência (duplo clique): ignora a mesma prova enviada há menos de 15s
            {
                let recente = supabase.from('tentativas_questionario_trilha')
                    .select('id')
                    .eq('aluno_id', aluno_id)
                    .gte('created_at', new Date(Date.now() - 15000).toISOString())
                    .limit(1);
                recente = aulaId ? recente.eq('aula_trilha_id', aulaId) : recente.eq('modulo_trilha_id', moduloId).is('aula_trilha_id', null);
                const { data: envioRecente } = await recente;
                if (envioRecente && envioRecente.length > 0) {
                    return res.status(429).json({ error: 'Esta prova acabou de ser enviada. Aguarde alguns segundos.' });
                }
            }

            if (moduloId && !aulaId) {
                // limit(1): com mais de uma aprovação registrada, o maybeSingle() dava erro e a prova
                // podia ser refeita infinitas vezes (100.000 pontos a cada vez)
                const { data: aprovacoes } = await supabase
                    .from('tentativas_questionario_trilha')
                    .select('id')
                    .eq('aluno_id', aluno_id)
                    .eq('modulo_trilha_id', moduloId)
                    .is('aula_trilha_id', null)
                    .eq('aprovado', true)
                    .limit(1);
                const jaPassou = aprovacoes && aprovacoes.length > 0;

                if (jaPassou) {
                    return res.status(400).json({ 
                        error: 'A Prova Final do Módulo vale 100.000 PTS e só pode ser realizada uma única vez (100K já garantidos).' 
                    });
                }
            }

            if (gabaQuestions.length === 0) {
                return res.status(400).json({ error: 'Nenhum questionário cadastrado para esta referência.' });
            }

            // Determina as perguntas avaliadas (caso haja perguntas sorteadas pelo frontend)
            let questionsToEvaluate: any[] = [];
            if (Array.isArray(perguntas_sorteadas) && perguntas_sorteadas.length > 0) {
                const indicesUnicos = Array.from(new Set(perguntas_sorteadas.map((idx: any) => Number(idx))))
                    .filter((idx: number) => Number.isInteger(idx) && gabaQuestions[idx] !== undefined);
                // O frontend sorteia 15 perguntas (ou todas, se houver menos); menos que isso não vale
                const minimoPerguntas = Math.min(15, gabaQuestions.length);
                if (indicesUnicos.length < minimoPerguntas) {
                    return res.status(400).json({ error: `O questionário precisa ter pelo menos ${minimoPerguntas} perguntas respondidas.` });
                }
                questionsToEvaluate = indicesUnicos.map((idx: number) => ({ q: gabaQuestions[idx], origIdx: idx }));
            }

            if (questionsToEvaluate.length === 0) {
                questionsToEvaluate = gabaQuestions.map((q: any, idx: number) => ({ q, origIdx: idx }));
            }

            let acertos = 0;
            let feedback = {};
            
            questionsToEvaluate.forEach((item: any, i: number) => {
                const q = item.q;
                const origIdx = item.origIdx;
                
                let respAluno = respostas[origIdx];
                if (respAluno === undefined) respAluno = respostas[String(origIdx)];
                if (respAluno === undefined) respAluno = respostas[i];

                const respCorreta = q.resposta_correta_idx !== undefined ? q.resposta_correta_idx : q.resposta_correta;
                const isCorrect = respAluno !== undefined && Number(respAluno) === Number(respCorreta);
                
                if (isCorrect) {
                    acertos++;
                }
                
                feedback[origIdx] = {
                    correta: isCorrect,
                    resposta_esperada: respCorreta,
                    sua_resposta: respAluno
                };
            });

            const totalAvaliado = questionsToEvaluate.length;
            const nota = totalAvaliado > 0 ? Math.round((acertos / totalAvaliado) * 100) : 0;
            const aprovado = nota >= 80;

            let xpGanhos = 0;
            let moedasGanhas = 0;
            let conquistouMedalha = false;
            const isProvaFinalModulo = Boolean(moduloId && !aulaId);

            if (aprovado) {
                const { data: aluno } = await supabase
                    .from('alunos')
                    .select('id, nome, xp, acorde_coins')
                    .eq('id', aluno_id)
                    .single();

                if (aluno) {
                    const pontosPadrao = isProvaFinalModulo ? 100000 : 50000;

                    // Se a aula ou módulo não tem conquistaId vinculado, tentar encontrar ou criar um troféu
                    if (!conquistaId) {
                        const nomeTrofeu = isProvaFinalModulo ? `Troféu Módulo: ${tituloReferencia}` : `Troféu Desafio: ${tituloReferencia}`;
                        const { data: existingConq } = await supabase
                            .from('gamificacao_conquistas')
                            .select('id')
                            .eq('nome', nomeTrofeu)
                            .maybeSingle();

                        if (existingConq) {
                            conquistaId = existingConq.id;
                        } else {
                            const { data: newConq } = await supabase
                                .from('gamificacao_conquistas')
                                .insert([{
                                    nome: nomeTrofeu,
                                    descricao: `Conquistado ao passar na prova/desafio: ${tituloReferencia}`,
                                    pontos: pontosPadrao,
                                    classe: 'Lendario',
                                    instrumento: 'EAD',
                                    temporada_id: 3
                                }])
                                .select('id')
                                .single();
                            if (newConq) {
                                conquistaId = newConq.id;
                            }
                        }

                        if (conquistaId) {
                            if (aulaId) {
                                await supabase.from('aulas_trilha').update({ conquista_id: conquistaId }).eq('id', aulaId);
                            } else if (moduloId) {
                                await supabase.from('modulos_trilha').update({ conquista_id: conquistaId }).eq('id', moduloId);
                            }
                        }
                    }

                    let alreadyDone = false;
                    if (conquistaId) {
                        const { data: found } = await supabase
                            .from('gamificacao_progresso')
                            .select('id')
                            .eq('aluno_id', aluno.id)
                            .eq('conquista_id', conquistaId)
                            .limit(1)
                            .maybeSingle();
                        if (found) alreadyDone = true;
                    }

                    if (aulaId) {
                        const { data: pTrilha } = await supabase
                            .from('progresso_trilha')
                            .select('*')
                            .eq('aluno_id', aluno.id)
                            .eq('aula_id', aulaId)
                            .limit(1)
                            .maybeSingle();
                        if (pTrilha) alreadyDone = true;
                    }

                    const isRetake = alreadyDone && !isProvaFinalModulo;
                    // Prova Final do Módulo: 100.000 PTS (Única vez). Refazer/Fazer Provas de Aula: 50.000 PTS a cada vez!
                    xpGanhos = isProvaFinalModulo ? 100000 : 50000;
                    moedasGanhas = isProvaFinalModulo ? 100000 : 50000;
                    
                    const novoXp = (Number(aluno.xp) || 0) + xpGanhos;
                    const novasMoedas = (Number(aluno.acorde_coins) || 0) + moedasGanhas;
                    
                    await supabase
                        .from('alunos')
                        .update({ xp: novoXp, acorde_coins: novasMoedas })
                        .eq('id', aluno.id);

                    await recordPontos(
                        aluno.id,
                        'aulas_video',
                        isProvaFinalModulo 
                            ? `Concluiu Prova Final do Módulo: ${tituloReferencia}`
                            : isRetake 
                                ? `Refez Questionário: ${tituloReferencia}` 
                                : `Passou Questionário: ${tituloReferencia}`,
                        xpGanhos
                    );

                    await addToFeed(
                        aluno.id,
                        isProvaFinalModulo ? 'modulo_trilha_concluido' : 'aula_trilha_concluida',
                        isProvaFinalModulo
                            ? `Concluiu a PROVA FINAL do módulo com ${nota}% em "${tituloReferencia}"! Faturou +100.000 XP & +100.000 Moedas! 👑🏆`
                            : isRetake 
                                ? `Refez e passou novamente com ${nota}% em "${tituloReferencia}"! Ganhou +${xpGanhos.toLocaleString('pt-BR')} XP!`
                                : `Aprovado com ${nota}% em "${tituloReferencia}"! Ganhou +${xpGanhos.toLocaleString('pt-BR')} XP & +${moedasGanhas.toLocaleString('pt-BR')} Moedas!`,
                        isProvaFinalModulo ? '👑' : '🎓'
                    );

                    if (aulaId) {
                        try {
                            const { data: existingProg } = await supabase
                                .from('progresso_trilha')
                                .select('id')
                                .eq('aluno_id', Number(aluno.id))
                                .eq('aula_id', Number(aulaId))
                                .maybeSingle();

                            if (!existingProg) {
                                await supabase
                                    .from('progresso_trilha')
                                    .insert([{ aluno_id: Number(aluno.id), aula_id: Number(aulaId) }]);
                                console.log(`[TRILHA] Progresso registrado para aluno ${aluno.id}, aula ${aulaId}`);
                            }
                        } catch (progErr) {
                            console.error('[TRILHA_PROGRESSO_ERROR]:', progErr);
                        }
                    }

                    if (conquistaId && !alreadyDone) {
                        await supabase
                            .from('gamificacao_progresso')
                            .insert([{ aluno_id: aluno.id, conquista_id: conquistaId }]);
                        conquistouMedalha = true;
                    }
                }
            }

            // Salva a tentativa no histórico
            try {
                await supabase.from('tentativas_questionario_trilha').insert([{
                    aluno_id: Number(aluno_id),
                    aula_trilha_id: aulaId ? Number(aulaId) : null,
                    modulo_trilha_id: moduloId ? Number(moduloId) : null,
                    nota,
                    aprovado,
                    respostas: feedback
                }]);
            } catch (tErr) {
                console.error('Erro ao registrar tentativa no banco:', tErr);
            }

            res.json({
                success: true,
                aprovado,
                nota,
                acertos,
                total: totalAvaliado,
                xpGanhos,
                moedasGanhas,
                conquistouMedalha,
                feedback
            });
        } catch (error: any) {
            console.error('Erro ao responder questionário da trilha:', error);
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/alunos/abrir-ficha-premio', requireSelfOrStaff('aluno_id', 'body'), async (req, res) => {
         try {
             const { aluno_id } = req.body;
             const dateStr = getDateBR();
             
             const { data: claims, error: claimErr } = await supabase
                 .from('feed_atividades')
                 .select('*')
                 .eq('aluno_id', aluno_id)
                 .eq('tipo', 'ficha_estudo_diaria')
                 // Dia de Cuiabá (UTC-4)
                 .gte('created_at', new Date(`${dateStr}T00:00:00-04:00`).toISOString())
                 .lte('created_at', new Date(`${dateStr}T23:59:59.999-04:00`).toISOString());
                 
             if (claimErr) throw claimErr;
             
             if (claims && claims.length > 0) {
                 return res.json({ success: true, claimed: true, message: 'Já recebeu o prêmio diário hoje.' });
             }
             
             const { data: aluno, error: getErr } = await supabase
                 .from('alunos')
                 .select('id, nome, xp, acorde_coins')
                 .eq('id', aluno_id)
                 .single();
                 
             if (getErr || !aluno) return res.status(404).json({ error: 'Aluno não encontrado.' });
             
             const novoXp = (Number(aluno.xp) || 0) + 500;
             const novasMoedas = (Number(aluno.acorde_coins) || 0) + 500;
             
             await supabase
                 .from('alunos')
                 .update({ xp: novoXp, acorde_coins: novasMoedas })
                 .eq('id', aluno_id);
                 
             await addToFeed(
                 aluno_id,
                 'ficha_estudo_diaria',
                 'Abriu o Diário Pedagógico de aula e ganhou +500 XP & +500 Coins!',
                 '📖'
             );
             
             res.json({ success: true, claimed: false, message: 'Prêmio diário creditado!', novoXp, novasMoedas });
         } catch (error) {
             console.error('Error claiming daily ficha reward:', error);
             res.status(500).json({ error: error.message });
         }
    });

    // --- END GAMIFICACAO 2.0 ---

    // --- MATERIAIS SALVOS DO PROFESSOR (Tablaturas, Melodias) ---
    const getProfessorDoUsuario = async (req: any) => {
        const { data: prof } = await supabase.from('professores').select('id').ilike('email', escapeLike(req.user?.email)).limit(1).maybeSingle();
        return prof;
    };

    app.get('/api/materiais-salvos', requireStaff, async (req: any, res) => {
        try {
            const prof = await getProfessorDoUsuario(req);
            if (!prof) return res.status(404).json({ error: 'Professor não encontrado' });

            let query = supabase.from('materiais_salvos').select('*').eq('professor_id', prof.id).order('created_at', { ascending: false });
            if (req.query.tipo) query = query.eq('tipo', String(req.query.tipo));

            const { data, error } = await query;
            if (error) throw error;
            res.json(data || []);
        } catch (error) { res.status(500).json({ error: 'Erro ao buscar materiais salvos' }); }
    });

    app.post('/api/materiais-salvos', requireStaff, async (req: any, res) => {
        try {
            const prof = await getProfessorDoUsuario(req);
            if (!prof) return res.status(404).json({ error: 'Professor não encontrado' });

            const { tipo, titulo, conteudo } = req.body;
            if (!tipo || !titulo || !conteudo) return res.status(400).json({ error: 'Campos obrigatórios faltando' });

            const { data, error } = await supabase.from('materiais_salvos').insert([{
                professor_id: prof.id, tipo, titulo, conteudo
            }]).select().single();
            if (error) throw error;
            res.json(data);
        } catch (error) { res.status(500).json({ error: 'Erro ao salvar material' }); }
    });

    app.delete('/api/materiais-salvos/:id', requireStaff, async (req: any, res) => {
        try {
            const prof = await getProfessorDoUsuario(req);
            if (!prof) return res.status(404).json({ error: 'Professor não encontrado' });

            const { data: mat } = await supabase.from('materiais_salvos').select('professor_id').eq('id', req.params.id).maybeSingle();
            if (!mat || mat.professor_id !== prof.id) return res.status(403).json({ error: 'Sem permissão' });

            const { error } = await supabase.from('materiais_salvos').delete().eq('id', req.params.id);
            if (error) throw error;
            res.json({ success: true });
        } catch (error) { res.status(500).json({ error: 'Erro ao deletar material' }); }
    });

    // --- REMANEJAMENTO (atualiza datas dos registros existentes; nada é apagado ou recriado) ---
    app.post('/api/alunos/:id/remanejar-pagamentos', requireAdmin, async (req, res) => {
        try {
            const { nova_data_inicio } = req.body;
            if (!/^\d{4}-\d{2}-\d{2}$/.test(String(nova_data_inicio || ''))) return res.status(400).json({ error: 'Data inválida' });
            const alunoId = req.params.id;

            const { data: pendentes, error } = await supabase.from('pagamentos')
                .select('id, data_vencimento')
                .eq('aluno_id', alunoId)
                .eq('status', 'pendente')
                .eq('tipo_receita', 'mensalidade')
                .order('data_vencimento', { ascending: true });
            if (error) throw error;
            if (!pendentes || pendentes.length === 0) return res.json({ success: true, message: 'Nenhum pagamento pendente para remanejar.' });

            const novoDia = parseDateOnly(nova_data_inicio).getUTCDate();
            const datas = gerarVencimentos(nova_data_inicio, pendentes.length, novoDia);
            const resultados = await Promise.all(pendentes.map((pg: any, i: number) =>
                supabase.from('pagamentos').update({
                    data_vencimento: toDateStr(datas[i]),
                    referencia_mes_ano: toRefMesAno(datas[i])
                }).eq('id', pg.id)
            ));
            const falha = resultados.find((r: any) => r.error);
            if (falha) throw falha.error;

            const { data: matricula } = await supabase.from('matriculas').select('id').eq('aluno_id', alunoId).order('id', { ascending: false }).limit(1).maybeSingle();
            if (matricula) await supabase.from('matriculas').update({ dia_vencimento: novoDia }).eq('id', matricula.id);

            res.json({ success: true, atualizados: pendentes.length });
        } catch (error: any) {
            console.error('[REMANEJAR_PAGAMENTOS]', error);
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/alunos/:id/remanejar-aulas', requireAdmin, async (req, res) => {
        try {
            const { nova_data_inicio } = req.body;
            if (!/^\d{4}-\d{2}-\d{2}$/.test(String(nova_data_inicio || ''))) return res.status(400).json({ error: 'Data inválida' });
            const alunoId = req.params.id;

            const { data: aulasPendentes, error } = await supabase.from('aulas')
                .select('id, data')
                .eq('aluno_id', alunoId)
                .eq('status', 'pendente')
                .eq('tipo', 'regular')
                .order('data', { ascending: true });
            if (error) throw error;
            if (!aulasPendentes || aulasPendentes.length === 0) return res.json({ success: true, message: 'Nenhuma aula pendente para remanejar.' });

            const inicio = parseDateOnly(nova_data_inicio);
            const resultados = await Promise.all(aulasPendentes.map((aula: any, i: number) => {
                const d = new Date(inicio.getTime() + i * 7 * 86400000);
                return supabase.from('aulas').update({ data: toDateStr(d) }).eq('id', aula.id);
            }));
            const falha = resultados.find((r: any) => r.error);
            if (falha) throw falha.error;

            const { data: matricula } = await supabase.from('matriculas').select('id').eq('aluno_id', alunoId).order('id', { ascending: false }).limit(1).maybeSingle();
            if (matricula) await supabase.from('matriculas').update({ dia_semana: inicio.getUTCDay() }).eq('id', matricula.id);

            res.json({ success: true, atualizadas: aulasPendentes.length });
        } catch (error: any) {
            console.error('[REMANEJAR_AULAS]', error);
            res.status(500).json({ error: error.message });
        }
    });

    // --- ALERTAS DO DASHBOARD ---
    app.get('/api/agenda/pendentes-passado', requireAdmin, async (req, res) => {
        try {
            const hoje = getDateBR();
            const { data, error } = await supabase.from('aulas')
                .select('id, data, horario, status, aluno_id, alunos(nome, status), professores(nome)')
                .lt('data', hoje)
                .in('status', ['pendente', 'confirmada', 'aguardando_confirmacao'])
                .order('data', { ascending: false });
            if (error) throw error;
            res.json((data || []).filter((a: any) => a.alunos?.status !== 'arquivado'));
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    // Parcelas em atraso (mesma regra do card "Alunos em atraso"), uma linha por parcela
    app.get('/api/dashboard/faturas-pendentes', requireAdmin, async (req, res) => {
        try {
            const { emAtraso } = await calcularSituacaoMensalidades(getDateBR());
            const linhas = emAtraso.flatMap((a: any) => a.parcelas.map((p: any) => ({
                id: p.pagamento_id,
                aluno_id: a.aluno_id,
                alunos: { nome: a.nome },
                data_vencimento: p.vencimento,
                valor: p.valor,
                status: 'em atraso',
                referencia: p.referencia
            }))).sort((x: any, y: any) => x.data_vencimento.localeCompare(y.data_vencimento));
            res.json(linhas);
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    // Alunos com mensalidade vencida e não paga (regras em calcularSituacaoMensalidades)
    app.get('/api/dashboard/alunos-em-atraso', requireAdmin, async (req, res) => {
        try {
            const { emAtraso, paraConferir } = await calcularSituacaoMensalidades(getDateBR());
            if (req.query.incluir_conferir === '1') return res.json({ emAtraso, paraConferir });
            res.json(emAtraso);
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    // Aluno com aula marcada NESTE mês e sem nenhuma mensalidade no MÊS QUE VEM (plano acabando)
    const calcularAulasSemMensalidadeProxMes = async (hoje: string) => {
        const mesAtualRef = toRefMesAno(parseDateOnly(hoje));
        const proxRef = (() => { const [m, y] = mesAtualRef.split('/').map(Number); return m === 12 ? `01/${y + 1}` : `${String(m + 1).padStart(2, '0')}/${y}`; })();
        const { inicio, fim } = intervaloDoMes(mesAtualRef);

        const aulasMes = await fetchAllRows(() => supabase.from('aulas')
            .select('id, aluno_id, data, status')
            .gte('data', inicio).lte('data', fim)
            .not('aluno_id', 'is', null)
            .not('status', 'in', '(falta,cancelada)')
            .order('id', { ascending: true }));

        const mensalidades = await fetchAllRows(() => supabase.from('pagamentos')
            .select('id, aluno_id, referencia_mes_ano, data_vencimento, status')
            .eq('tipo_receita', 'mensalidade')
            .neq('status', 'cancelado')
            .not('aluno_id', 'is', null)
            .order('id', { ascending: true }));

        const refsPorAluno: Record<number, Set<string>> = {};
        const ultimaRef: Record<number, string> = {};
        mensalidades.forEach((m: any) => {
            const ref = refDaParcela(m);
            (refsPorAluno[m.aluno_id] ||= new Set()).add(ref);
            if (!ultimaRef[m.aluno_id] || refOrdenavel(ref) > refOrdenavel(ultimaRef[m.aluno_id])) ultimaRef[m.aluno_id] = ref;
        });

        const aulasPorAluno: Record<number, number> = {};
        aulasMes.forEach((a: any) => { aulasPorAluno[a.aluno_id] = (aulasPorAluno[a.aluno_id] || 0) + 1; });

        const ids = Object.keys(aulasPorAluno).map(Number).filter((id) => !(refsPorAluno[id]?.has(proxRef)));
        if (ids.length === 0) return { mes_atual: mesAtualRef, proximo_mes: proxRef, alunos: [] };
        const { data: alunos } = await supabase.from('alunos').select('id, nome, status, telefone, responsavel_telefone').in('id', ids);
        const lista = (alunos || [])
            .filter((a: any) => a.status !== 'arquivado')
            .map((a: any) => ({
                aluno_id: a.id,
                nome: a.nome,
                telefone: a.telefone || a.responsavel_telefone || null,
                aulas_neste_mes: aulasPorAluno[a.id],
                ultima_mensalidade: ultimaRef[a.id] || null
            }))
            .sort((a: any, b: any) => String(a.nome).localeCompare(String(b.nome)));
        return { mes_atual: mesAtualRef, proximo_mes: proxRef, alunos: lista };
    };

    app.get('/api/dashboard/aulas-sem-mensalidade', requireAdmin, async (req, res) => {
        try {
            const r = await calcularAulasSemMensalidadeProxMes(getDateBR());
            res.json(r.alunos.map((a: any) => ({ ...a, mes_atual: r.mes_atual, proximo_mes: r.proximo_mes })));
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    // =====================================================================
    // RELATÓRIOS (painel do administrador)
    // =====================================================================
    const somarDias = (dataStr: string, dias: number) => toDateStr(new Date(parseDateOnly(dataStr).getTime() + dias * 86400000));

    // Plano chegando ao fim: última mensalidade gerada vence nos próximos 30 dias
    const calcularRenovacoes = async (hoje: string) => {
        const mensalidades = await fetchAllRows(() => supabase.from('pagamentos')
            .select('id, aluno_id, data_vencimento')
            .eq('tipo_receita', 'mensalidade')
            .neq('status', 'cancelado')
            .not('aluno_id', 'is', null)
            .order('id', { ascending: true }));
        const ultima: Record<number, string> = {};
        mensalidades.forEach((m: any) => {
            if (!ultima[m.aluno_id] || m.data_vencimento > ultima[m.aluno_id]) ultima[m.aluno_id] = m.data_vencimento;
        });
        const limite = somarDias(hoje, 30);
        const ids = Object.keys(ultima).map(Number).filter((id) => ultima[id] >= hoje && ultima[id] <= limite);
        if (ids.length === 0) return [];
        const { data: alunos } = await supabase.from('alunos').select('id, nome, telefone, responsavel_telefone, status').in('id', ids);
        return (alunos || [])
            .filter((a: any) => a.status !== 'arquivado')
            .map((a: any) => ({
                aluno_id: a.id,
                nome: a.nome,
                telefone: a.telefone || a.responsavel_telefone || null,
                ultima_mensalidade: ultima[a.id],
                dias_restantes: Math.round((parseDateOnly(ultima[a.id]).getTime() - parseDateOnly(hoje).getTime()) / 86400000)
            }))
            .sort((a: any, b: any) => a.dias_restantes - b.dias_restantes);
    };

    // Risco de evasão: faltas recentes, atraso e ausência de treino/app
    const calcularRiscoEvasao = async (hoje: string) => {
        const desde = somarDias(hoje, -30);
        const { data: alunos } = await supabase.from('alunos').select('id, nome, telefone, responsavel_telefone, push_ativo').eq('status', 'ativo');
        const aulas30 = await fetchAllRows(() => supabase.from('aulas')
            .select('id, aluno_id, status')
            .gte('data', desde).lt('data', hoje)
            .in('status', ['realizada', 'falta_aluno', 'falta'])
            .order('id', { ascending: true }));
        const { data: treinos } = await supabase.from('aluno_treinos').select('aluno_id').gte('data', desde);
        const { emAtraso: atrasadosAlunos } = await calcularSituacaoMensalidades(hoje);

        const faltas: Record<number, number> = {};
        const presencas: Record<number, number> = {};
        aulas30.forEach((a: any) => {
            if (a.status === 'realizada') presencas[a.aluno_id] = (presencas[a.aluno_id] || 0) + 1;
            else if (a.status === 'falta_aluno') faltas[a.aluno_id] = (faltas[a.aluno_id] || 0) + 1;
        });
        const treinou = new Set((treinos || []).map((t: any) => t.aluno_id));
        const emAtraso: Record<number, number> = {};
        atrasadosAlunos.forEach((a: any) => { emAtraso[a.aluno_id] = a.parcelas.length; });

        return (alunos || []).map((a: any) => {
            const motivos: string[] = [];
            let pontos = 0;
            const f = faltas[a.id] || 0;
            if (f >= 2) { motivos.push(`${f} faltas em 30 dias`); pontos += f * 2; }
            if ((emAtraso[a.id] || 0) > 0) { motivos.push(`${emAtraso[a.id]} parcela(s) em atraso`); pontos += 3 + emAtraso[a.id]; }
            if ((presencas[a.id] || 0) === 0 && f === 0) { motivos.push('nenhuma aula registrada em 30 dias'); pontos += 2; }
            if (!treinou.has(a.id)) { motivos.push('sem treino no app em 30 dias'); pontos += 1; }
            if (!a.push_ativo) { motivos.push('app/notificações desativados'); pontos += 1; }
            return { aluno_id: a.id, nome: a.nome, telefone: a.telefone || a.responsavel_telefone || null, pontos, motivos };
        }).filter((r: any) => r.pontos >= 4).sort((a: any, b: any) => b.pontos - a.pontos);
    };

    // Horários livres dos próximos 7 dias (disponibilidade do professor menos aulas marcadas)
    const calcularHorariosVagos = async (hoje: string) => {
        const diasNome = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
        const fim = somarDias(hoje, 7);
        const { data: profs } = await supabase.from('professores').select('id, nome, disponibilidade, status').neq('status', 'inativo');
        const { data: ocupadas } = await supabase.from('aulas').select('professor_id, data, horario, status')
            .gte('data', hoje).lt('data', fim).not('status', 'in', '(falta,cancelada)');
        const { data: exps } = await supabase.from('aulas_experimentais').select('professor_id, data, horario, status')
            .gte('data', hoje).lt('data', fim).neq('status', 'cancelada');
        const ocupado = new Set([...(ocupadas || []), ...(exps || [])].map((a: any) => `${a.professor_id}_${a.data}_${String(a.horario || '').substring(0, 5)}`));

        return (profs || []).filter((p: any) => !isDonoPorNome(p.nome) && p.disponibilidade && typeof p.disponibilidade === 'object').map((p: any) => {
            const livres: { data: string; dia: string; horario: string }[] = [];
            for (let i = 0; i < 7; i++) {
                const data = somarDias(hoje, i);
                const dia = diasNome[parseDateOnly(data).getUTCDay()];
                const horas: string[] = Array.isArray(p.disponibilidade[dia]) ? p.disponibilidade[dia] : [];
                horas.forEach((h) => {
                    const hh = String(h).substring(0, 5);
                    if (!ocupado.has(`${p.id}_${data}_${hh}`)) livres.push({ data, dia, horario: hh });
                });
            }
            return { professor_id: p.id, professor_nome: p.nome, total_livres: livres.length, livres };
        }).sort((a: any, b: any) => b.total_livres - a.total_livres);
    };

    app.get('/api/relatorios', requireAdmin, async (req, res) => {
        try {
            const hoje = getDateBR();
            const mesRef = /^\d{2}\/\d{4}$/.test(String(req.query.mes || '')) ? String(req.query.mes) : getMesAtualBR();
            const { inicio, fim } = intervaloDoMes(mesRef);

            const [pagsMes, despesasMes, aulasMes, leadsMes, expsMes, alunosAll, matriculasMes, situacao, placeholders] = await Promise.all([
                fetchAllRows(() => supabase.from('pagamentos').select('id, valor, valor_pago, status, tipo_receita, aluno_id, data_pagamento, matriculas:matricula_id(valor_com_desconto), alunos:aluno_id(status)').eq('referencia_mes_ano', mesRef).neq('status', 'cancelado').order('id', { ascending: true })),
                supabase.from('despesas').select('valor, status, categoria').gte('data_vencimento', inicio).lte('data_vencimento', fim),
                fetchAllRows(() => supabase.from('aulas').select('id, status, tipo, data').gte('data', inicio).lte('data', fim).order('id', { ascending: true })),
                supabase.from('leads').select('id, status, origem, data_criacao').gte('data_criacao', `${inicio}T00:00:00-04:00`).lte('data_criacao', `${fim}T23:59:59-04:00`),
                supabase.from('aulas_experimentais').select('id, status, lead_id').gte('data', inicio).lte('data', fim),
                supabase.from('alunos').select('id, status, data_cadastro, push_ativo, nome, telefone, responsavel_telefone'),
                supabase.from('matriculas').select('id, aluno_id').gte('data_inicio', inicio).lte('data_inicio', fim),
                calcularSituacaoMensalidades(hoje),
                supabase.from('aulas').select('id', { count: 'exact', head: true }).in('status', ['reposicao', 'a_repor']).gte('data', '2099-01-01')
            ]);

            // Financeiro do mês (parcelas com referência no mês; canceladas ficam fora)
            const pags = pagsMes.filter((p: any) => unRel(p.alunos)?.status !== 'arquivado');
            const pagas = pags.filter((p: any) => p.status === 'pago');
            const abertas = pags.filter((p: any) => STATUS_EM_ABERTO.includes(p.status));
            const recebido = pagas.reduce((a: number, p: any) => a + valorPago(p), 0);
            const aReceber = abertas.reduce((a: number, p: any) => a + valorEmAberto(p), 0);
            const aReceberVencido = abertas.filter((p: any) => p.data_vencimento < hoje).reduce((a: number, p: any) => a + valorEmAberto(p), 0);
            const previsto = recebido + aReceber;
            const mensalidadesPagas = pagas.filter((p: any) => p.tipo_receita === 'mensalidade');
            const pagantes = new Set(mensalidadesPagas.map((p: any) => p.aluno_id)).size;
            const despesas = despesasMes.data || [];
            const despesasTotal = despesas.reduce((a: number, d: any) => a + Number(d.valor || 0), 0);

            // Folha: aulas do mês escolhido (paga no mês seguinte) e folha paga neste mês (aulas do mês anterior)
            const [folha, folhaPagaNoMes] = await Promise.all([calcularFolhaProfessores(mesRef), calcularFolhaProfessores(mesAnterior(mesRef))]);

            // Aulas do mês por status
            const porStatus: Record<string, number> = {};
            aulasMes.filter((a: any) => a.data < '2099-01-01').forEach((a: any) => { porStatus[a.status] = (porStatus[a.status] || 0) + 1; });
            const realizadas = porStatus['realizada'] || 0;
            const faltasAluno = porStatus['falta_aluno'] || 0;
            const semRegistro = aulasMes.filter((a: any) => a.data < hoje && ['pendente', 'confirmada', 'aguardando_confirmacao'].includes(a.status)).length;

            // Alunos
            const alunos = alunosAll.data || [];
            const ativos = alunos.filter((a: any) => a.status === 'ativo');
            const novosAlunos = new Set((matriculasMes.data || []).map((m: any) => m.aluno_id)).size;

            // Funil de leads do mês
            const leads = leadsMes.data || [];
            const porOrigem: Record<string, number> = {};
            leads.forEach((l: any) => { const o = l.origem || 'Não informada'; porOrigem[o] = (porOrigem[o] || 0) + 1; });
            const exps = expsMes.data || [];

            // Evolução dos últimos 6 meses (receita recebida x prevista)
            const meses: string[] = [];
            let cursor = mesRef;
            for (let i = 0; i < 6; i++) { meses.unshift(cursor); cursor = mesAnterior(cursor); }
            const evolucao = await Promise.all(meses.map(async (m) => {
                const rowsAll = await fetchAllRows(() => supabase.from('pagamentos').select('id, valor, valor_pago, status, matriculas:matricula_id(valor_com_desconto), alunos:aluno_id(status)').eq('referencia_mes_ano', m).neq('status', 'cancelado').order('id', { ascending: true }));
                const rows = rowsAll.filter((r: any) => unRel(r.alunos)?.status !== 'arquivado');
                const recebidoMes = rows.filter((r: any) => r.status === 'pago').reduce((a: number, r: any) => a + valorPago(r), 0);
                const abertoMes = rows.filter((r: any) => STATUS_EM_ABERTO.includes(r.status)).reduce((a: number, r: any) => a + valorEmAberto(r), 0);
                return { mes: m, recebido: recebidoMes, previsto: recebidoMes + abertoMes };
            }));

            const [renovacoes, risco, horariosVagos] = await Promise.all([
                calcularRenovacoes(hoje),
                calcularRiscoEvasao(hoje),
                calcularHorariosVagos(hoje)
            ]);

            const semApp = ativos.filter((a: any) => !a.push_ativo).map((a: any) => ({
                aluno_id: a.id, nome: a.nome, telefone: a.telefone || a.responsavel_telefone || null
            }));

            res.json({
                mes: mesRef,
                financeiro: {
                    mes_referencia: mesRef,
                    previsto, recebido,
                    a_receber: aReceber,
                    a_receber_vencido: aReceberVencido,
                    parcelas_pagas: pagas.length,
                    parcelas_em_aberto: abertas.length,
                    ticket_medio: pagantes > 0 ? mensalidadesPagas.reduce((a: number, p: any) => a + valorPago(p), 0) / pagantes : 0,
                    alunos_pagantes: pagantes,
                    despesas: despesasTotal,
                    despesas_pagas: despesas.filter((d: any) => d.status === 'pago').reduce((a: number, d: any) => a + Number(d.valor || 0), 0),
                    salarios_pagos_no_mes: folhaPagaNoMes.total_previsto,
                    salarios_mes_aulas: mesAnterior(mesRef),
                    resultado_previsto: previsto - despesasTotal - folhaPagaNoMes.total_previsto,
                    inadimplencia_total: situacao.emAtraso.reduce((a: number, x: any) => a + x.total, 0),
                    inadimplentes: situacao.emAtraso.length,
                    para_conferir_total: situacao.paraConferir.reduce((a: number, x: any) => a + x.total, 0),
                    para_conferir_alunos: situacao.paraConferir.length
                },
                alunos: {
                    ativos: ativos.length,
                    arquivados: alunos.filter((a: any) => a.status === 'arquivado').length,
                    novos_no_mes: novosAlunos,
                    com_app: ativos.filter((a: any) => a.push_ativo).length
                },
                aulas: {
                    por_status: porStatus,
                    realizadas,
                    faltas_aluno: faltasAluno,
                    taxa_presenca: realizadas + faltasAluno > 0 ? Math.round((realizadas / (realizadas + faltasAluno)) * 1000) / 10 : null,
                    sem_registro_no_mes: semRegistro,
                    reposicoes_sem_data: placeholders.count || 0
                },
                folha,
                leads: {
                    total: leads.length,
                    experimentais_no_mes: exps.length,
                    experimentais_realizadas: exps.filter((e: any) => e.status === 'realizada').length,
                    matriculados: leads.filter((l: any) => l.status === 'matriculado').length,
                    taxa_conversao: leads.length > 0 ? Math.round((leads.filter((l: any) => l.status === 'matriculado').length / leads.length) * 1000) / 10 : null,
                    por_origem: porOrigem
                },
                evolucao,
                em_atraso: situacao.emAtraso,
                para_conferir: situacao.paraConferir,
                renovacoes,
                risco_evasao: risco,
                horarios_vagos: horariosVagos,
                sem_app: semApp
            });
        } catch (error: any) {
            console.error('[RELATORIOS]', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Folha isolada (atualização rápida ao trocar o mês)
    app.get('/api/relatorios/folha', requireAdmin, async (req, res) => {
        try {
            const mesRef = /^\d{2}\/\d{4}$/.test(String(req.query.mes || '')) ? String(req.query.mes) : getMesAtualBR();
            res.json(await calcularFolhaProfessores(mesRef));
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    // =====================================================================
    // AUTOMAÇÕES DIÁRIAS (acionadas pelo cron da Vercel)
    // Cada uma pode ser ligada/desligada no painel de Relatórios.
    // =====================================================================
    const AUTOMACOES_PADRAO: Record<string, boolean> = {
        AUTO_EMAIL_DIARIO_DONO: true,   // e-mail diário para a direção: presenças de ontem, vencimentos próximos e atrasos
        AUTO_AVISO_CONFIRMACAO: true,   // e-mail imediato para a direção quando um aluno confirma a aula
        AUTO_LEMBRETE_PRESENCA: true,   // e-mail/push ao professor com aulas passadas sem presença/falta
        AUTO_RESUMO_SEMANAL: true,      // resumo de segunda-feira para a escola (atrasos, renovações, Drive)
        AUTO_BACKUP_SEMANAL: true,      // cópia do banco no Google Drive aos domingos
        AUTO_COBRANCA_ALUNOS: false     // e-mail de cobrança ao aluno (3 dias antes, 1 e 7 dias depois)
    };
    const getAutomacoes = async () => {
        const cfg = await getConfigValues(Object.keys(AUTOMACOES_PADRAO));
        const out: Record<string, boolean> = {};
        Object.entries(AUTOMACOES_PADRAO).forEach(([k, padrao]) => {
            out[k] = cfg[k] === null ? padrao : cfg[k] === 'true';
        });
        return out;
    };

    app.get('/api/automacoes', requireAdmin, async (req, res) => {
        try { res.json(await getAutomacoes()); } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.post('/api/automacoes', requireAdmin, async (req, res) => {
        try {
            for (const k of Object.keys(AUTOMACOES_PADRAO)) {
                if (typeof req.body?.[k] === 'boolean') await setConfigValue(k, req.body[k] ? 'true' : 'false');
            }
            res.json(await getAutomacoes());
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    const brl = (v: number) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const dataBR = (d: string) => String(d || '').substring(0, 10).split('-').reverse().join('/');
    const tabelaHtml = (cabecalho: string[], linhas: (string | number)[][]) => `
        <table style="width:100%; border-collapse:collapse; margin:8px 0 18px; background:#fff; font-size:13px;">
            <thead><tr>${cabecalho.map((c) => `<th style="text-align:left; padding:6px 8px; background:#261812; color:#fff; font-size:11px; text-transform:uppercase;">${escapeHtml(c)}</th>`).join('')}</tr></thead>
            <tbody>${linhas.map((l) => `<tr>${l.map((c) => `<td style="padding:6px 8px; border-bottom:1px solid #eee;">${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>`;

    // E-mail diário para a direção: presenças/faltas de ontem, vencimentos dos próximos 5 dias e atrasos
    const relatorioDiarioDono = async (hoje: string) => {
        const ontem = somarDias(hoje, -1);
        const ate = somarDias(hoje, 5);

        const [aulasOntem, proximos, vencidos] = await Promise.all([
            fetchAllRows(() => supabase.from('aulas')
                .select('id, horario, status, tipo, alunos(nome, status), professores(nome)')
                .eq('data', ontem)
                .order('id', { ascending: true })),
            fetchAllRows(() => supabase.from('pagamentos')
                .select('id, valor, data_vencimento, tipo_receita, matriculas:matricula_id(valor_com_desconto), alunos:aluno_id(nome, status)')
                .in('status', STATUS_EM_ABERTO)
                .gte('data_vencimento', hoje)
                .lte('data_vencimento', ate)
                .order('id', { ascending: true })),
            calcularSituacaoMensalidades(hoje)
        ]);
        const un = (x: any) => (Array.isArray(x) ? x[0] : x);

        // 1) Presenças e faltas de ontem, por professor (só se houve aula)
        const rotulo: Record<string, string> = {
            realizada: '✅ Presença', falta_aluno: '❌ Falta do aluno', falta: '🚫 Cancelada', reposicao: '🔁 Para repor', a_repor: '🔁 Para repor',
            pendente: '⚠️ Sem registro', confirmada: '⚠️ Sem registro (confirmada)', aguardando_confirmacao: '⚠️ Sem registro'
        };
        const aulasValidas = aulasOntem.filter((a: any) => un(a.alunos)?.status !== 'arquivado');
        let secPresenca = '';
        if (aulasValidas.length > 0) {
            const porProf: Record<string, any[]> = {};
            aulasValidas.forEach((a: any) => { (porProf[un(a.professores)?.nome || 'Sem professor'] ||= []).push(a); });
            const total = (st: string[]) => aulasValidas.filter((a: any) => st.includes(a.status)).length;
            secPresenca = `<h3 style="color:#ff6b00;">📋 Presenças e faltas de ${dataBR(ontem)}</h3>
                <p>${aulasValidas.length} aula(s): <b>${total(['realizada'])}</b> presenças, <b>${total(['falta_aluno'])}</b> faltas, <b>${total(['pendente', 'confirmada', 'aguardando_confirmacao'])}</b> sem registro.</p>` +
                Object.entries(porProf).map(([prof, aulas]) => `<p style="margin:10px 0 0; font-weight:bold;">${escapeHtml(prof)}</p>` +
                    tabelaHtml(['Horário', 'Aluno', 'Situação'], aulas
                        .sort((x: any, y: any) => String(x.horario).localeCompare(String(y.horario)))
                        .map((a: any) => [String(a.horario || '').substring(0, 5), un(a.alunos)?.nome || '-', rotulo[a.status] || a.status]))
                ).join('');
        }

        // 2) Vencimentos dos próximos 5 dias
        const prox = proximos.filter((p: any) => un(p.alunos)?.status !== 'arquivado')
            .sort((a: any, b: any) => a.data_vencimento.localeCompare(b.data_vencimento));
        const secProximos = `<h3 style="color:#ff6b00;">📅 Vencimentos até ${dataBR(ate)} (${prox.length})</h3>` + (prox.length
            ? tabelaHtml(['Vencimento', 'Aluno', 'Valor'], prox.map((p: any) => [dataBR(p.data_vencimento), un(p.alunos)?.nome || p.tipo_receita || '-', brl(valorEmAberto(p))]))
              + `<p>Total a receber no período: <b>${brl(prox.reduce((a: number, p: any) => a + valorEmAberto(p), 0))}</b></p>`
            : '<p>Nenhum vencimento nos próximos dias.</p>');

        // 3) Mensalidades em atraso (mesma regra do Dashboard e dos Relatórios)
        const atrasos = vencidos.emAtraso;
        const secAtrasos = `<h3 style="color:#dc2626;">💸 Mensalidades em atraso (${atrasos.length} aluno(s), ${brl(atrasos.reduce((a: number, x: any) => a + x.total, 0))})</h3>` + (atrasos.length
            ? tabelaHtml(['Aluno', 'Meses em atraso', 'Total', 'Dias'], atrasos.map((x: any) => [x.nome || '-', x.parcelas.map((p: any) => `${p.referencia} (${brl(p.valor)})`).join(', '), brl(x.total), x.dias_atraso]))
            : '<p>Nenhum aluno em atraso. 🎉</p>')
            + (vencidos.paraConferir.length ? `<p style="font-size:12px;color:#8e7164;">Para conferir: ${vencidos.paraConferir.length} aluno(s) com parcelas antigas em aberto, mas com mensalidade posterior paga (possível baixa esquecida). Veja em Relatórios.</p>` : '');

        const html = `<div style="font-family: sans-serif; padding: 20px; background: #fff8f6; border: 4px solid #261812; color: #261812; max-width: 720px; margin: 0 auto;">
            <h2 style="color:#ff6b00; text-transform:uppercase; margin-top:0;">Studio Acorde - Relatório diário ${dataBR(hoje)}</h2>
            ${secPresenca}${secProximos}${secAtrasos}
            <p style="margin-top:20px;"><a href="https://acordecrm.vercel.app/relatorios" style="background:#ff6b00; color:#fff; padding:10px 18px; text-decoration:none; font-weight:bold;">ABRIR RELATÓRIOS</a></p>
            <small style="color:#8e7164;">Mensagem automática do Studio Acorde CRM.</small>
        </div>`;
        const enviado = await enviarEmailHtml(`📊 Relatório diário Studio Acorde - ${dataBR(hoje)}`, html, EMAIL_AVISOS_DONO);
        return { enviado, aulas_ontem: aulasValidas.length, vencimentos_proximos: prox.length, alunos_em_atraso: atrasos.length };
    };

    const lembretePresencaProfessores = async (hoje: string) => {
        const pendentes = await fetchAllRows(() => supabase.from('aulas')
            .select('id, data, horario, professor_id, alunos(nome, status), professores(nome, email)')
            .lt('data', hoje)
            .in('status', ['pendente', 'confirmada', 'aguardando_confirmacao'])
            .order('id', { ascending: true }));
        const porProf: Record<number, { email: string; nome: string; aulas: any[] }> = {};
        pendentes.forEach((a: any) => {
            const prof: any = Array.isArray(a.professores) ? a.professores[0] : a.professores;
            const aluno: any = Array.isArray(a.alunos) ? a.alunos[0] : a.alunos;
            if (!prof?.email || aluno?.status === 'arquivado') return;
            (porProf[a.professor_id] ||= { email: prof.email, nome: prof.nome, aulas: [] }).aulas.push(a);
        });
        let enviados = 0;
        for (const p of Object.values(porProf)) {
            const qtd = p.aulas.length;
            const exemplos = p.aulas.sort((x: any, y: any) => y.data.localeCompare(x.data)).slice(0, 5)
                .map((a: any) => `${a.data.split('-').reverse().join('/')} ${String(a.horario || '').substring(0, 5)} - ${(Array.isArray(a.alunos) ? a.alunos[0] : a.alunos)?.nome || 'aluno'}`).join('; ');
            await sendPushNotification(
                `Registre a presença de ${qtd} aula(s) ⏰`,
                `Olá ${String(p.nome || '').split(' ')[0]}! Existem ${qtd} aula(s) passadas sem presença/falta. Ex.: ${exemplos}. Sem esse registro a aula não entra no seu pagamento.`,
                undefined, p.email
            );
            enviados++;
        }
        return { professores_avisados: enviados, aulas_sem_registro: pendentes.length };
    };

    const cobrancaAlunos = async (hoje: string) => {
        const alvos = [somarDias(hoje, 3), somarDias(hoje, -1), somarDias(hoje, -7)];
        const { data: pags } = await supabase.from('pagamentos')
            .select('id, aluno_id, valor, data_vencimento, ultima_cobranca_em, cobranca_contador, matriculas:matricula_id(valor_com_desconto), alunos:aluno_id(nome, email, status)')
            .in('status', STATUS_EM_ABERTO)
            .eq('tipo_receita', 'mensalidade')
            .in('data_vencimento', alvos);
        const { paraConferir } = await calcularSituacaoMensalidades(hoje);
        const naoCobrar = new Set(paraConferir.flatMap((a: any) => a.parcelas.map((p: any) => p.pagamento_id)));
        const { data: cfg } = await supabase.from('system_config').select('key_value').eq('key_name', 'CONFIG_MENSAGEM_COBRANCA').maybeSingle();
        let chavePix = DEFAULT_MENSAGEM_COBRANCA.chave_pix;
        try { chavePix = JSON.parse(cfg?.key_value || '{}').chave_pix || chavePix; } catch {}
        let enviados = 0;
        for (const p of (pags || [])) {
            const aluno: any = Array.isArray(p.alunos) ? p.alunos[0] : p.alunos;
            if (!aluno?.email || aluno.status === 'arquivado' || naoCobrar.has(p.id)) continue;
            if (p.ultima_cobranca_em && String(p.ultima_cobranca_em).substring(0, 10) === hoje) continue;
            const venc = p.data_vencimento.split('-').reverse().join('/');
            const antes = p.data_vencimento > hoje;
            const titulo = antes ? 'Sua mensalidade vence em breve 🎵' : 'Mensalidade em aberto - Studio Acorde';
            const msg = antes
                ? `Olá ${aluno.nome.split(' ')[0]}! Sua mensalidade de R$ ${valorEmAberto(p).toFixed(2)} vence em ${venc}. Chave PIX (CNPJ): ${chavePix}. Se já pagou, desconsidere.`
                : `Olá ${aluno.nome.split(' ')[0]}! Não identificamos o pagamento da mensalidade de R$ ${valorEmAberto(p).toFixed(2)} que venceu em ${venc}. Chave PIX (CNPJ): ${chavePix}. Se já pagou, envie o comprovante para a escola.`;
            const ok = await enviarEmailAviso(titulo, msg, aluno.email);
            if (ok) {
                await supabase.from('pagamentos').update({ ultima_cobranca_em: new Date().toISOString(), cobranca_contador: (Number(p.cobranca_contador) || 0) + 1 }).eq('id', p.id);
                enviados++;
            }
        }
        return { cobrancas_enviadas: enviados };
    };

    const resumoSemanalEscola = async (hoje: string) => {
        const [renovacoes, risco] = await Promise.all([calcularRenovacoes(hoje), calcularRiscoEvasao(hoje)]);
        const { emAtraso } = await calcularSituacaoMensalidades(hoje);
        let drive: any = null;
        try { drive = await getDriveUso(); } catch {}
        const linhas = [
            `Inadimplência: ${emAtraso.length} aluno(s), ${brl(emAtraso.reduce((a: number, x: any) => a + x.total, 0))}.`,
            `Planos terminando em 30 dias: ${renovacoes.length}${renovacoes.length ? ' (' + renovacoes.slice(0, 5).map((r: any) => r.nome).join(', ') + ')' : ''}.`,
            `Alunos em risco de evasão: ${risco.length}${risco.length ? ' (' + risco.slice(0, 5).map((r: any) => r.nome).join(', ') + ')' : ''}.`,
            drive?.conectado ? `Google Drive: ${drive.usoPct}% usado, ${drive.videos} vídeo(s) de treino.` : 'Google Drive: não conectado (vídeos de treino desativados).'
        ];
        await enviarEmailAviso('Resumo semanal da escola 📊', linhas.join(' '), EMAIL_AVISOS_DONO);
        return { enviado: true };
    };

    // Backup: exporta todas as tabelas para JSON e salva no Google Drive (mantém os 8 mais recentes)
    const TABELAS_BACKUP = ['alunos', 'matriculas', 'pagamentos', 'despesas', 'aulas', 'aulas_experimentais', 'professores', 'cursos', 'pacotes', 'salas',
        'leads', 'contratos', 'contrato_templates', 'usuarios', 'gamificacao_conquistas', 'gamificacao_progresso', 'gamificacao_solicitacoes',
        'modulos_trilha', 'aulas_trilha', 'progresso_trilha', 'tentativas_questionario_trilha', 'aluno_treinos', 'materiais', 'materiais_salvos',
        'notificacoes', 'temporadas', 'locacoes', 'mural_vergonha', 'migracao_alunos', 'feed_atividades'];

    const fazerBackupDrive = async () => {
        if (!(await getDriveAccessToken())) return { ok: false, motivo: 'Google Drive não conectado' };
        const dump: Record<string, any[]> = {};
        await Promise.all(TABELAS_BACKUP.map(async (t) => {
            try {
                const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
                const total = count || 0;
                const paginas = await Promise.all(Array.from({ length: Math.ceil(total / PAGE_SIZE) }, (_, i) =>
                    supabase.from(t).select('*').order('id', { ascending: true }).range(i * PAGE_SIZE, i * PAGE_SIZE + PAGE_SIZE - 1)));
                dump[t] = paginas.flatMap((p: any) => p.data || []);
            } catch (e: any) {
                dump[t] = [];
                console.error('[BACKUP] Falha na tabela', t, e.message);
            }
        }));
        // Senhas (hash e texto) não entram no backup
        dump['usuarios'] = (dump['usuarios'] || []).map(({ senha, senha_plana, ...resto }: any) => resto);

        const conteudo = Buffer.from(JSON.stringify({ gerado_em: new Date().toISOString(), tabelas: dump }));
        const s = await getDriveSettings();
        let pastaBackup = (await getConfigValues(['GOOGLE_DRIVE_PASTA_BACKUPS']))['GOOGLE_DRIVE_PASTA_BACKUPS'];
        if (pastaBackup) {
            const chk = await driveFetch(`https://www.googleapis.com/drive/v3/files/${pastaBackup}?fields=id,trashed`);
            const cj: any = await chk.json().catch(() => ({}));
            if (!chk.ok || cj.trashed) pastaBackup = null;
        }
        if (!pastaBackup) {
            const r = await driveFetch('https://www.googleapis.com/drive/v3/files?fields=id', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Acorde CRM - Backups do banco', mimeType: 'application/vnd.google-apps.folder' })
            });
            pastaBackup = ((await r.json()) as any).id;
            await setConfigValue('GOOGLE_DRIVE_PASTA_BACKUPS', pastaBackup);
        }
        const boundary = `bkp${Date.now()}`;
        const meta = JSON.stringify({ name: `backup_acorde_${getDateBR()}.json`, parents: [pastaBackup], mimeType: 'application/json' });
        const body = Buffer.concat([
            Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n`),
            conteudo,
            Buffer.from(`\r\n--${boundary}--`)
        ]);
        const up = await driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,size', {
            method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body
        });
        if (!up.ok) return { ok: false, motivo: `Falha no upload (${up.status})` };

        // Mantém só os 8 backups mais recentes (os antigos vão para a lixeira do Drive)
        const q = encodeURIComponent(`'${pastaBackup}' in parents and trashed = false`);
        const lista = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=createdTime desc&fields=files(id)&pageSize=100`);
        const lj: any = await lista.json().catch(() => ({}));
        for (const f of (lj.files || []).slice(8)) {
            await driveFetch(`https://www.googleapis.com/drive/v3/files/${f.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) });
        }
        void s;
        return { ok: true, tabelas: Object.keys(dump).length, bytes: conteudo.length };
    };

    app.post('/api/backup/agora', requireAdmin, async (req, res) => {
        try { res.json(await fazerBackupDrive()); } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    // =====================================================================
    // ASSISTENTE DE IA (Gemini, camada gratuita) — somente administradores
    // Consultas são feitas direto; qualquer alteração vira uma "ação pendente"
    // que só é executada depois que o administrador confirma no painel.
    // =====================================================================
    const GEMINI_MODEL = 'gemini-2.5-flash';

    const getGeminiKey = async () => {
        if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
        const cfg = await getConfigValues(['GEMINI_API_KEY']);
        return decryptSecret(cfg['GEMINI_API_KEY']);
    };

    const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

    const ferramentasLeitura: Record<string, (args: any) => Promise<any>> = {
        buscar_alunos: async ({ nome }) => {
            const termo = String(nome || '').trim();
            if (termo.length < 2) return { erro: 'Informe pelo menos 2 letras do nome.' };
            const { data } = await supabase.from('alunos')
                .select('id, nome, status, email, matriculas(id, status, dia_semana, horario, professor_id, professores(nome), cursos(nome))')
                .ilike('nome', `%${escapeLike(termo)}%`)
                .limit(10);
            return (data || []).map((a: any) => {
                const mat = [...(a.matriculas || [])].sort((x: any, y: any) => y.id - x.id)[0];
                return {
                    aluno_id: a.id, nome: a.nome, status: a.status, tem_email: Boolean(a.email),
                    matricula: mat ? {
                        status: mat.status,
                        dia_semana: mat.dia_semana !== null && mat.dia_semana !== undefined ? DIAS_SEMANA[mat.dia_semana] : null,
                        horario: String(mat.horario || '').substring(0, 5),
                        professor: mat.professores?.nome, professor_id: mat.professor_id, curso: mat.cursos?.nome
                    } : null
                };
            });
        },
        listar_pagamentos: async ({ aluno_id, somente_em_aberto }) => {
            let q = supabase.from('pagamentos')
                .select('id, referencia_mes_ano, data_vencimento, valor, valor_pago, status, tipo_receita, data_pagamento, matriculas:matricula_id(valor_com_desconto)')
                .eq('aluno_id', Number(aluno_id))
                .order('data_vencimento', { ascending: true });
            if (somente_em_aberto !== false) q = q.in('status', STATUS_EM_ABERTO);
            const { data } = await q.limit(40);
            return (data || []).map((p: any) => ({ pagamento_id: p.id, referencia: p.referencia_mes_ano, vencimento: p.data_vencimento, status: p.status, valor_mensalidade: valorMensalidade(p), data_pagamento: p.data_pagamento }));
        },
        listar_aulas: async ({ aluno_id, data_inicio, data_fim }) => {
            const hoje = getDateBR();
            const { data } = await supabase.from('aulas')
                .select('id, data, horario, status, tipo, professores(nome)')
                .eq('aluno_id', Number(aluno_id))
                .gte('data', data_inicio || somarDiasBR(hoje, -30))
                .lte('data', data_fim || somarDiasBR(hoje, 90))
                .order('data', { ascending: true })
                .limit(60);
            return (data || []).map((a: any) => ({ aula_id: a.id, data: a.data, horario: String(a.horario || '').substring(0, 5), status: a.status, tipo: a.tipo, professor: a.professores?.nome }));
        },
        listar_professores: async () => {
            const { data } = await supabase.from('professores').select('id, nome, status').neq('status', 'inativo').order('nome');
            return (data || []).map((p: any) => ({ professor_id: p.id, nome: p.nome }));
        },
        resumo_financeiro_hoje: async () => {
            const hoje = getDateBR();
            const { emAtraso, paraConferir } = await calcularSituacaoMensalidades(hoje);
            const { data: semana } = await supabase.from('pagamentos').select('valor, matriculas:matricula_id(valor_com_desconto)').in('status', STATUS_EM_ABERTO).eq('tipo_receita', 'mensalidade').gte('data_vencimento', hoje).lte('data_vencimento', somarDiasBR(hoje, 7));
            return {
                alunos_em_atraso: emAtraso.map((a: any) => ({ nome: a.nome, meses: a.parcelas.map((p: any) => p.referencia), total: a.total })),
                em_atraso_total: emAtraso.reduce((a: number, x: any) => a + x.total, 0),
                parcelas_antigas_para_conferir: paraConferir.length,
                vence_nos_proximos_7_dias: (semana || []).reduce((a: number, p: any) => a + valorEmAberto(p), 0)
            };
        }
    };

    // Ações que alteram dados: descritas para o administrador confirmar antes
    const descreverAcao: Record<string, (args: any) => Promise<string>> = {
        dar_baixa_pagamento: async ({ pagamento_id, metodo_pagamento }) => {
            const { data: p } = await supabase.from('pagamentos').select('valor, referencia_mes_ano, status, alunos:aluno_id(nome)').eq('id', Number(pagamento_id)).maybeSingle();
            if (!p) throw new Error(`Pagamento ${pagamento_id} não encontrado.`);
            if (p.status === 'pago') throw new Error('Este pagamento já está pago.');
            return `Dar baixa na parcela ${p.referencia_mes_ano} de ${(p as any).alunos?.nome || 'aluno'} (R$ ${Number(p.valor).toFixed(2)}) via ${metodo_pagamento || 'pix'}.`;
        },
        reagendar_aula: async ({ aula_id, nova_data, novo_horario }) => {
            const { data: a } = await supabase.from('aulas').select('data, horario, alunos(nome)').eq('id', Number(aula_id)).maybeSingle();
            if (!a) throw new Error(`Aula ${aula_id} não encontrada.`);
            return `Reagendar a aula de ${(a as any).alunos?.nome || 'aluno'} de ${String(a.data).split('-').reverse().join('/')} ${String(a.horario || '').substring(0, 5)} para ${String(nova_data).split('-').reverse().join('/')} ${novo_horario || String(a.horario || '').substring(0, 5)}.`;
        },
        alterar_horario_fixo_aluno: async ({ aluno_id, dia_semana, horario, professor_id }) => {
            const { data: al } = await supabase.from('alunos').select('nome').eq('id', Number(aluno_id)).maybeSingle();
            if (!al) throw new Error(`Aluno ${aluno_id} não encontrado.`);
            let prof = '';
            if (professor_id) {
                const { data: p } = await supabase.from('professores').select('nome').eq('id', Number(professor_id)).maybeSingle();
                prof = p ? ` com ${p.nome}` : '';
            }
            const dia = dia_semana !== undefined && dia_semana !== null ? DIAS_SEMANA[Number(dia_semana)] : 'o mesmo dia';
            return `Mudar o horário fixo de ${al.nome} para ${dia}${horario ? ` às ${horario}` : ''}${prof}. As aulas pendentes futuras serão ajustadas.`;
        },
        enviar_email: async ({ destinatario, assunto }) => {
            return `Enviar e-mail para ${destinatario} com o assunto "${assunto}".`;
        }
    };

    const somarDiasBR = (dataStr: string, dias: number) => toDateStr(new Date(parseDateOnly(dataStr).getTime() + dias * 86400000));

    const declaracoesFerramentas = [
        { name: 'buscar_alunos', description: 'Procura alunos pelo nome e retorna id, status e horário fixo da matrícula.', parameters: { type: 'OBJECT', properties: { nome: { type: 'STRING' } }, required: ['nome'] } },
        { name: 'listar_pagamentos', description: 'Lista os pagamentos de um aluno (por padrão só os em aberto).', parameters: { type: 'OBJECT', properties: { aluno_id: { type: 'INTEGER' }, somente_em_aberto: { type: 'BOOLEAN' } }, required: ['aluno_id'] } },
        { name: 'listar_aulas', description: 'Lista as aulas de um aluno num período (datas AAAA-MM-DD).', parameters: { type: 'OBJECT', properties: { aluno_id: { type: 'INTEGER' }, data_inicio: { type: 'STRING' }, data_fim: { type: 'STRING' } }, required: ['aluno_id'] } },
        { name: 'listar_professores', description: 'Lista os professores ativos com seus ids.', parameters: { type: 'OBJECT', properties: {} } },
        { name: 'resumo_financeiro_hoje', description: 'Totais de inadimplência e vencimentos da semana.', parameters: { type: 'OBJECT', properties: {} } },
        { name: 'dar_baixa_pagamento', description: 'Marca um pagamento como pago (precisa de confirmação do administrador).', parameters: { type: 'OBJECT', properties: { pagamento_id: { type: 'INTEGER' }, metodo_pagamento: { type: 'STRING', enum: ['pix', 'dinheiro', 'cartao', 'transferencia'] } }, required: ['pagamento_id'] } },
        { name: 'reagendar_aula', description: 'Muda a data/horário de UMA aula específica (precisa de confirmação).', parameters: { type: 'OBJECT', properties: { aula_id: { type: 'INTEGER' }, nova_data: { type: 'STRING', description: 'AAAA-MM-DD' }, novo_horario: { type: 'STRING', description: 'HH:MM' } }, required: ['aula_id', 'nova_data'] } },
        { name: 'alterar_horario_fixo_aluno', description: 'Muda o dia da semana/horário/professor fixo do aluno e ajusta as aulas futuras (precisa de confirmação). dia_semana: 0=domingo ... 6=sábado.', parameters: { type: 'OBJECT', properties: { aluno_id: { type: 'INTEGER' }, dia_semana: { type: 'INTEGER' }, horario: { type: 'STRING', description: 'HH:MM' }, professor_id: { type: 'INTEGER' } }, required: ['aluno_id'] } },
        { name: 'enviar_email', description: 'Envia um e-mail da escola para um aluno ou professor cadastrado (precisa de confirmação).', parameters: { type: 'OBJECT', properties: { destinatario: { type: 'STRING', description: 'e-mail cadastrado' }, assunto: { type: 'STRING' }, mensagem: { type: 'STRING' } }, required: ['destinatario', 'assunto', 'mensagem'] } }
    ];

    app.get('/api/assistente/status', requireAdmin, async (req, res) => {
        res.json({ configurado: Boolean(await getGeminiKey()), modelo: GEMINI_MODEL });
    });

    app.post('/api/assistente/config', requireAdmin, async (req, res) => {
        try {
            const chave = String(req.body?.apiKey || '').trim();
            if (!chave.startsWith('AIza') || chave.length < 30) return res.status(400).json({ error: 'Chave inválida. Ela começa com "AIza".' });
            await setConfigValue('GEMINI_API_KEY', encryptSecret(chave));
            res.json({ success: true });
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.post('/api/assistente/chat', requireAdmin, async (req: any, res) => {
        try {
            const apiKey = await getGeminiKey();
            if (!apiKey) return res.status(400).json({ error: 'Cadastre a chave gratuita do Gemini para usar o assistente.' });

            const historico = (Array.isArray(req.body?.mensagens) ? req.body.mensagens : []).slice(-12);
            const contents: any[] = historico.map((m: any) => ({ role: m.role === 'model' ? 'model' : 'user', parts: [{ text: String(m.texto || '').substring(0, 4000) }] }));
            if (contents.length === 0) return res.status(400).json({ error: 'Envie uma mensagem.' });

            const hoje = getDateBR();
            const systemInstruction = {
                parts: [{ text: `Você é o assistente do Studio Acorde, escola de música em Cuiabá-MT. Hoje é ${hoje.split('-').reverse().join('/')} (${DIAS_SEMANA[parseDateOnly(hoje).getUTCDay()]}). Responda sempre em português do Brasil, de forma curta e direta.
Regras:
- Use as ferramentas de consulta para descobrir ids; nunca invente ids, valores ou datas.
- Se houver mais de um aluno com o nome, pergunte qual é antes de propor ações.
- Ações que alteram dados (baixa, reagendamento, troca de horário, e-mail) NÃO são executadas por você: ao chamar essas ferramentas, você só as PROPÕE e o administrador confirma num botão. Diga isso ao usuário em uma frase.
- Não peça nem mostre CPF, endereço ou senhas.` }]
            };

            const acoesPendentes: any[] = [];
            let textoFinal = '';
            for (let rodada = 0; rodada < 6; rodada++) {
                const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                    body: JSON.stringify({ systemInstruction, contents, tools: [{ functionDeclarations: declaracoesFerramentas }], generationConfig: { temperature: 0.2 } })
                });
                const data: any = await r.json().catch(() => ({}));
                if (!r.ok) {
                    const msg = data?.error?.message || `Erro ${r.status}`;
                    return res.status(502).json({ error: r.status === 429 ? 'Limite gratuito do Gemini atingido por agora. Tente de novo em alguns minutos.' : `Gemini: ${msg}` });
                }
                const content = data?.candidates?.[0]?.content;
                const parts: any[] = content?.parts || [];
                const chamadas = parts.filter((p: any) => p.functionCall);
                textoFinal = parts.filter((p: any) => p.text && !p.thought).map((p: any) => p.text).join('\n').trim() || textoFinal;
                if (chamadas.length === 0) break;

                contents.push(content); // mantém a resposta do modelo como veio (inclui assinaturas de raciocínio)
                const respostas: any[] = [];
                for (const c of chamadas) {
                    const { name, args } = c.functionCall;
                    let resultado: any;
                    try {
                        if (ferramentasLeitura[name]) {
                            resultado = { resultado: await ferramentasLeitura[name](args || {}) };
                        } else if (descreverAcao[name]) {
                            const descricao = await descreverAcao[name](args || {});
                            const token = jwt.sign({ purpose: 'acao_assistente', tipo: name, args: args || {}, uid: req.user.id }, JWT_SECRET, { expiresIn: '15m' });
                            acoesPendentes.push({ tipo: name, descricao, token });
                            resultado = { status: 'aguardando confirmação do administrador no painel', descricao };
                        } else {
                            resultado = { erro: 'Ferramenta desconhecida' };
                        }
                    } catch (e: any) {
                        resultado = { erro: e.message };
                    }
                    respostas.push({ functionResponse: { name, response: resultado } });
                }
                contents.push({ role: 'user', parts: respostas });
            }

            res.json({ resposta: textoFinal || (acoesPendentes.length ? 'Preparei a ação abaixo. Confira e confirme.' : 'Não consegui entender. Pode reformular?'), acoes: acoesPendentes });
        } catch (error: any) {
            console.error('[ASSISTENTE]', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Executa uma ação proposta pelo assistente, reaproveitando as mesmas rotas (e validações) do sistema
    app.post('/api/assistente/executar', requireAdmin, async (req: any, res) => {
        try {
            let acao: any;
            try {
                acao = jwt.verify(String(req.body?.token || ''), JWT_SECRET);
            } catch {
                return res.status(400).json({ error: 'Ação expirada. Peça de novo ao assistente.' });
            }
            if (acao?.purpose !== 'acao_assistente' || String(acao.uid) !== String(req.user.id)) {
                return res.status(403).json({ error: 'Ação inválida.' });
            }
            const base = getRedirectUri(req).replace('/api/drive/oauth/callback', '');
            const chamar = async (method: string, path: string, body: any) => {
                const r = await fetch(`${base}${path}`, {
                    method,
                    headers: { 'Content-Type': 'application/json', Authorization: String(req.headers['authorization'] || '') },
                    body: JSON.stringify(body)
                });
                const j: any = await r.json().catch(() => ({}));
                if (!r.ok) throw new Error(j.error || `Erro ${r.status}`);
                return j;
            };
            const a = acao.args || {};
            let resultado: any;
            switch (acao.tipo) {
                case 'dar_baixa_pagamento':
                    resultado = await chamar('PATCH', `/api/pagamentos/${Number(a.pagamento_id)}/baixa`, { metodo_pagamento: a.metodo_pagamento || 'pix' });
                    break;
                case 'reagendar_aula': {
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(a.nova_data))) throw new Error('Data inválida.');
                    const { data: aula } = await supabase.from('aulas').select('horario').eq('id', Number(a.aula_id)).maybeSingle();
                    if (!aula) throw new Error('Aula não encontrada.');
                    resultado = await chamar('PATCH', `/api/agenda/reg-${Number(a.aula_id)}`, { data: a.nova_data, horario: a.novo_horario || aula.horario });
                    break;
                }
                case 'alterar_horario_fixo_aluno': {
                    const body: any = {};
                    if (a.dia_semana !== undefined && a.dia_semana !== null) body.dia_semana = Number(a.dia_semana);
                    if (a.horario) body.horario = String(a.horario);
                    if (a.professor_id) body.professor_id = Number(a.professor_id);
                    if (Object.keys(body).length === 0) throw new Error('Nada para alterar.');
                    resultado = await chamar('PATCH', `/api/alunos/${Number(a.aluno_id)}`, body);
                    break;
                }
                case 'enviar_email': {
                    // Só para e-mails cadastrados no sistema (alunos, professores ou a direção)
                    const dest = String(a.destinatario || '').trim();
                    const { data: al } = await supabase.from('alunos').select('id').ilike('email', escapeLike(dest)).limit(1);
                    const { data: pr } = await supabase.from('professores').select('id').ilike('email', escapeLike(dest)).limit(1);
                    if (!(al?.length || pr?.length || dest.toLowerCase() === EMAIL_AVISOS_DONO)) throw new Error('Só é possível enviar para e-mails cadastrados no sistema.');
                    const ok = await enviarEmailAviso(String(a.assunto || 'Aviso do Studio Acorde'), String(a.mensagem || ''), dest);
                    if (!ok) throw new Error('Falha ao enviar o e-mail.');
                    resultado = { enviado: true };
                    break;
                }
                default:
                    throw new Error('Tipo de ação desconhecido.');
            }
            console.log('[ASSISTENTE] Ação executada:', acao.tipo, JSON.stringify(a), 'por', req.user.email);
            res.json({ success: true, resultado });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    });

    // --- RECOMPENSA POR ATIVAR NOTIFICAÇÕES (500 XP, uma única vez) ---
    app.post('/api/alunos/recompensa-push', async (req: any, res) => {
        try {
            const alunoId = await getAlunoIdDoUsuario(req);
            if (!alunoId) return res.status(404).json({ error: 'Aluno não encontrado' });

            const { data: aluno } = await supabase.from('alunos').select('id, nome, xp, push_recompensado').eq('id', alunoId).single();
            if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado' });

            if (aluno.push_recompensado) {
                await supabase.from('alunos').update({ push_ativo: true }).eq('id', alunoId);
                return res.json({ success: true, xpGanho: 0 });
            }

            const XP_PUSH = 500;
            const { data: atualizado, error } = await supabase.from('alunos')
                .update({ push_ativo: true, push_recompensado: true, xp: (Number(aluno.xp) || 0) + XP_PUSH })
                .eq('id', alunoId)
                .or('push_recompensado.is.null,push_recompensado.eq.false')
                .select('id');
            if (error) throw error;

            const ganhou = Boolean(atualizado && atualizado.length > 0);
            if (ganhou) {
                await recordPontos(alunoId, 'bonus', 'Ativou notificações', XP_PUSH);
                await addToFeed(alunoId, 'bonus', `${aluno.nome} ativou as notificações e ganhou +${XP_PUSH} XP! 🔔`, '🔔');
            }
            res.json({ success: true, xpGanho: ganhou ? XP_PUSH : 0 });
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    // 4. Temporada Atual
    app.get('/api/temporada-atual', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('temporadas')
                .select('*')
                .eq('status', 'ativa')
                .maybeSingle();
            if (error && error.code !== 'PGRST116' && error.code !== '42P01') console.error(error);
            
            res.json(data || {
                id: 3,
                nome: 'TEMPORADA 3',
                data_inicio: '2026-08-22T00:00:00-04:00',
                data_fim: '2026-09-22T23:59:59-04:00',
                status: 'ativa'
            });
        } catch(error) {
            res.json({
                id: 3,
                nome: 'TEMPORADA 3',
                data_inicio: '2026-08-22T00:00:00-04:00',
                data_fim: '2026-09-22T23:59:59-04:00',
                status: 'ativa'
            });
        }
    });

    // MURAL DA VERGONHA
    app.get('/api/mural', requireAdmin, async (req: any, res) => {
        try {
            const { data, error } = await supabase
                .from('mural_vergonha')
                .select('id, aluno_id, nome_cliente, valor_divida, tipo_divida, created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;
            res.json(data);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/mural', requireAdmin, async (req: any, res) => {
        try {
            const { aluno_id, nome_cliente, valor_divida, tipo_divida } = req.body;
            if (!nome_cliente || valor_divida === undefined || !tipo_divida) {
                return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
            }

            const { error } = await supabase.from('mural_vergonha').insert([{
                aluno_id: aluno_id || null,
                nome_cliente,
                valor_divida,
                tipo_divida
            }]);

            if (error) throw error;
            res.json({ success: true });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.delete('/api/mural/:id', requireAdmin, async (req: any, res) => {
        try {
            const { id } = req.params;
            const { error } = await supabase.from('mural_vergonha').delete().eq('id', id);
            if (error) throw error;
            res.json({ success: true });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // Serve static files from public folder
    app.use(express.static(join(ROOT_DIR, 'public')));

    // Vite Integration for local development
    if (process.env.NODE_ENV !== 'production' && !isVercel) {
        try {
            const { createServer: createViteServer } = await import('vite');
            const vite = await createViteServer({
                server: { middlewareMode: true },
                appType: 'spa',
            });
            app.use(vite.middlewares);
        } catch (e) {
            console.error('Failed to start Vite middleware', e);
        }
    } else if (!isVercel) {
        const distPath = path.join(ROOT_DIR, 'dist');
        if (fs.existsSync(distPath)) {
            app.use(express.static(distPath));
            app.get('*', (req, res) => {
                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
                res.sendFile(path.join(distPath, 'index.html'));
            });
        }
    }

    // Error Handler Global
    app.use((err: any, req: any, res: any, next: any) => {
        console.error('[GLOBAL_ERROR]', err);
        res.status(500).json({ error: 'Erro Interno do Servidor (Global Handler)' });
    });

    return app;
}

let cachedApp: any = null;

// Start the server if not running in a Serverless environment (like Vercel)
if (!isVercel) {
    startServer().then((app) => {
        const port = process.env.PORT || 3000;
        

        app.listen(port, () => {
            console.log(`Server running at http://0.0.0.0:${port}`);
        });
    }).catch(err => console.error('Local server startup failed:', err));
}

// Export a handler for Vercel Serverless Functions
export default async function handler(req: any, res: any) {
    try {
        if (!cachedApp) {
            console.log('Initializing app for the first time...');
            cachedApp = await startServer();
        }
        return cachedApp(req, res);
    } catch (error: any) {
        console.error('CRITICAL INITIALIZATION ERROR:', error);
        res.status(500).json({ 
            error: 'Erro crítico na inicialização do servidor',
            message: error.message,
            stack: error.stack
        });
    }
}

