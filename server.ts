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
import { GoogleAuth } from 'google-auth-library';
import rateLimit from 'express-rate-limit';

function getDateBR() {
    return new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');
}

// pdf-parse é importado dinamicamente para evitar crash no módulo

const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;

if (!isVercel) {
  dotenv.config();
}

const JWT_SECRET = process.env.JWT_SECRET || 'studio-acorde-secret-key-2024';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Setup multer for local uploads
const uploadDir = isVercel ? '/tmp/uploads' : join(__dirname, 'public', 'uploads');
try {
  if (!isVercel && !fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (e) {
  console.warn('Could not create upload dir:', e);
}
const upload = multer({ dest: uploadDir });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL ERROR: Supabase credentials are missing!');
}

const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder', {
  global: {
    headers: {
      'x-backend-secret': 'studio-acorde-secret-key-2024'
    }
  }
});

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
    
    const publicRoutes = ['/api/ping', '/api/auth/login', '/api/auth/register', '/api/auth/check-student', '/api/auth/setup-password', '/api/vagas', '/api/sistema/versao'];
    const isPublicContrato = req.path.match(/^\/api\/contratos\/[^/]+$/) && req.method === 'GET' && !req.headers.authorization;
    if (publicRoutes.includes(req.path) || isPublicContrato) return next();
    
    // A gamificação/upload pode precisar de token também
    // O import-pdf é protected

    if (token == null) return res.status(401).json({ error: 'Acesso negado: Token não fornecido.' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.status(403).json({ error: 'Acesso negado: Token inválido ou expirado.' });
        req.user = user;
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

    app.use(cors());
    app.use(express.json());

    // Middleware to log requests
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.url}`);
        next();
    });


    // --- SEGURANÇA ---
    app.use(authenticateToken);

    // --- API ROUTES ---
    // --- CONTRATOS ---
    app.get('/api/contratos/template', async (req, res) => {
        try {
            const { data, error } = await supabase.from('contrato_templates').select('*').limit(1).single();
            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is not found
            res.json(data || { clausulas: [] });
        } catch (error: any) {
            console.error('Erro get template:', error);
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/contratos/template', async (req, res) => {
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

    app.post('/api/contratos/enviar', async (req, res) => {
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

            // 2. Enviar email usando nodemailer
            const { data: configs } = await supabase.from('configuracoes').select('*');
            let smtpEmail = configs?.find((c: any) => c.chave === 'SMTP_EMAIL')?.valor || process.env.SMTP_EMAIL;
            let smtpPass = configs?.find((c: any) => c.chave === 'SMTP_PASS')?.valor || process.env.SMTP_PASS;

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
            if (!assinatura_base64) return res.status(400).json({ error: 'Assinatura inválida' });

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
            const versionPath = path.join(process.cwd(), 'version.json');
            if (fs.existsSync(versionPath)) {
                const data = fs.readFileSync(versionPath, 'utf8');
                res.json(JSON.parse(data));
            } else {
                res.json({ versao: 'SYNC_V4.3.1', changelog: '' });
            }
        } catch(e) {
            res.json({ versao: 'SYNC_V4.3.1', changelog: '' });
        }
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

            const { data: user, error } = await supabase.from('usuarios').select('*').eq('email', email).single();
            
            if (error || !user || !bcrypt.compareSync(effectivePassword, user.senha)) {
                return res.status(401).json({ message: 'Credenciais inválidas' });
            }

            const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
            res.json({ token, user: { id: user.id, nome: user.nome, email: user.email, role: user.role } });
        } catch (error) { res.status(500).json({ error: 'Erro no login' }); }
    });

    app.get('/api/auth/check-student', async (req, res) => {
        try {
            const { email } = req.query;
            if (!email) return res.status(400).json({ error: 'Email não fornecido' });
            
            const cleanEmail = String(email).trim();

            const { data: aluno } = await supabase.from('alunos').select('id, nome').ilike('email', cleanEmail).single();
            if (!aluno) return res.json({ exists: false });

            const { data: usuario } = await supabase.from('usuarios').select('id').ilike('email', cleanEmail).single();
            
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

            const { data: aluno } = await supabase.from('alunos').select('id, nome').eq('email', email).single();
            if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado' });

            const hashed = bcrypt.hashSync(senha, 10);
            const { data: newUser, error: errU } = await supabase.from('usuarios').insert([{
                nome: aluno.nome,
                email,
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

            // Verificar se o email já existe
            const { data: existingUsers, error: checkError } = await supabase.from('usuarios').select('id').eq('email', email);
            if (checkError) throw checkError;
            if (existingUsers && existingUsers.length > 0) return res.status(400).json({ error: 'Email já cadastrado.' });

            // Hash da senha
            const salt = bcrypt.genSaltSync(10);
            const hashedPassword = bcrypt.hashSync(effectivePassword, salt);

            // Inserir novo usuário
            const { data: user, error } = await supabase.from('usuarios').insert([{
                nome,
                email,
                senha: hashedPassword,
                role: 'aluno' // Cadastro público agora define 'aluno' como padrão
            }]).select().single();

            if (error) throw error;

            const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
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

            const { data: existingUsers } = await supabase.from('usuarios').select('id').eq('email', email);
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
            const { instrumento, dia_semana } = req.query;
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
                .select('*, matriculas(*, cursos(nome))')
                .ilike('email', req.user.email)
                .single();
            
            if (error || !aluno) {
                console.error('Aluno não encontrado para email:', req.user.email);
                return res.status(404).json({ error: 'Aluno não encontrado' });
            }

            // 2. Calcular Ranking e XP real (baseado em conquistas)
            const { data: allAlunos } = await supabase.from('alunos').select('id, xp');
            const progresso = await fetchAllGamificacaoProgresso(supabase);
            const meuProgresso = progresso.filter((p: any) => p.aluno_id === aluno.id);
            
            const rankingList = (allAlunos || []).map(al => {
                const prog = progresso?.filter(p => p.aluno_id === al.id) || [];
                const xpCalculado = prog.reduce((acc, p) => acc + (p.conquista?.pontos || 0), 0);
                // O XP total é a soma do XP base + conquistas
                return { id: al.id, xp: (al.xp || 0) + xpCalculado };
            }).sort((a, b) => b.xp - a.xp);

            // Re-calculate my exact XP using meuProgresso to ensure accuracy even if general progresso is truncated
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
                .ilike('email', searchEmail)
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
                    .ilike('titulo', 'Primeira Foto de Perfil')
                    .maybeSingle();

                if (!conquista) {
                    // Criar conquista de Primeira Foto de Perfil
                    const { data: novaConquista, error: createErr } = await supabase
                        .from('gamificacao_conquistas')
                        .insert([{
                            titulo: 'Primeira Foto de Perfil',
                            descricao: 'Subiu sua primeira foto de perfil no Studio Master!',
                            pontos: 150,
                            icone: '📸'
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
    app.get('/api/gamificacao/config-dobro', async (req: any, res) => {
        res.json({ success: true, doublePointsGame: (global as any).doublePointsGame || null });
    });

    // Endpoint unificado para Adicionar Acorde Coins (XP) após jogar um jogo
    app.post('/api/gamificacao/add-xp', async (req: any, res) => {
        try {
            const email = req.user?.email;
            if (!email) return res.status(401).json({ error: 'Não autorizado' });

            const { pontos, jogo } = req.body;
            if (!pontos) return res.status(400).json({ error: 'Pontos não informados' });

            const { data: aluno } = await supabase.from('alunos').select('id, nome, xp, acorde_coins').eq('email', email).single();
            if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado' });

            let finalPontos = Number(pontos);
            if ((global as any).doublePointsGame === jogo) {
                finalPontos *= 2;
            }

            // Verificar no system_config se jogos dão XP (God Mode Config)
            const { data: configXp } = await supabase
                .from('system_config')
                .select('key_value')
                .eq('key_name', 'JOGOS_DAO_XP')
                .maybeSingle();

            const jogosDaoXp = configXp?.key_value === 'true';

            const novoXp = jogosDaoXp ? ((Number(aluno.xp) || 0) + finalPontos) : (Number(aluno.xp) || 0);
            const novasMoedas = (Number(aluno.acorde_coins) || 0) + finalPontos;
            
            await supabase.from('alunos').update({ xp: novoXp, acorde_coins: novasMoedas }).eq('id', aluno.id);

            // Adiciona no feed
            const jogoNomeFormatado = jogo ? jogo.replace(/-/g, ' ').toUpperCase() : 'UM JOGO';
            const feedMsg = jogosDaoXp 
                ? `${aluno.nome} acabou de jogar ${jogoNomeFormatado} e ganhou +${finalPontos} XP! 🎮`
                : `${aluno.nome} acabou de jogar ${jogoNomeFormatado} e ganhou +${finalPontos} Coins! 🎮`;
            await addToFeed(aluno.id, 'jogo', feedMsg, '🎮');

            res.json({ success: true, novoXp, novasMoedas, finalPontos, jogosDaoXp });
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
            if (!preco) return res.status(400).json({ error: 'Preço não informado' });

            const { data: aluno } = await supabase.from('alunos').select('id, acorde_coins, avatar_inventory').eq('email', email).single();
            if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado' });

            const precoNum = Number(preco);
            if ((Number(aluno.acorde_coins) || 0) < precoNum) {
                return res.status(400).json({ error: 'Acorde Coins insuficientes' });
            }

            const novasMoedas = (Number(aluno.acorde_coins) || 0) - precoNum;
            const currentInventory = Array.isArray(aluno.avatar_inventory) ? aluno.avatar_inventory : [];
            const newInventory = item_id && !currentInventory.includes(item_id) ? [...currentInventory, item_id] : currentInventory;

            await supabase.from('alunos')
                .update({ acorde_coins: novasMoedas, avatar_inventory: newInventory })
                .eq('id', aluno.id);

            res.json({ success: true, novasMoedas, inventory: newInventory });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });


    app.post('/api/gamificacao/resgatar-pontos', async (req: any, res) => {
        try {
            const { pontos, jogo } = req.body;
            if (!pontos || Number(pontos) <= 0) {
                return res.status(400).json({ error: 'Quantidade de pontos inválida.' });
            }

            const email = (req.user?.email || '').toLowerCase().trim();
            const searchEmail = (email === 'aquilles1213@gmail.com') ? 'teste@teste.com' : email;

            // 1. Buscar o aluno logado
            const { data: aluno, error } = await supabase
                .from('alunos')
                .select('*')
                .ilike('email', searchEmail)
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

    app.post('/api/upload', upload.single('file'), async (req: any, res) => {
        if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        try {
            const ext = path.extname(req.file.originalname) || '';
            const filename = `guias/${Date.now()}_${req.file.filename}${ext}`;
            const fileBuffer = fs.readFileSync(req.file.path);
            const mimeType = req.file.mimetype || 'application/octet-stream';

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(filename, fileBuffer, { contentType: mimeType, upsert: true });

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filename);
            res.json({ url: publicUrlData.publicUrl });
        } catch (error: any) {
            console.error('Erro no upload genérico:', error);
            res.status(500).json({ error: error.message || 'Erro ao fazer upload' });
        }
    });

    app.get('/api/alunos/:id', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('alunos')
                .select('*, matriculas(*, cursos(nome)), contratos(id)')
                .eq('id', req.params.id)
                .single();
            if (error) throw error;
            res.json(data);
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.get('/api/alunos/:id/ultima-aula', async (req, res) => {
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




    app.get('/api/alunos/:id/materiais', async (req, res) => {
        const { id } = req.params;
        const { data, error } = await supabase.from('materiais').select('*').eq('aluno_id', id).order('created_at', { ascending: false });
        if (error) return res.status(500).json({ error: error.message });
        res.json(data);
    });

    app.post('/api/alunos/:id/materiais', async (req, res) => {
        const { id } = req.params;
        const { titulo, url, tipo } = req.body;
        const { data, error } = await supabase.from('materiais').insert([{ aluno_id: id, titulo, url, tipo }]).select().single();
        if (error) return res.status(500).json({ error: error.message });
        res.json(data);
    });

    app.delete('/api/materiais/:id', async (req, res) => {
        const { id } = req.params;
        const { error } = await supabase.from('materiais').delete().eq('id', id);
        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true });
    });

    app.get('/api/alunos/:id/agenda', async (req, res) => {
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

    app.get('/api/alunos/:id/financeiro', async (req, res) => {
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
                    .single();

                if (matricula) {
                    const pagamentosToInsert = [];
                    let currentVencimento = new Date(matricula.data_primeira_parcela || matricula.data_inicio || new Date());
                    
                    for (let i = 0; i < (matricula.total_parcelas || 1); i++) {
                        pagamentosToInsert.push({
                            aluno_id: id,
                            matricula_id: matricula.id,
                            valor: matricula.valor_parcela,
                            data_vencimento: currentVencimento.toISOString().split('T')[0],
                            status: 'pendente',
                            tipo_receita: 'mensalidade',
                            referencia_mes_ano: `${(currentVencimento.getMonth() + 1).toString().padStart(2, '0')}/${currentVencimento.getFullYear()}`
                        });
                        
                        currentVencimento.setMonth(currentVencimento.getMonth() + 1);
                        currentVencimento.setDate(matricula.dia_vencimento || 10);
                    }

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
                responsavel_nome, responsavel_telefone, 
                curso_id, dia_semana, horario,
                valor_parcela, valor_com_desconto, dia_vencimento
            } = req.body;
            
            console.log(`[ALUNO_UPDATE] ID: ${studentId}`, { nome, curso_id, dia_semana, horario });

            // 1. Atualizar Aluno (campos básicos)
            const { error: aluError } = await supabase.from('alunos')
                .update({ 
                    nome, email, telefone, cpf, endereco, 
                    responsavel_nome, responsavel_telefone 
                })
                .eq('id', studentId);
            
            if (aluError) {
                console.error('[ALUNO_UPDATE_ERROR]:', aluError);
                return res.status(500).json({ error: aluError.message, stage: 'aluno' });
            }

            // 2. Atualizar Curso e Dia/Horário na Matrícula
            const matUpdate: any = {};
            if (curso_id && !isNaN(Number(curso_id))) matUpdate.curso_id = Number(curso_id);
            if (dia_semana !== undefined && dia_semana !== '' && !isNaN(Number(dia_semana))) matUpdate.dia_semana = Number(dia_semana);
            if (horario !== undefined && horario !== '') matUpdate.horario = horario;
            if (valor_parcela !== undefined && valor_parcela !== '') matUpdate.valor_parcela = Number(valor_parcela);
            if (valor_com_desconto !== undefined && valor_com_desconto !== '') matUpdate.valor_com_desconto = Number(valor_com_desconto);
            if (dia_vencimento !== undefined && dia_vencimento !== '') matUpdate.dia_vencimento = Number(dia_vencimento);

            console.log(`[MATRICULA_UPDATE] Aluno ${studentId}, payload:`, matUpdate);

            if (Object.keys(matUpdate).length > 0) {
                // PASSO 1: Buscar a matrícula ativa (ou qualquer matrícula) do aluno via SELECT
                let matriculaId: string | null = null;
                
                // Tenta primeiro matrículas com status 'ativa'
                const { data: matAtiva } = await supabase
                    .from('matriculas')
                    .select('id')
                    .eq('aluno_id', studentId)
                    .eq('status', 'ativa')
                    .order('id', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (matAtiva) {
                    matriculaId = matAtiva.id;
                    console.log(`[MATRICULA_UPDATE] Matrícula ativa encontrada: id=${matriculaId}`);
                } else {
                    // Fallback: qualquer matrícula do aluno (a mais recente)
                    const { data: matQualquer } = await supabase
                        .from('matriculas')
                        .select('id')
                        .eq('aluno_id', studentId)
                        .order('id', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (matQualquer) {
                        matriculaId = matQualquer.id;
                        console.log(`[MATRICULA_UPDATE] Fallback - usando matrícula id=${matriculaId}`);
                    }
                }

                // PASSO 2: Atualizar por ID (funciona corretamente no Supabase)
                if (matriculaId) {
                    const { error: matError } = await supabase
                        .from('matriculas')
                        .update(matUpdate)
                        .eq('id', matriculaId);

                    if (matError) {
                        console.error('[MATRICULA_UPDATE_ERROR]:', matError);
                        return res.status(500).json({ error: matError.message, stage: 'matricula' });
                    }
                    console.log(`[MATRICULA_UPDATE] Sucesso! Matrícula ${matriculaId} atualizada com:`, matUpdate);

                    // Atualizar pagamentos pendentes
                    if (matUpdate.valor_parcela !== undefined || matUpdate.dia_vencimento !== undefined) {
                        const { data: pendentes } = await supabase
                            .from('pagamentos')
                            .select('id, data_vencimento')
                            .eq('aluno_id', studentId)
                            .eq('status', 'pendente')
                            .eq('tipo_receita', 'mensalidade');

                        if (pendentes && pendentes.length > 0) {
                            for (const pg of pendentes) {
                                const updatePg: any = {};
                                if (matUpdate.valor_parcela !== undefined) updatePg.valor = matUpdate.valor_parcela;
                                if (matUpdate.dia_vencimento !== undefined && pg.data_vencimento) {
                                    const parts = pg.data_vencimento.split('-');
                                    if (parts.length === 3) {
                                        parts[2] = matUpdate.dia_vencimento.toString().padStart(2, '0');
                                        updatePg.data_vencimento = parts.join('-');
                                    }
                                }
                                await supabase.from('pagamentos').update(updatePg).eq('id', pg.id);
                            }
                            console.log('[PAGAMENTOS_UPDATE] Pagamentos pendentes atualizados.');
                        }
                    }

                    // PASSO 3: Reagendar Aulas Pendentes se o dia ou horário mudou
                    if (matUpdate.dia_semana !== undefined || matUpdate.horario !== undefined) {
                        const hoje = getDateBR();
                        const { data: aulasFuturas } = await supabase.from('aulas')
                            .select('id, data')
                            .eq('matricula_id', matriculaId)
                            .eq('status', 'pendente')
                            .gte('data', hoje);
                            
                        if (aulasFuturas && aulasFuturas.length > 0) {
                            console.log(`[MATRICULA_UPDATE] Reagendando ${aulasFuturas.length} aulas pendentes na agenda...`);
                            
                            // Ordenar as aulas pendentes da mais próxima para a mais distante
                            const aulasOrdenadas = aulasFuturas.sort((a: any, b: any) => new Date(a.data).getTime() - new Date(b.data).getTime());
                            
                            // Achar a próxima data real possível para o novo dia da semana a partir de amanhã
                            let currentNextDay = new Date();
                            currentNextDay.setHours(12, 0, 0, 0);
                            
                            if (matUpdate.dia_semana !== undefined) {
                                while (currentNextDay.getDay() !== Number(matUpdate.dia_semana)) {
                                    currentNextDay.setDate(currentNextDay.getDate() + 1);
                                }
                            }

                            for (let i = 0; i < aulasOrdenadas.length; i++) {
                                const af = aulasOrdenadas[i];
                                const payload: any = {};
                                if (matUpdate.horario) payload.horario = matUpdate.horario;
                                
                                if (matUpdate.dia_semana !== undefined) {
                                    payload.data = currentNextDay.toISOString().split('T')[0];
                                    currentNextDay.setDate(currentNextDay.getDate() + 7);
                                }
                                
                                await supabase.from('aulas').update(payload).eq('id', af.id);
                            }
                        }
                    }
                } else {
                    console.warn(`[MATRICULA_UPDATE] Nenhuma matrícula encontrada para aluno ${studentId}`);
                }

                // PASSO 3: Reagendar aulas futuras pendentes se o dia da semana mudou
                if (matUpdate.dia_semana !== undefined) {
                    const hoje = getDateBR();
                    const { data: aulasFuturas } = await supabase.from('aulas')
                        .select('id, data')
                        .eq('aluno_id', studentId)
                        .eq('status', 'pendente')
                        .gte('data', hoje);

                    if (aulasFuturas && aulasFuturas.length > 0) {
                        const novoDia = Number(matUpdate.dia_semana);
                        for (const aula of aulasFuturas) {
                            const dataAtual = new Date(aula.data + 'T12:00:00');
                            const diaAtual = dataAtual.getDay();
                            
                            const updateAula: any = {};
                            
                            let diff = novoDia - diaAtual;
                            if (diff !== 0) {
                                // Move a aula para o novo dia dentro da mesma semana
                                const novaData = new Date(dataAtual);
                                novaData.setDate(novaData.getDate() + diff);
                                updateAula.data = novaData.toISOString().split('T')[0];
                            }

                            if (matUpdate.horario) updateAula.horario = matUpdate.horario;
                            
                            if (Object.keys(updateAula).length > 0) {
                                await supabase.from('aulas').update(updateAula).eq('id', aula.id);
                            }
                        }
                        console.log(`[REAGENDAMENTO] ${aulasFuturas.length} aulas futuras reagendadas/atualizadas para dia ${matUpdate.dia_semana}.`);
                    }
                } else if (matUpdate.horario) {
                    // Só mudou o horário, manter os dias das aulas
                    const hoje = getDateBR();
                    await supabase.from('aulas')
                        .update({ horario: matUpdate.horario })
                        .eq('aluno_id', studentId)
                        .eq('status', 'pendente')
                        .gte('data', hoje);
                    console.log(`[HORARIO_UPDATE] Horário atualizado para aulas futuras do aluno ${studentId}.`);
                }
            }

            res.json({ success: true });
        } catch (error: any) {
            console.error('[FATAL_ALUNO_UPDATE]:', error);
            res.status(500).json({ error: error.message, stack: error.stack });
        }
    });

    app.delete('/api/cursos/:id', async (req, res) => {
        try {
            const { error } = await supabase.from('cursos').delete().eq('id', req.params.id);
            if (error) throw error;
            res.json({ success: true });
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.get('/api/aulas', async (req: any, res) => {
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

    app.post('/api/aulas', async (req: any, res) => {
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
                    .ilike('email', req.user.email)
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

    app.patch('/api/aulas/:id/status', async (req, res) => {
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

    app.get('/api/dashboard/stats', async (req, res) => {
        try {
            const today = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');
            const now = new Date();
            const mesAtual = `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;

            const { count: totalAlunos } = await supabase.from('alunos').select('*', { count: 'exact', head: true }).eq('status', 'ativo');
            
            // Contar aulas regulares + experimentais de hoje
            const { count: aulasRegHoje } = await supabase.from('aulas').select('*', { count: 'exact', head: true }).eq('data', today);
            const { count: aulasExpHoje } = await supabase.from('aulas_experimentais').select('*', { count: 'exact', head: true }).eq('data', today);
            const aulasHoje = (aulasRegHoje || 0) + (aulasExpHoje || 0);

            // Receita: apenas mensalidades pagas no mês atual
            const { data: pagamentosMes } = await supabase.from('pagamentos')
                .select('valor')
                .eq('status', 'pago')
                .eq('tipo_receita', 'mensalidade')
                .eq('referencia_mes_ano', mesAtual);
            const receitaMensal = pagamentosMes?.reduce((acc, curr) => acc + Number(curr.valor), 0) || 0;
            
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

            res.json({ totalAlunos: totalAlunos || 0, aulasHoje, receitaMensal, proximasAulas });
        } catch (error) { res.status(500).json({ error: 'Erro ao carregar estatísticas' }); }
    });

    // Alunos + Matrícula
    app.get('/api/alunos', async (req, res) => {
        const { status } = req.query;
        let query = supabase.from('alunos').select('*, matriculas(*, cursos(nome)), aulas(status)').order('nome');
        
        if (status === 'arquivado') {
            query = query.eq('status', 'arquivado');
        } else {
            query = query.neq('status', 'arquivado');
        }

        const { data } = await query;
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

            // 2. Criar Matrícula
            const parsedDiaSemana = dia_semana ? new Date(dia_semana) : new Date();
            const { data: matricula, error: errM } = await supabase.from('matriculas').insert([{
                aluno_id: aluno.id, 
                curso_id, 
                professor_id, 
                dia_semana: !isNaN(parsedDiaSemana.getTime()) ? parsedDiaSemana.getDay() : null,
                horario, 
                sala_id: sala_id || null, 
                pacote_id,
                data_primeira_parcela: data_primeira_parcela || null,
                dia_vencimento,
                valor_parcela,
                total_parcelas,
                data_inicio: dia_semana || null
            }]).select().single();
            if (errM) {
                await supabase.from('alunos').delete().eq('id', aluno.id);
                throw new Error(`Erro ao criar matrícula: ${errM.message || JSON.stringify(errM)}`);
            }

            // 3. Automação de Aulas (Reserva na Agenda)
            const { data: pacote } = await supabase.from('pacotes').select('*').eq('id', pacote_id).single();
            const totalAulas = pacote?.total_aulas || 1;
            
            const aulasToInsert = [];
            let currentAulaDate = new Date(dia_semana || new Date());
            if (isNaN(currentAulaDate.getTime())) currentAulaDate = new Date();
            
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

            // 4. Geração de Pagamentos (Parcelas)
            const pagamentosToInsert = [];
            let currentVencimento = new Date(data_primeira_parcela || new Date());
            if (isNaN(currentVencimento.getTime())) currentVencimento = new Date();

            for (let i = 0; i < (total_parcelas || 1); i++) {
                pagamentosToInsert.push({
                    aluno_id: aluno.id,
                    matricula_id: matricula.id,
                    valor: valor_parcela,
                    data_vencimento: currentVencimento.toISOString().split('T')[0],
                    status: 'pendente',
                    tipo_receita: 'mensalidade',
                    referencia_mes_ano: `${(currentVencimento.getMonth() + 1).toString().padStart(2, '0')}/${currentVencimento.getFullYear()}`
                });
                
                // Próximo mês
                currentVencimento.setMonth(currentVencimento.getMonth() + 1);
                // Ajustar para o dia de vencimento escolhido (caso o mês tenha menos dias, o JS cuida disso ou vira o mês)
                if (dia_vencimento) {
                    currentVencimento.setDate(parseInt(dia_vencimento, 10) || 10);
                }
            }
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
    app.get('/api/migracao/alunos', async (req, res) => {
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

    app.post('/api/migracao/batch', async (req, res) => {
        try {
            const { students } = req.body;
            const { error } = await supabase.from('migracao_alunos').insert(students);
            if (error) throw error;
            res.json({ success: true });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/alunos/migracao', async (req, res) => {
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
            const now = new Date();
            
            // Fatura do mês atual
            pagamentosToInsert.push({
                aluno_id: aluno.id,
                matricula_id: matricula.id,
                valor: valor_parcela,
                data_vencimento: new Date(now.getFullYear(), now.getMonth(), dia_vencimento || 10).toISOString().split('T')[0],
                status: fatura_mes_atraso ? 'atrasado' : 'pendente',
                tipo_receita: 'mensalidade',
                referencia_mes_ano: `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`
            });

            // Faturas pendentes
            for (let i = 1; i <= faturas_pendentes; i++) {
                const prevDate = new Date(now.getFullYear(), now.getMonth() - i, dia_vencimento || 10);
                pagamentosToInsert.push({
                    aluno_id: aluno.id,
                    matricula_id: matricula.id,
                    valor: valor_parcela,
                    data_vencimento: prevDate.toISOString().split('T')[0],
                    status: 'atrasado',
                    tipo_receita: 'mensalidade',
                    referencia_mes_ano: `${(prevDate.getMonth() + 1).toString().padStart(2, '0')}/${prevDate.getFullYear()}`
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

    app.post('/api/cursos', async (req, res) => {
        try {
            const { data, error } = await supabase.from('cursos').insert([req.body]).select().single();
            if (error) throw error;
            res.json(data);
        } catch (error) { res.status(500).json({ error: 'Erro ao salvar curso' }); }
    });

    // Materiais Salvos do Professor (Tablaturas, Melodias)
    app.get('/api/materiais-salvos', async (req: any, res) => {
        try {
            if (!req.user || req.user.role !== 'professor') return res.status(401).json({ error: 'Não autorizado' });
            const { data: prof } = await supabase.from('professores').select('id').ilike('email', req.user.email).maybeSingle();
            if (!prof) return res.status(404).json({ error: 'Professor não encontrado' });
            
            const tipo = req.query.tipo;
            let query = supabase.from('materiais_salvos').select('*').eq('professor_id', prof.id).order('created_at', { ascending: false });
            if (tipo) query = query.eq('tipo', tipo);
            
            const { data, error } = await query;
            if (error) throw error;
            res.json(data);
        } catch (error) { res.status(500).json({ error: 'Erro ao buscar materiais salvos' }); }
    });

    app.post('/api/materiais-salvos', async (req: any, res) => {
        try {
            if (!req.user || req.user.role !== 'professor') return res.status(401).json({ error: 'Não autorizado' });
            const { data: prof } = await supabase.from('professores').select('id').ilike('email', req.user.email).maybeSingle();
            if (!prof) return res.status(404).json({ error: 'Professor não encontrado' });
            
            const { tipo, titulo, conteudo } = req.body;
            if (!tipo || !titulo || !conteudo) return res.status(400).json({ error: 'Campos obrigatórios faltando' });

            const { data, error } = await supabase.from('materiais_salvos').insert([{
                professor_id: prof.id,
                tipo,
                titulo,
                conteudo
            }]).select().single();
            if (error) throw error;
            res.json(data);
        } catch (error) { res.status(500).json({ error: 'Erro ao salvar material' }); }
    });

    app.delete('/api/materiais-salvos/:id', async (req: any, res) => {
        try {
            if (!req.user || req.user.role !== 'professor') return res.status(401).json({ error: 'Não autorizado' });
            const { data: prof } = await supabase.from('professores').select('id').ilike('email', req.user.email).maybeSingle();
            if (!prof) return res.status(404).json({ error: 'Professor não encontrado' });

            // Verificar se pertence ao professor
            const { data: mat } = await supabase.from('materiais_salvos').select('professor_id').eq('id', req.params.id).maybeSingle();
            if (!mat || mat.professor_id !== prof.id) return res.status(403).json({ error: 'Sem permissão' });

            const { error } = await supabase.from('materiais_salvos').delete().eq('id', req.params.id);
            if (error) throw error;
            res.json({ success: true });
        } catch (error) { res.status(500).json({ error: 'Erro ao deletar material' }); }
    });

    // Professores
    app.get('/api/professores/me', async (req: any, res) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Não autorizado' });
            }
            const { data: prof, error } = await supabase.from('professores')
                .select('*')
                .ilike('email', req.user.email)
                .maybeSingle();
            
            if (error) throw error;
            if (!prof) {
                return res.status(404).json({ error: 'Professor não cadastrado com este e-mail' });
            }

            // Cálculo dinâmico do saldo do mês atual
            // Cálculo do histórico financeiro (últimos 6 meses)
            const now = new Date();
            const year = now.getFullYear();
            const monthStr = String(now.getMonth() + 1).padStart(2, '0');
            const currentMonthKey = `${year}-${monthStr}`;

            const sixMonthsAgo = new Date(year, now.getMonth() - 5, 1);
            const { data: todasAulas } = await supabase.from('aulas')
                .select('data')
                .eq('professor_id', prof.id)
                .in('status', ['realizada', 'falta_aluno'])
                .gte('data', sixMonthsAgo.toISOString().split('T')[0]);

            const history: Record<string, number> = {};
            for(let i=0; i<6; i++) {
                const d = new Date(year, now.getMonth() - i, 1);
                const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}`;
                history[k] = 0;
            }

            if (todasAulas) {
                todasAulas.forEach((aula: any) => {
                    const mk = aula.data.substring(0, 7);
                    if (history[mk] !== undefined) {
                        history[mk]++;
                    }
                });
            }

            const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            const historico = Object.keys(history).sort().reverse().map(k => {
                const [y, m] = k.split('-');
                return {
                    mes_ano: `${monthNames[Number(m)-1]} ${y}`,
                    aulas: history[k],
                    valor: history[k] * (Number(prof.valor_aula) || 0)
                };
            });

            prof.saldo = (history[currentMonthKey] || 0) * (Number(prof.valor_aula) || 0);
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

    app.get('/api/professores', async (req, res) => {
        const { data } = await supabase.from('professores').select('*').order('nome');
        // Filter out duplicates by nome
        const uniqueData = data ? Array.from(new Map(data.map(item => [item.nome.trim().toLowerCase(), item])).values()) : [];
        res.json(uniqueData);
    });

    app.post('/api/professores', async (req, res) => {
        try {
            const { data, error } = await supabase.from('professores').insert([req.body]).select().single();
            if (error) throw error;
            res.json(data);
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.post('/api/professores/:id/disponibilidade', async (req, res) => {
        try {
            const { disponibilidade } = req.body;
            const { data, error } = await supabase.from('professores').update({ disponibilidade }).eq('id', req.params.id).select().single();
            if (error) throw error;
            res.json(data);
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.put('/api/professores/:id', async (req, res) => {
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

    app.patch('/api/professores/:id', async (req, res) => {
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

    app.delete('/api/professores/:id', async (req, res) => {
        try {
            const profId = req.params.id;

            // 1. Buscar matrículas desse professor
            const { data: matriculas } = await supabase
                .from('matriculas').select('id').eq('professor_id', profId);

            if (matriculas && matriculas.length > 0) {
                const mIds = matriculas.map((m: any) => m.id);
                await supabase.from('pagamentos').delete().in('matricula_id', mIds);
                await supabase.from('matriculas').delete().in('id', mIds);
            }

            // 2. Excluir aulas e aulas experimentais do professor
            await supabase.from('aulas').delete().eq('professor_id', profId);
            await supabase.from('aulas_experimentais').delete().eq('professor_id', profId);

            // 3. Excluir o professor
            const { error } = await supabase.from('professores').delete().eq('id', profId);
            if (error) throw error;
            res.json({ success: true });
        } catch (error: any) { res.status(500).json({ error: error.message || 'Erro ao excluir professor' }); }
    });

    // Leads (Atendimento)
    app.get('/api/leads', async (req, res) => {
        const { data } = await supabase.from('leads').select('*, cursos(nome)').order('data_criacao', { ascending: false });
        res.json(data || []);
    });

    app.post('/api/leads', async (req, res) => {
        try {
            const { nome, telefone, interesse_curso_id, status, observacoes, origem } = req.body;
            if (!telefone) {
                return res.status(400).json({ error: 'O telefone do lead é obrigatório' });
            }
            const { data, error } = await supabase.from('leads').insert([{
                nome: nome || null,
                telefone,
                interesse_curso_id: interesse_curso_id || null,
                status: status || 'em_atendimento',
                observacoes: observacoes || null,
                origem: origem || null,
                data_atualizacao: new Date()
            }]).select().single();
            if (error) throw error;
            res.json(data);
        } catch (error: any) { res.status(500).json({ error: error.message || 'Erro ao salvar lead' }); }
    });

    app.patch('/api/leads/:id/status', async (req, res) => {
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

    app.patch('/api/leads/:id', async (req, res) => {
        try {
            const { nome, telefone, interesse_curso_id, status, observacoes, origem } = req.body;
            const { id } = req.params;
            const updateData: any = { data_atualizacao: new Date() };
            if (nome !== undefined) updateData.nome = nome || null;
            if (telefone !== undefined) {
                if (!telefone) return res.status(400).json({ error: 'O telefone é obrigatório' });
                updateData.telefone = telefone;
            }
            if (interesse_curso_id !== undefined) updateData.interesse_curso_id = interesse_curso_id || null;
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

    app.post('/api/leads/verificar-followup', async (req, res) => {
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

            const { data: configs } = await supabase.from('configuracoes').select('*');
            let smtpEmail = configs?.find((c: any) => c.chave === 'SMTP_EMAIL')?.valor || process.env.SMTP_EMAIL;
            let smtpPass = configs?.find((c: any) => c.chave === 'SMTP_PASS')?.valor || process.env.SMTP_PASS;

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
    app.post('/api/leads/experimental', async (req, res) => {
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

    app.get('/api/leads/experimentais-pendentes', async (req, res) => {
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
    app.post('/api/locacoes', async (req, res) => {
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
    app.patch('/api/pagamentos/:id/baixa', async (req, res) => {
        try {
            const { id } = req.params;
            const { metodo_pagamento } = req.body;
            const today = getDateBR();
            const { data, error } = await supabase.from('pagamentos')
                .update({ status: 'pago', data_pagamento: today, metodo_pagamento: metodo_pagamento || 'dinheiro' })
                .eq('id', id).select().single();
            if (error) throw error;
            res.json(data);
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    // Registrar cobrança enviada por WhatsApp
    app.post('/api/pagamentos/:id/registrar-cobranca', async (req, res) => {
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
    app.patch('/api/pagamentos/:id', async (req, res) => {
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
    app.delete('/api/pagamentos/:id', async (req, res) => {
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
            const now = new Date();
            const mesRef = (mes && mes !== 'undefined' && mes !== '') ? String(mes).trim() : `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
            
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
                let currentDate = new Date(data_vencimento + 'T12:00:00');
                
                for (let i = 1; i <= numParcelas; i++) {
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
                    currentDate.setMonth(currentDate.getMonth() + 1);
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

    app.patch('/api/despesas/:id/baixa', async (req, res) => {
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

    app.delete('/api/despesas/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { error } = await supabase.from('despesas').delete().eq('id', id);
            if (error) throw error;
            res.json({ success: true });
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    // Resumo financeiro do mês
    app.get('/api/financeiro/resumo', requireAdmin, async (req, res) => {
        try {
            const { mes, desconto_dia_10 } = req.query;
            const applyDiscount = desconto_dia_10 === 'true';
            const now = new Date();
            const mesRef = (mes && mes !== 'undefined' && mes !== '') ? String(mes).trim() : `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
            
            // Só somar pagamentos de alunos ativos, trazendo matrículas para considerar desconto
            const { data: rawPags, error } = await supabase.from('pagamentos')
                .select('valor, status, tipo_receita, matricula_id, aluno:aluno_id(status, matriculas(id, status, valor_com_desconto, valor_parcela))')
                .eq('referencia_mes_ano', mesRef);
            
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

                    if (p.status === 'pago') {
                        receitaMes += Number(p.valor);
                    } else {
                        pendentes += valorEfetivo;
                    }
                    faturamentoPrevisto += (p.status === 'pago' ? Number(p.valor) : valorEfetivo);
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

            const { data: aulasPrev } = await supabase.from('aulas')
                .select('professor_id, professor:professores(nome)')
                .gte('data', prevStartDate)
                .lte('data', prevEndDate)
                .in('status', ['realizada', 'falta_aluno'])
                .not('professor_id', 'is', null);
                
            let salariosPrevistos = 0;
            if (aulasPrev) {
                const aulasValidas = aulasPrev.filter(a => {
                    const profData: any = a.professor;
                    const nomeStr = Array.isArray(profData) ? (profData[0]?.nome || '') : (profData?.nome || '');
                    const nome = nomeStr.toLowerCase();
                    return !nome.includes('aquilles') && !nome.includes('áquilles');
                });
                salariosPrevistos = aulasValidas.length * 35;
            }
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

            const { data: todosProfessores, error: errProf } = await supabase.from('professores').select('id, nome');
            if (errProf) throw errProf;

            const remunByProf: Record<number, any> = {};
            (todosProfessores || []).forEach(prof => {
                remunByProf[prof.id] = {
                    professor_id: prof.id,
                    professor_nome: prof.nome,
                    total_aulas: 0,
                    valor_estimado: 0
                };
            });

            const { data: aulas, error } = await supabase.from('aulas')
                .select('professor_id, status, professor:professores(nome)')
                .gte('data', startDate)
                .lte('data', endDate)
                .in('status', ['realizada', 'falta_aluno']);

            if (error) throw error;

            (aulas || []).forEach(aula => {
                if (!aula.professor_id) return;
                
                const profData: any = aula.professor;
                const nomeStr = Array.isArray(profData) ? (profData[0]?.nome || '') : (profData?.nome || '');
                const nome = nomeStr.toLowerCase();
                
                if (nome.includes('aquilles') || nome.includes('áquilles')) return;
                
                if (remunByProf[aula.professor_id]) {
                    remunByProf[aula.professor_id].total_aulas++;
                    remunByProf[aula.professor_id].valor_estimado += 35; // Valor padrão arbitrário por aula
                }
            });

            // Filter out professors with 0 classes and also exclude Aquilles from the final list
            const finalRemun = Object.values(remunByProf).filter((r: any) => {
                const nome = r.professor_nome?.toLowerCase() || '';
                return !nome.includes('aquilles') && !nome.includes('áquilles') && r.total_aulas > 0;
            });

            res.json(finalRemun);
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    // Pacotes
    app.get('/api/pacotes', async (req, res) => {
        const { data } = await supabase.from('pacotes').select('*').order('id');
        res.json(data || []);
    });

    app.post('/api/pacotes', async (req, res) => {
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
                const { data: prof } = await supabase.from('professores').select('id, nome').ilike('email', req.user.email).single();
                if (prof) {
                    const nome = prof.nome.toLowerCase();
                    // Aplica restrição a todos os professores para que vejam apenas suas próprias aulas
                    filterProfId = String(prof.id);
                } else {
                    filterProfId = '-1'; // Forçar retorno vazio caso professor não seja encontrado
                }
            } else if (req.user && req.user.role === 'aluno') {
                // ALUNO: filtrar somente as aulas do aluno logado
                const { data: aluno } = await supabase.from('alunos').select('id').ilike('email', req.user.email).maybeSingle();
                if (aluno) {
                    filterAlunoId = String(aluno.id);
                    console.log(`[AGENDA] Aluno logado: id=${filterAlunoId}, email=${req.user.email}`);
                } else {
                    console.warn(`[AGENDA] Aluno não encontrado para email: ${req.user.email}`);
                    filterAlunoId = '-1'; // Forçar retorno vazio
                }
            }

            let query = supabase.from('aulas')
                .select('id, data, horario, status, professor_id, aluno_id, conteudo, tarefa_casa, midias, xp_ganho, data_original, motivo_cancelamento, tipo, alunos(nome, status), professores(nome), cursos(nome), matriculas(status)')
                .order('data', { ascending: true });
            
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

            const { data: rawAulas, error: errA } = await query;
            if (errA) console.error('[AGENDA] Erro aulas:', errA);
            
            const aulas = (rawAulas || []).filter((a: any) => {
                const aluno = Array.isArray(a.alunos) ? a.alunos[0] : a.alunos;
                const matricula = Array.isArray(a.matriculas) ? a.matriculas[0] : a.matriculas;
                const isAlunoArquivado = aluno && aluno.status === 'arquivado';
                const isMatriculaArquivada = matricula && matricula.status === 'arquivada';
                return !isAlunoArquivado && !isMatriculaArquivada;
            });
            console.log(`[AGENDA] Retornadas ${aulas.length} aulas regulares`);

            let expQuery = supabase.from('aulas_experimentais')
                .select('id, data, horario, status, professor_id, lead_id, leads(nome), professores(nome)');
                
            if (start) expQuery = expQuery.gte('data', start);
            if (end) expQuery = expQuery.lte('data', end);
            if (filterProfId) expQuery = expQuery.eq('professor_id', filterProfId);
            if (statusFilter) expQuery = expQuery.eq('status', statusFilter);

            const { data: experimentais, error: errE } = await expQuery;

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
                        curso_nome: curso?.nome || 'Curso'
                    };
                }) || []),
                ...(experimentais?.map((e: any) => {
                    const lead = Array.isArray(e.leads) ? e.leads[0] : e.leads;
                    const professor = Array.isArray(e.professores) ? e.professores[0] : e.professores;
                    return {
                        ...e,
                        id: `exp-${e.id}`,
                        originalId: e.id,
                        type: 'experimental',
                        nome: lead?.nome,
                        aluno_nome: lead?.nome,
                        professor_nome: professor?.nome,
                        curso_nome: 'Experimental'
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
    app.post('/api/agenda/:id/solicitar-confirmacao', async (req: any, res) => {
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

            const { data: aula, error: errA } = await supabase.from('aulas').select('*, alunos(nome), professores(id, nome)').eq('id', originalId).single();
            if (errA || !aula) throw new Error('Aula não encontrada');

            // Atualizar status
            await supabase.from('aulas').update({ status: 'confirmada' }).eq('id', originalId);

            // Enviar Notificação Interna e Push para o Professor
            if (aula.professores?.id) {
                const { data: profData } = await supabase.from('professores').select('email').eq('id', aula.professores.id).single();
                const titulo = 'Aula Confirmada! ✅';
                const msg = `O aluno ${aula.alunos?.nome || 'seu aluno'} confirmou a presença na próxima aula!`;
                
                await supabase.from('notificacoes').insert([{
                    titulo, mensagem: msg, tipo: 'agenda', professor_id: aula.professores.id
                }]);

                await sendPushNotification(titulo, msg, String(aula.professores.id), profData?.email);
            }

            res.json({ success: true, status: 'confirmada' });
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });


    app.patch('/api/aulas/:id/reschedule', async (req, res) => {
        try {
            const { data, horario } = req.body;
            const { error } = await supabase.from('aulas').update({ data, horario }).eq('id', req.params.id);
            if (error) throw error;
            res.json({ success: true });
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.post('/api/agenda/:id/pagar', async (req, res) => {
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

            const now = new Date();
            const ref = `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;

            // Buscar se já existe pagamento para este mês
            const { data: existing } = await supabase.from('pagamentos')
                .select('*')
                .eq('aluno_id', aula.aluno_id)
                .eq('referencia_mes_ano', ref)
                .single();

            if (existing) {
                await supabase.from('pagamentos').update({ status: 'pago', data_pagamento: now.toISOString().split('T')[0] }).eq('id', existing.id);
            } else {
                await supabase.from('pagamentos').insert([{
                    aluno_id: aula.aluno_id,
                    valor: 0, // Valor simbólico ou buscar do plano
                    status: 'pago',
                    data_vencimento: now.toISOString().split('T')[0],
                    data_pagamento: now.toISOString().split('T')[0],
                    referencia_mes_ano: ref,
                    tipo_receita: 'mensalidade'
                }]);
            }
            res.json({ success: true });
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.patch('/api/agenda/:id', async (req, res) => {
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

    
    app.patch('/api/agenda/:id/cancelar', async (req, res) => {
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

    app.delete('/api/agenda/:id', async (req, res) => {
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


    app.post('/api/alunos/:id/gerar-financeiro', async (req, res) => {
        try {
            const { id } = req.params;
            // Buscar matrícula ativa
            const { data: matricula } = await supabase.from('matriculas').select('*').eq('aluno_id', id).eq('status', 'ativa').single();
            if (!matricula) throw new Error('Nenhuma matrícula ativa encontrada');

            const pagamentosToInsert = [];
            let currentVencimento = new Date(matricula.data_primeira_parcela || matricula.data_inicio);

            for (let i = 0; i < (matricula.total_parcelas || 1); i++) {
                pagamentosToInsert.push({
                    aluno_id: id,
                    matricula_id: matricula.id,
                    valor: matricula.valor_parcela,
                    data_vencimento: currentVencimento.toISOString().split('T')[0],
                    status: 'pendente',
                    tipo_receita: 'mensalidade',
                    referencia_mes_ano: `${(currentVencimento.getMonth() + 1).toString().padStart(2, '0')}/${currentVencimento.getFullYear()}`
                });
                currentVencimento.setMonth(currentVencimento.getMonth() + 1);
                currentVencimento.setDate(matricula.dia_vencimento || 10);
            }
            await supabase.from('pagamentos').insert(pagamentosToInsert);
            res.json({ success: true });
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.post('/api/financeiro/importar-pdf', upload.single('pdf'), async (req: any, res) => {
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

            // Pré-detectar se é uma Ficha Financeira (nome no rodapé ou cabeçalho)
            const fichaMatch = text.match(/Ficha Financeira - ([^-]+)/i);
            if (fichaMatch) {
                const potentialName = fichaMatch[1].trim().toUpperCase();
                console.log('Buscando aluno para:', potentialName);
                const student = allAlunos?.find(a => 
                    potentialName.includes(a.nome.toUpperCase()) || 
                    a.nome.toUpperCase().includes(potentialName) ||
                    potentialName.split(' ').some(part => part.length > 3 && a.nome.toUpperCase().includes(part))
                );
                if (student) {
                    currentStudentId = student.id;
                    console.log('Aluno identificado:', student.nome);
                }
            }
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                // Em relatórios gerais, o nome aparece na linha acima ou na própria linha
                const studentInLine = allAlunos?.find(a => line.toUpperCase().includes(a.nome.toUpperCase()) && a.nome.length > 3);
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
                        
                        // Tentar atualizar
                        const { data: updated, error: updateError } = await supabase
                            .from('pagamentos')
                            .update({ 
                                status: isPaid ? 'pago' : 'pendente',
                                data_pagamento: isPaid ? (dates && dates[1] ? dates[1].split('/').reverse().join('-') : getDateBR()) : null,
                                valor: valor > 0 ? valor : undefined
                            })
                            .eq('aluno_id', currentStudentId)
                            .eq('referencia_mes_ano', ref)
                            .select();
                        
                        if (!updateError && updated && updated.length > 0) {
                            stats.atualizados++;
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
        const { data } = await supabase.from('gamificacao_conquistas').select('*').order('id', { ascending: false });
        res.json(data || []);
    });

    app.post('/api/gamificacao/conquistas', async (req, res) => {
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

    app.put('/api/gamificacao/conquistas/:id', async (req, res) => {
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

    app.delete('/api/gamificacao/conquistas/:id', async (req, res) => {
        try {
            const { error } = await supabase.from('gamificacao_conquistas').delete().eq('id', req.params.id);
            if (error) throw error;
            res.json({ success: true });
        } catch (error: any) { res.status(500).json({ error: error.message || 'Erro ao excluir conquista' }); }
    });

    app.post('/api/gamificacao/upload', upload.single('icon'), async (req: any, res) => {
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
            // Buscar alunos ativos (exclui arquivados e testes)
            const { data: alunos, error: alunosError } = await supabase
                .from('alunos')
                .select('id, nome, xp, foto_url, avatar_config, acorde_coins')
                .neq('status', 'arquivado');
            if (alunosError) console.error('Erro ao buscar alunos para ranking:', alunosError);

            const progresso = await fetchAllGamificacaoProgresso(supabase);
            
            const ranking = (alunos || []).map(al => {
                const prog = progresso?.filter(p => p.aluno_id === al.id) || [];
                // XP unificado: XP de aulas realizadas + XP de conquistas manuais
                const xpConquistas = prog.reduce((acc, p) => acc + (p.conquista?.pontos || 0), 0);
                const xpTotal = (Number(al.xp) || 0) + xpConquistas;
                
                const conquistasMap: any = {};
                prog.forEach(p => {
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

            res.json(ranking);
        } catch (error) { console.error('Erro no ranking:', error); res.status(500).json({ error: 'Erro ao gerar ranking' }); }
    });

    app.post('/api/gamificacao/atribuir', async (req, res) => {
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
    async function sendPushNotification(titulo: string, mensagem: string, targetUserId?: string | string[], emailTo?: string) {
        // Agora busca a chave inviolável no Supabase via MCP para não depender da Vercel
        const { data: config } = await supabase.from('system_config').select('key_value').eq('key_name', 'ONESIGNAL_REST_API_KEY').maybeSingle();
        const appKey = config?.key_value || process.env.ONESIGNAL_REST_API_KEY;
        const appId = process.env.VITE_ONESIGNAL_APP_ID || "e5e38375-5fd8-4e92-bf0d-29996ba9426d";

        if (!appKey || !appId) {
            console.error('[OneSignal] Chaves não configuradas no ambiente (env). Ignorando envio.');
            return;
        }

        try {
            const bodyPayload: any = {
                app_id: appId,
                headings: { en: titulo, pt: titulo },
                contents: { en: mensagem, pt: mensagem }
            };

            if (targetUserId) {
                bodyPayload.include_aliases = { external_id: [String(targetUserId)] };
                bodyPayload.target_channel = "push";
            } else {
                bodyPayload.included_segments = ['Subscribed Users'];
            }

            const response = await fetch('https://onesignal.com/api/v1/notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Authorization': `Key ${appKey}`
                },
                body: JSON.stringify(bodyPayload)
            });

                        const data = await response.json();
            console.log('[PUSH_NOTIFICATION] OneSignal Push enviado com sucesso:', data);
            
            // Disparo de E-MAIL via Nodemailer (Gmail)
            if (emailTo) {
                try {
                    const { data: smtpConfig } = await supabase.from('system_config').select('key_name, key_value').in('key_name', ['SMTP_EMAIL', 'SMTP_PASSWORD']);
                    let smtpEmail = process.env.SMTP_EMAIL;
                    let smtpPass = process.env.SMTP_PASSWORD;

                    if (smtpConfig) {
                        const dbEmail = smtpConfig.find(c => c.key_name === 'SMTP_EMAIL')?.key_value;
                        const dbPass = smtpConfig.find(c => c.key_name === 'SMTP_PASSWORD')?.key_value;
                        if (dbEmail) smtpEmail = dbEmail;
                        if (dbPass) smtpPass = dbPass;
                    }

                    if (smtpEmail && smtpPass) {
                        const transporter = nodemailer.createTransport({
                            service: 'gmail',
                            auth: {
                                user: smtpEmail,
                                pass: smtpPass
                            }
                        });

                        const emailHtml = `
                            <div style="font-family: sans-serif; padding: 20px; background: #fff8f6; border: 4px solid #261812; color: #261812;">
                                <h2 style="color: #ff6b00; text-transform: uppercase;">STUDIO ACORDE - AVISO DA ESCOLA</h2>
                                <p style="font-size: 16px; font-weight: bold;">${titulo}</p>
                                <p>${mensagem}</p>
                                <br/>
                                <a href="https://acordecrm.vercel.app" style="display: inline-block; padding: 15px 30px; background: #ff6b00; color: #fff; text-decoration: none; font-weight: bold; border-radius: 4px; border: 2px solid #261812; box-shadow: 4px 4px 0 #261812;">ACESSAR MEU APLICATIVO</a>
                                <br/><br/>
                                <hr style="border: 1px dashed #7b5647;" />
                                <small style="color: #8e7164;">Esta é uma mensagem automática do Studio Acorde CRM. Não responda este e-mail.</small>
                            </div>
                        `;

                        await Promise.race([
                            transporter.sendMail({
                                from: `"Studio Acorde" <${smtpEmail}>`,
                                to: emailTo,
                                subject: titulo,
                                html: emailHtml
                            }),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP Timeout - Email cancelado mas API continua')), 5000))
                        ]).catch(e => console.error('[SMTP_TIMEOUT_HANDLED]', e.message));
                        console.log('[PUSH_NOTIFICATION] E-mail do Gmail disparado para', emailTo);
                    } else {
                        console.log('[PUSH_NOTIFICATION] SMTP_EMAIL ou SMTP_PASSWORD não configurado no env ou BD. E-mail ignorado.');
                    }
                } catch (emailErr) {
                    console.error('[PUSH_NOTIFICATION] Erro ao enviar E-mail via Nodemailer:', emailErr);
                }
            }
        } catch (err) {
            console.error('[PUSH_NOTIFICATION] Erro ao enviar push OneSignal:', err);
        }
    };

    // 1. Obter treinos do aluno autenticado
    app.get('/api/treinos/me', async (req, res) => {
        try {
            const email = (req as any).user?.email;
            if (!email) return res.status(401).json({ error: 'Não autorizado.' });

            const { data: aluno } = await supabase.from('alunos').select('id').eq('email', email).single();
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

            const { data: aluno } = await supabase.from('alunos').select('id, nome, xp, acorde_coins').eq('email', email).single();
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
            const titulo = 'Treino registrado! 🔥';
            const mensagem = `${aluno.nome} marcou seu check-in de treino diário!`;
            
            await supabase.from('notificacoes').insert([{ titulo, mensagem, tipo: 'treino', aluno_id: aluno.id }]);

            sendPushNotification(titulo, mensagem);

            // Update XP and Coins
            const novoXp = (Number(aluno.xp) || 0) + 500;
            const novasMoedas = (Number(aluno.acorde_coins) || 0) + 500;
            await supabase.from('alunos').update({ xp: novoXp, acorde_coins: novasMoedas }).eq('id', aluno.id);

            await addToFeed(aluno.id, 'treino', `${aluno.nome} marcou o treino do dia! 💪`, '🎸');

            res.json({ success: true, data: treino, novoXp, novasMoedas });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // 3. Upload de vídeo curto de treino (24h de duração)
    
    const driveFolderId = '1EHXi800HrwkDWOgd-l0lXKtQZkMlSFyV';
    
    app.post('/api/drive/upload-url', async (req, res) => {
        try {
            const { filename, mimeType } = req.body;
            const { data: config } = await supabase.from('system_config').select('key_value').eq('key_name', 'GOOGLE_CREDENTIALS').maybeSingle();
            const credsStr = config?.key_value || process.env.GOOGLE_CREDENTIALS;
            let authOptions: any = { scopes: ['https://www.googleapis.com/auth/drive.file'] };
            if (credsStr) {
                authOptions.credentials = typeof credsStr === 'string' ? JSON.parse(credsStr) : credsStr;
            } else {
                authOptions.keyFile = './google-credentials.json';
            }
            const auth = new GoogleAuth(authOptions);
            const client = await auth.getClient();
            const token = await client.getAccessToken();

            const metadata = {
                name: filename,
                parents: [driveFolderId]
            };

            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token.token}`,
                    'Content-Type': 'application/json',
                    'X-Upload-Content-Type': mimeType
                },
                body: JSON.stringify(metadata)
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error('Google Drive Error: ' + text);
            }

            const resumableUrl = response.headers.get('Location');
            res.json({ uploadUrl: resumableUrl });
        } catch (error: any) {
            console.error('Drive API Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/drive/finish-upload', async (req, res) => {
        try {
            const { fileId } = req.body;
            const { data: config } = await supabase.from('system_config').select('key_value').eq('key_name', 'GOOGLE_CREDENTIALS').maybeSingle();
            const credsStr = config?.key_value || process.env.GOOGLE_CREDENTIALS;
            let authOptions: any = { scopes: ['https://www.googleapis.com/auth/drive.file'] };
            if (credsStr) {
                authOptions.credentials = typeof credsStr === 'string' ? JSON.parse(credsStr) : credsStr;
            } else {
                authOptions.keyFile = './google-credentials.json';
            }
            const auth = new GoogleAuth(authOptions);
            const client = await auth.getClient();
            const token = await client.getAccessToken();

            // Set file to anyone with link can view (so professor can see it)
            await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    role: 'reader',
                    type: 'anyone'
                })
            });

            const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=webViewLink`, {
                headers: { 'Authorization': `Bearer ${token.token}` }
            });
            
            const fileData = await fileRes.json();
            res.json({ url: fileData.webViewLink });
        } catch(err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/treinos/upload-video', upload.single('video'), async (req: any, res) => {
        if (!req.file && !req.body.video_url) {
            return res.status(400).json({ error: 'Nenhum arquivo de vídeo enviado.' });
        }
        try {
            const email = req.user?.email;
            if (!email) return res.status(401).json({ error: 'Não autorizado.' });

            const { data: aluno } = await supabase.from('alunos').select('id, nome, xp, acorde_coins').eq('email', email).single();
            if (!aluno) return res.status(404).json({ error: 'Estudante não encontrado.' });

            const todayStr = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');

            let { data: treino } = await supabase
                .from('aluno_treinos')
                .select('*')
                .eq('aluno_id', aluno.id)
                .eq('data', todayStr)
                .maybeSingle();

            if (!treino) {
                const { data: novoTreino, error: createError } = await supabase
                    .from('aluno_treinos')
                    .insert([{ aluno_id: aluno.id, data: todayStr }])
                    .select()
                    .single();
                if (createError) throw createError;
                treino = novoTreino;
                
                const novoXp = (Number(aluno.xp) || 0) + 500;
                const novasMoedas = (Number(aluno.acorde_coins) || 0) + 500;
                await supabase.from('alunos').update({ xp: novoXp, acorde_coins: novasMoedas }).eq('id', aluno.id);
            }

            if (!treino.video_url) {
                await addToFeed(aluno.id, 'treino', `${aluno.nome} acabou de postar um vídeo de treino! 📹`, '📹');
            }

            let url = req.body.video_url || '';

            if (!req.body.video_url && req.file) {
                let ext = path.extname(req.file.originalname) || '.mp4';
                let mimeType = req.file.mimetype || 'video/mp4';
                const extLower = ext.toLowerCase();

                if (mimeType.includes('quicktime') || extLower === '.mov' || extLower === '.qt') {
                    mimeType = 'video/mp4';
                    ext = '.mp4';
                } else if (!mimeType.startsWith('video/') || mimeType.includes('text/plain') || mimeType.includes('octet-stream')) {
                    if (extLower === '.webm') mimeType = 'video/webm';
                    else mimeType = 'video/mp4';
                }

                const filename = `treinos/${aluno.id}_${Date.now()}_video${ext}`;
                const fileBuffer = fs.readFileSync(req.file.path);

                const { error: uploadError } = await supabase.storage
                    .from('uploads')
                    .upload(filename, fileBuffer, { 
                        contentType: 'application/octet-stream', 
                        upsert: true,
                        cacheControl: '3600'
                    });

                try { fs.unlinkSync(req.file.path); } catch {}

                if (uploadError) {
                    console.error('[TREINO_VIDEO_UPLOAD] Erro Storage:', uploadError.message);
                    return res.status(500).json({ error: 'Falha ao salvar vídeo: ' + uploadError.message });
                }

                const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filename);
                url = publicUrlData?.publicUrl || '';
            }

            if (treino.video_url && treino.video_url !== url) {
                try {
                    const oldPath = treino.video_url.split('/uploads/')[1];
                    if (oldPath) {
                        await supabase.storage.from('uploads').remove([oldPath]);
                    }
                } catch (e) {
                    console.error('Erro ao deletar vídeo antigo do storage:', e);
                }
            }

            const { data: updatedTreino, error: updateError } = await supabase
                .from('aluno_treinos')
                .update({ 
                    video_url: url,
                    video_created_at: new Date().toISOString()
                })
                .eq('id', treino.id)
                .select()
                .single();

            if (updateError) throw updateError;

            // Criar notificação para o professor
            const titulo = 'Vídeo de treino enviado! 📹';
            const mensagem = `${aluno.nome} gravou um vídeo estudando hoje!`;
            
            await supabase.from('notificacoes').insert([{ titulo, mensagem, tipo: 'treino', aluno_id: aluno.id }]);

            sendPushNotification(titulo, mensagem);

            res.json({ success: true, url, data: updatedTreino });
        } catch (error: any) {
            console.error('[TREINO_VIDEO_UPLOAD] Erro geral:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // 4. Obter treinos de todos os alunos (Professor) com limpeza expirada integrada
    app.get('/api/treinos/prof', async (req, res) => {
        try {
            // Rotina de limpeza automática de vídeos antigos (> 24 horas)
            const limitDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { data: expirados } = await supabase
                .from('aluno_treinos')
                .select('id, video_url')
                .not('video_url', 'is', null)
                .lt('video_created_at', limitDate);

            if (expirados && expirados.length > 0) {
                console.log(`[TREINO_VIDEO_CLEANUP] Limpando ${expirados.length} vídeos com mais de 24h...`);
                for (const item of expirados) {
                    try {
                        const filePath = item.video_url.split('/uploads/')[1];
                        if (filePath) {
                            await supabase.storage.from('uploads').remove([filePath]);
                        }
                        await supabase
                            .from('aluno_treinos')
                            .update({ video_url: null, video_created_at: null })
                            .eq('id', item.id);
                    } catch (e: any) {
                        console.error('[CLEANUP] Erro no item:', item.id, e.message);
                    }
                }
            }

            const { data: treinos, error } = await supabase
                .from('aluno_treinos')
                .select('*, alunos(id, nome, foto_url)')
                .order('id', { ascending: false })
                .limit(100);

            if (error) throw error;
            res.json(treinos || []);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // 5. Histórico de Aulas Concluídas de um aluno
    app.get('/api/alunos/:id/historico-aulas', async (req, res) => {
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

            const { data: aluno } = await supabase.from('alunos').select('id, nome').eq('email', email).single();
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

            sendPushNotification(titulo, mensagem);

            res.json({ success: true, data: aula });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // 7. Listar notificações do feed do professor
    app.get('/api/notificacoes', async (req, res) => {
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
    app.post('/api/notificacoes/:id/lida', async (req, res) => {
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
    app.post('/api/notificacoes/limpar', async (req, res) => {
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

    app.post('/api/gamificacao/remover', async (req, res) => {
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

    app.get('/api/gamificacao/solicitacoes', async (req, res) => {
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

    app.post('/api/gamificacao/solicitar', async (req, res) => {
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

    app.post('/api/gamificacao/solicitacoes/:id/revisar', async (req, res) => {
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
            if (status === 'aprovada') {
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
            res.json(data || []);
        } catch (error) {
            console.error('Error fetching feed:', error);
            res.json([]); // Fail gracefully until table exists
        }
    });

    app.post('/api/feed', async (req, res) => {
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
    app.get('/api/godmode/status', async (req: any, res) => {
        try {
            const email = req.user?.email || '';
            if (!email.toLowerCase().startsWith('antonycorp11')) {
                return res.status(403).json({ error: 'Acesso negado: God Mode exclusivo.' });
            }
            const { data, error } = await supabase.from('system_config').select('key_value').eq('key_name', 'JOGOS_DAO_XP').maybeSingle();
            if (error) throw error;
            res.json({ jogos_dao_xp: data?.key_value === 'true' });
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.post('/api/godmode/config-xp', async (req: any, res) => {
        try {
            const email = req.user?.email || '';
            if (!email.toLowerCase().startsWith('antonycorp11')) {
                return res.status(403).json({ error: 'Acesso negado: God Mode exclusivo.' });
            }
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

    app.post('/api/godmode/creditar', async (req: any, res) => {
        try {
            const email = req.user?.email || '';
            if (!email.toLowerCase().startsWith('antonycorp11')) {
                return res.status(403).json({ error: 'Acesso negado: God Mode exclusivo.' });
            }
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
    app.put('/api/alunos/:id/avatar', async (req, res) => {
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

    app.post('/api/aulas-video', async (req, res) => {
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

    app.post('/api/trilha/modulos', async (req, res) => {
        try {
            const { id, nome, descricao, ordem, arte_index, prova_final, conquista_id } = req.body;
            let result;
            if (id) {
                result = await supabase
                    .from('modulos_trilha')
                    .update({ 
                        nome, 
                        descricao, 
                        ordem, 
                        arte_index, 
                        prova_final, 
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
                        prova_final, 
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

    app.delete('/api/trilha/modulos/:id', async (req, res) => {
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

    app.post('/api/trilha/aulas', async (req, res) => {
        try {
            const { id, modulo_id, titulo, youtube_url, ordem, questionario, conquista_id } = req.body;
            let result;
            if (id) {
                result = await supabase
                    .from('aulas_trilha')
                    .update({ 
                        modulo_id, 
                        titulo, 
                        youtube_url, 
                        ordem, 
                        questionario, 
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
                        questionario, 
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

    app.delete('/api/trilha/aulas/:id', async (req, res) => {
        try {
            const { error } = await supabase
                .from('aulas_trilha')
                .delete()
                .eq('id', req.params.id);
            if (error) throw error;
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/trilha/progresso/:alunoId', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('progresso_trilha')
                .select('*')
                .eq('aluno_id', req.params.alunoId);
            if (error) throw error;
            res.json(data || []);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/trilha/progresso', async (req, res) => {
        try {
            const { aluno_id, classroom_id, aula_id } = req.body;
            const targetAlunoId = aluno_id || req.body.alunoId;
            const targetAulaId = aula_id || req.body.aulaId;
            
            const { data, error } = await supabase
                .from('progresso_trilha')
                .upsert([{ aluno_id: targetAlunoId, aula_id: targetAulaId }], { onConflict: 'aluno_id,aula_id' })
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
                     
                await addToFeed(
                     aluno.id,
                     'aula_trilha_concluida',
                     `Concluiu a aula da trilha e ganhou +200 XP & +200 Coins!`,
                     '🎓'
                );
            }
            
            res.json({ success: true, data });
         } catch (error) {
             res.status(500).json({ error: error.message });
         }
    });

    app.post('/api/trilha/gerar-questionario-ia', async (req, res) => {
        try {
            const { textoBruto } = req.body;
            if (!textoBruto) {
                return res.status(400).json({ error: 'Texto bruto é obrigatório.' });
            }

            let apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                const { data: dbConfig } = await supabase
                    .from('system_config')
                    .select('key_value')
                    .eq('key_name', 'GEMINI_API_KEY')
                    .maybeSingle();
                if (dbConfig?.key_value) {
                    apiKey = dbConfig.key_value;
                }
            }
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

            const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

            const parsedQuestions = JSON.parse(cleanedText);
            res.json(parsedQuestions);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/trilha/responder-questionario', async (req, res) => {
        try {
            const { aluno_id, aula_trilha_id, modulo_trilha_id, respostas } = req.body;
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
                
                if (aula.questionario && Array.isArray(aula.questionario)) {
                    gabaQuestions = aula.questionario;
                } else if (aula.questionario && typeof aula.questionario === 'object') {
                    gabaQuestions = (aula.questionario as any).questions || [];
                }
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

                if (modulo.prova_final && Array.isArray(modulo.prova_final)) {
                    gabaQuestions = modulo.prova_final;
                } else if (modulo.prova_final && typeof modulo.prova_final === 'object') {
                    gabaQuestions = (modulo.prova_final as any).questions || [];
                }
            }

            if (gabaQuestions.length === 0) {
                return res.status(400).json({ error: 'Nenhum questionário cadastrado para esta referência.' });
            }

            // Calcula acertos
            let acertos = 0;
            gabaQuestions.forEach((q, idx) => {
                const respAluno = respostas[idx];
                const respCorreta = q.resposta_correta_idx !== undefined ? q.resposta_correta_idx : q.resposta_correta;
                if (Number(respAluno) === Number(respCorreta)) {
                    acertos++;
                }
            });

            const nota = Math.round((acertos / gabaQuestions.length) * 100);
            const aprovado = nota >= 80;

            let xpGanhos = 0;
            let moedasGanhas = 0;
            let conquistouMedalha = false;

            if (aprovado) {
                const { data: aluno } = await supabase
                    .from('alunos')
                    .select('id, nome, xp, acorde_coins')
                    .eq('id', aluno_id)
                    .single();

                if (aluno) {
                    xpGanhos = aulaId ? 200 : 500;
                    moedasGanhas = aulaId ? 200 : 500;
                    
                    const novoXp = (Number(aluno.xp) || 0) + xpGanhos;
                    const novasMoedas = (Number(aluno.acorde_coins) || 0) + moedasGanhas;
                    
                    await supabase
                        .from('alunos')
                        .update({ xp: novoXp, acorde_coins: novasMoedas })
                        .eq('id', aluno.id);

                    await addToFeed(
                        aluno.id,
                        aulaId ? 'aula_trilha_concluida' : 'modulo_trilha_concluido',
                        `Aprovado com ${nota}% em "${tituloReferencia}"! Ganhou +${xpGanhos} XP & +${moedasGanhas} Moedas!`,
                        aulaId ? '🎓' : '👑'
                    );

                    if (aulaId) {
                        await supabase
                            .from('progresso_trilha')
                            .upsert([{ aluno_id: aluno.id, aula_id: aulaId }], { onConflict: 'aluno_id,aula_id' });
                    }

                    if (conquistaId) {
                        const { data: existConq } = await supabase
                            .from('gamificacao_progresso')
                            .select('*')
                            .eq('aluno_id', aluno.id)
                            .eq('conquista_id', conquistaId)
                            .maybeSingle();

                        if (!existConq) {
                            await supabase
                                .from('gamificacao_progresso')
                                .insert([{ aluno_id: aluno.id, conquista_id: conquistaId }]);
                            conquistouMedalha = true;
                            
                            const { data: conqData } = await supabase
                                .from('gamificacao_conquistas')
                                .select('nome')
                                .eq('id', conquistaId)
                                .single();
                                
                            await addToFeed(
                                aluno.id,
                                'novo_trofeu',
                                `Conquistou o troféu "${conqData?.nome || 'Medalha EAD'}"! 🏆`,
                                '🏆'
                            );
                        }
                    }
                }
            }

            await supabase
                .from('tentativas_questionario_trilha')
                .insert([{
                    aluno_id,
                    aula_trilha_id: aulaId || null,
                    modulo_trilha_id: aulaId ? null : moduloId,
                    nota,
                    aprovado,
                    respostas
                }]);

            res.json({
                success: true,
                aprovado,
                nota,
                acertos,
                totalPerguntas: gabaQuestions.length,
                xpGanhos,
                moedasGanhas,
                conquistouMedalha
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/alunos/abrir-ficha-premio', async (req, res) => {
         try {
             const { aluno_id } = req.body;
             const dateStr = getDateBR();
             
             const { data: claims, error: claimErr } = await supabase
                 .from('feed_atividades')
                 .select('*')
                 .eq('aluno_id', aluno_id)
                 .eq('tipo', 'ficha_estudo_diaria')
                 .gte('created_at', `${dateStr}T00:00:00.000Z`)
                 .lte('created_at', `${dateStr}T23:59:59.999Z`);
                 
             if (claimErr) throw claimErr;
             
             if (claims && claims.length > 0) {
                 return res.json({ success: true, claimed: true, message: 'Já recebeu o prêmio diário hoje.' });
             }
             
             const { data: aluno, error: getErr } = await supabase
                 .from('alunos')
                 .select('id, nome, xp, acorde_coins')
                 .eq('id', aluno_id)
                 .single();
                 
             if (getErr) throw getErr;
             
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

    // 4. Temporada Atual
    app.get('/api/temporada-atual', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('temporadas')
                .select('*')
                .eq('ativa', true)
                .single();
            if (error && error.code !== 'PGRST116' && error.code !== '42P01') throw error;
            res.json(data || { nome: 'Temporada 1' });
        } catch(error) {
            res.json({ nome: 'Temporada 1' });
        }
    });

    // Serve static files from public folder
    app.use(express.static(join(__dirname, 'public')));

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
        const distPath = path.join(__dirname, 'dist');
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

    // MURAL DA VERGONHA
    app.get('/api/mural', async (req: any, res) => {
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

    app.post('/api/mural', async (req: any, res) => {
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

    app.delete('/api/mural/:id', async (req: any, res) => {
        try {
            const { id } = req.params;
            const { error } = await supabase.from('mural_vergonha').delete().eq('id', id);
            if (error) throw error;
            res.json({ success: true });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
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

