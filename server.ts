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

// Middleware JWT
const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    // Ignorar rotas públicas
    const publicRoutes = ['/api/ping', '/api/auth/login', '/api/auth/register', '/api/vagas'];
    if (publicRoutes.includes(req.path)) return next();
    
    // A gamificação/upload pode precisar de token também
    // O import-pdf é protected

    if (token == null) return res.status(401).json({ error: 'Acesso negado: Token não fornecido.' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.status(403).json({ error: 'Acesso negado: Token inválido ou expirado.' });
        req.user = user;
        next();
    });
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
    app.get('/api/ping', (req, res) => res.json({ message: 'pong' }));
    
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

            const { data: aluno } = await supabase.from('alunos').select('id, nome').eq('email', email).single();
            if (!aluno) return res.json({ exists: false });

            const { data: usuario } = await supabase.from('usuarios').select('id').eq('email', email).single();
            
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
    app.get('/api/usuarios', async (req, res) => {
        try {
            const { data, error } = await supabase.from('usuarios').select('id, nome, email, role').order('nome');
            if (error) throw error;
            res.json(data);
        } catch (error) { res.status(500).json({ error: 'Erro ao buscar usuários' }); }
    });

    app.post('/api/usuarios', async (req, res) => {
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

    app.put('/api/usuarios/:id', async (req, res) => {
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

    app.delete('/api/usuarios/:id', async (req, res) => {
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
            const dateStr = targetDate.toLocaleDateString('en-CA'); // en-CA retorna YYYY-MM-DD
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
            const { data: progresso } = await supabase.from('gamificacao_progresso').select('*, conquista:conquista_id(*)');
            
            const rankingList = (allAlunos || []).map(al => {
                const prog = progresso?.filter(p => p.aluno_id === al.id) || [];
                const xpCalculado = prog.reduce((acc, p) => acc + (p.conquista?.pontos || 0), 0);
                // O XP total é a soma do XP base + conquistas
                return { id: al.id, xp: (al.xp || 0) + xpCalculado };
            }).sort((a, b) => b.xp - a.xp);

            const myEntry = rankingList.find(r => r.id === aluno.id);
            const myRank = rankingList.findIndex(r => r.id === aluno.id) + 1;
            const myXp = myEntry ? myEntry.xp : (aluno.xp || 0);

            res.json({
                ...aluno,
                ranking: myRank,
                xp: myXp,
                conquistas: progresso?.filter(p => p.aluno_id === aluno.id).map(p => ({
                    ...p.conquista,
                    data_conquista: p.created_at
                })) || []
            });
        } catch (error: any) { 
            console.error('Erro em /api/alunos/me:', error);
            res.status(500).json({ error: error.message }); 
        }
    });

    app.post('/api/alunos/me/photo', upload.single('photo'), async (req: any, res) => {
        if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        try {
            // No mundo real, subiria para S3/Supabase Storage. 
            // Para simplicidade agora, usamos o sistema local de arquivos (multer já salvou).
            const photoUrl = `/uploads/${req.file.filename}`;
            
            const { error } = await supabase
                .from('alunos')
                .update({ foto_url: photoUrl })
                .eq('email', req.user.email);
            
            if (error) throw error;
            res.json({ foto_url: photoUrl });
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.get('/api/alunos/:id', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('alunos')
                .select('*, matriculas(*, cursos(nome))')
                .eq('id', req.params.id)
                .single();
            if (error) throw error;
            res.json(data);
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.get('/api/alunos/:id/financeiro', async (req, res) => {
        const { id } = req.params;
        const { data, error } = await supabase.from('pagamentos').select('*').eq('aluno_id', id).order('data_vencimento', { ascending: true });
        if (error) return res.status(500).json({ error: error.message });
        res.json(data);
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

    app.delete('/api/alunos/:id', async (req, res) => {
        try {
            const { error } = await supabase.from('alunos').update({ status: 'arquivado' }).eq('id', req.params.id);
            if (error) throw error;
            res.json({ success: true });
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.patch('/api/alunos/:id', async (req, res) => {
        try {
            const studentId = req.params.id;
            const { 
                nome, email, telefone, cpf, endereco, 
                responsavel_nome, responsavel_telefone, 
                curso_id 
            } = req.body;
            
            console.log(`[ALUNO_UPDATE] ID: ${studentId}`, { nome, curso_id });

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

            // 2. Atualizar Curso na Matrícula Ativa (se fornecido)
            if (curso_id && !isNaN(Number(curso_id))) {
                const { error: matError } = await supabase.from('matriculas')
                    .update({ curso_id: Number(curso_id) })
                    .eq('aluno_id', studentId)
                    .eq('status', 'ativa');
                
                if (matError) {
                    console.error('[MATRICULA_UPDATE_ERROR]:', matError);
                    // Não travamos o fluxo principal se apenas a matrícula falhar
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

    app.patch('/api/aulas/:id/status', async (req, res) => {
        try {
            const { status, type } = req.body;
            const table = type === 'experimental' ? 'aulas_experimentais' : 'aulas';
            
            const { data, error } = await supabase.from(table).update({ status }).eq('id', req.params.id).select().single();
            if (error) throw error;

            // Automação para Lead
            if (type === 'experimental' && status === 'realizada' && data?.lead_id) {
                await supabase.from('leads').update({ status: 'experimental_concluida' }).eq('id', data.lead_id);
            }

            res.json({ success: true });
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.get('/api/salas', async (req, res) => {
        const { data } = await supabase.from('salas').select('*').order('id');
        res.json(data || []);
    });

    app.get('/api/dashboard/stats', async (req, res) => {
        try {
            const today = new Date().toLocaleDateString('en-CA');
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

    app.post('/api/alunos', async (req, res) => {
        try {
            const { 
                nome, email, telefone, cpf, endereco, curso_id, professor_id, 
                dia_semana, horario, sala_id, pacote_id, 
                data_primeira_parcela, dia_vencimento, valor_parcela, total_parcelas 
            } = req.body;

            // 1. Criar Aluno
            const { data: aluno, error: errA } = await supabase.from('alunos').insert([{ 
                nome, email, telefone, cpf, endereco,
                data_nascimento: req.body.data_nascimento || null,
                responsavel_nome: req.body.responsavel_nome || null,
                responsavel_telefone: req.body.responsavel_telefone || null,
                responsavel_cpf: req.body.responsavel_cpf || null
            }]).select().single();
            if (errA) throw errA;

            // 2. Criar Matrícula
            const { data: matricula, error: errM } = await supabase.from('matriculas').insert([{
                aluno_id: aluno.id, 
                curso_id, 
                professor_id, 
                dia_semana: dia_semana ? new Date(dia_semana).getDay() : null,
                horario, 
                sala_id, 
                pacote_id,
                data_primeira_parcela: data_primeira_parcela || null,
                dia_vencimento,
                valor_parcela,
                total_parcelas,
                data_inicio: dia_semana || null
            }]).select().single();
            if (errM) {
                await supabase.from('alunos').delete().eq('id', aluno.id);
                throw errM;
            }

            // 3. Automação de Aulas (Reserva na Agenda)
            const { data: pacote } = await supabase.from('pacotes').select('*').eq('id', pacote_id).single();
            const totalAulas = pacote?.total_aulas || 1;
            
            const aulasToInsert = [];
            let currentAulaDate = new Date(dia_semana);
            
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
                    sala_id,
                    data: currentAulaDate.toISOString().split('T')[0],
                    horario,
                    status: 'pendente',
                    tipo: 'regular'
                });
                // Próxima semana
                currentAulaDate.setDate(currentAulaDate.getDate() + 7);
            }
            const { error: errAulas } = await supabase.from('aulas').insert(aulasToInsert);
            if (errAulas) {
                await supabase.from('matriculas').delete().eq('id', matricula.id);
                await supabase.from('alunos').delete().eq('id', aluno.id);
                throw errAulas;
            }

            // 4. Geração de Pagamentos (Parcelas)
            const pagamentosToInsert = [];
            let currentVencimento = new Date(data_primeira_parcela);

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
                currentVencimento.setDate(dia_vencimento);
            }
            const { error: errPagamentos } = await supabase.from('pagamentos').insert(pagamentosToInsert);
            if (errPagamentos) {
                await supabase.from('aulas').delete().eq('matricula_id', matricula.id);
                await supabase.from('matriculas').delete().eq('id', matricula.id);
                await supabase.from('alunos').delete().eq('id', aluno.id);
                throw errPagamentos;
            }

            res.json({ id: aluno.id });
        } catch (error) { 
            console.error(error);
            res.status(500).json({ error: 'Erro ao cadastrar aluno, aulas e parcelas' }); 
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

    // Professores
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
        } catch (error) { res.status(500).json({ error: 'Erro ao salvar professor' }); }
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
            const { data, error } = await supabase.from('leads').insert([req.body]).select().single();
            if (error) throw error;
            res.json(data);
        } catch (error) { res.status(500).json({ error: 'Erro ao salvar lead' }); }
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
            await supabase.from('leads').update({ status: 'experimental_agendada' }).eq('id', lead_id);
            
            res.json(exp);
        } catch (error) { res.status(500).json({ error: 'Erro ao agendar aula experimental' }); }
    });

    app.get('/api/leads/experimentais-pendentes', async (req, res) => {
        try {
            const today = new Date().toLocaleDateString('en-CA');
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
    app.get('/api/pagamentos', async (req, res) => {
        try {
            const { mes } = req.query;
            // Só retornar pagamentos de alunos que NÃO estão arquivados
            let dbQuery = supabase
                .from('pagamentos')
                .select('*, aluno:aluno_id!inner(nome, status)')
                .neq('aluno.status', 'arquivado');
            
            if (mes && mes !== 'undefined' && mes !== '') {
                dbQuery = dbQuery.eq('referencia_mes_ano', String(mes).trim());
            }

            const { data, error } = await dbQuery.order('data_vencimento', { ascending: false });
            if (error) throw error;
            
            const formatted = data?.map((p: any) => ({ ...p, aluno_nome: p.aluno?.nome })) || [];
            res.json(formatted);
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    // Baixar (marcar como pago) um pagamento
    app.patch('/api/pagamentos/:id/baixa', async (req, res) => {
        try {
            const { id } = req.params;
            const { metodo_pagamento } = req.body;
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase.from('pagamentos')
                .update({ status: 'pago', data_pagamento: today, metodo_pagamento: metodo_pagamento || 'dinheiro' })
                .eq('id', id).select().single();
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

    // Adicionar entrada extra (ensaio, aluguel, multa, etc)
    app.post('/api/pagamentos/entrada-extra', async (req, res) => {
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

    // Resumo financeiro do mês
    app.get('/api/financeiro/resumo', async (req, res) => {
        try {
            const { mes } = req.query;
            const now = new Date();
            const mesRef = (mes && mes !== 'undefined' && mes !== '') ? String(mes).trim() : `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
            
            // Só somar pagamentos de alunos ativos
            const { data: pags, error } = await supabase.from('pagamentos')
                .select('valor, status, tipo_receita, aluno:aluno_id!inner(status)')
                .eq('referencia_mes_ano', mesRef)
                .neq('aluno.status', 'arquivado');
            
            if (error) throw error;

            const faturamentoPrevisto = pags?.reduce((acc, p) => acc + Number(p.valor), 0) || 0;
            const receitaMes = pags?.filter(p => p.status === 'pago').reduce((a, c) => a + Number(c.valor), 0) || 0;
            const pendentes = pags?.filter(p => p.status === 'pendente').reduce((a, c) => a + Number(c.valor), 0) || 0;
            
            res.json({ 
                faturamentoPrevisto, 
                receitaMes, 
                pendentes, 
                total: receitaMes 
            });
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.get('/api/financeiro/remuneracao', async (req, res) => {
        try {
            const { mes_ano } = req.query;
            if (!mes_ano || typeof mes_ano !== 'string') return res.status(400).json({ error: 'mes_ano inválido' });
            
            const [m, y] = mes_ano.split('/');
            const startDate = `${y}-${m}-01`;
            const endDate = new Date(Number(y), Number(m), 0).toISOString().split('T')[0];

            const { data: aulas, error } = await supabase.from('aulas')
                .select('*, professor:professor_id(*)')
                .gte('data', startDate)
                .lte('data', endDate)
                .in('status', ['realizada', 'falta_aluno']);

            if (error) throw error;

            const remunByProf: Record<number, any> = {};
            (aulas || []).forEach(aula => {
                if (!aula.professor) return;
                if (!remunByProf[aula.professor_id]) {
                    remunByProf[aula.professor_id] = {
                        professor_id: aula.professor_id,
                        professor_nome: aula.professor.nome,
                        total_aulas: 0,
                        valor_estimado: 0
                    };
                }
                remunByProf[aula.professor_id].total_aulas++;
                // Valor padrão arbitrário por aula (pode ser ajustado futuramente)
                remunByProf[aula.professor_id].valor_estimado += 35; 
            });

            res.json(Object.values(remunByProf));
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
    app.get('/api/agenda', async (req, res) => {
        try {
            const start = req.query.start as string;
            const end = req.query.end as string;
            
            console.log(`[AGENDA] Request params: start=${start}, end=${end}`);

            let query = supabase.from('aulas')
                .select('id, data, horario, status, professor_id, aluno_id, alunos!inner(nome, status), professores(nome), cursos(nome)')
                .eq('alunos.status', 'ativo')
                .order('data', { ascending: true });
            
            if (start) query = query.gte('data', start);
            if (end) query = query.lte('data', end);

            const { data: aulas, error: errA } = await query;
            if (errA) console.error('[AGENDA] Erro aulas:', errA);
            
            console.log(`[AGENDA] Retornadas ${aulas?.length || 0} aulas regulares`);
            if (aulas && aulas.length > 0) {
                console.log(`[AGENDA] Primeira aula retornada: ${aulas[0].data}`);
            }

            let expQuery = supabase.from('aulas_experimentais')
                .select('id, data, horario, status, professor_id, lead_id, leads(nome), professores(nome)');
                
            if (start) expQuery = expQuery.gte('data', start);
            if (end) expQuery = expQuery.lte('data', end);

            const { data: experimentais, error: errE } = await expQuery;

            const combined = [
                ...(aulas?.map((a: any) => ({
                    ...a,
                    id: `reg-${a.id}`,
                    originalId: a.id,
                    type: 'regular',
                    nome: a.alunos?.nome,
                    professor_nome: a.professores?.nome,
                    curso_nome: a.cursos?.nome || 'Curso'
                })) || []),
                ...(experimentais?.map((e: any) => ({
                    ...e,
                    id: `exp-${e.id}`,
                    originalId: e.id,
                    type: 'experimental',
                    nome: e.leads?.nome,
                    professor_nome: e.professores?.nome,
                    curso_nome: 'Experimental'
                })) || [])
            ];

            res.json(combined);
        } catch (error: any) {
            console.error('[AGENDA] Erro fatal:', error);
            res.status(500).json({ error: error.message });
        }
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
            const [type, originalId] = id.split('-');
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
        const [type, originalId] = id.split('-');
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

    app.delete('/api/agenda/:id', async (req, res) => {
        const { id } = req.params;
        const [type, originalId] = id.split('-');
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
            const pdfParse = (await import('pdf-parse')).default;
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
                                data_pagamento: isPaid ? (dates && dates[1] ? dates[1].split('/').reverse().join('-') : new Date().toISOString().split('T')[0]) : null,
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
                                data_vencimento: dates && dates[0] ? dates[0].split('/').reverse().join('-') : new Date().toISOString().split('T')[0],
                                data_pagamento: isPaid ? (dates && dates[1] ? dates[1].split('/').reverse().join('-') : new Date().toISOString().split('T')[0]) : null,
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
                            data_vencimento: dates && dates[0] ? dates[0].split('/').reverse().join('-') : new Date().toISOString().split('T')[0],
                            data_pagamento: isPaid ? (dates && dates[1] ? dates[1].split('/').reverse().join('-') : new Date().toISOString().split('T')[0]) : null,
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
            const { nome, descricao, pontos, regra_automatica, icone_url } = req.body;
            const payload: any = { nome, descricao };
            if (pontos !== undefined) payload.pontos = Number(pontos);
            if (regra_automatica !== undefined) payload.regra_automatica = regra_automatica || null;
            if (icone_url !== undefined) payload.icone_url = icone_url || null;

            const { data, error } = await supabase
                .from('gamificacao_conquistas')
                .insert([payload])
                .select()
                .single();
            if (error) throw error;
            res.json(data);
        } catch (error: any) { res.status(500).json({ error: error.message || 'Erro ao salvar conquista' }); }
    });

    app.delete('/api/gamificacao/conquistas/:id', async (req, res) => {
        try {
            const { error } = await supabase.from('gamificacao_conquistas').delete().eq('id', req.params.id);
            if (error) throw error;
            res.json({ success: true });
        } catch (error: any) { res.status(500).json({ error: error.message || 'Erro ao excluir conquista' }); }
    });

    app.post('/api/gamificacao/upload', upload.single('icon'), (req: any, res) => {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }
        const url = `/uploads/${req.file.filename}`;
        res.json({ url });
    });

    app.get('/api/gamificacao/ranking', async (req, res) => {
        try {
            const { data: alunos } = await supabase.from('alunos').select('id, nome');
            const { data: progresso } = await supabase.from('gamificacao_progresso').select('*, conquista:conquista_id(*)');
            
            const ranking = alunos?.map(al => {
                const prog = progresso?.filter(p => p.aluno_id === al.id) || [];
                const xp = prog.reduce((acc, p) => acc + (p.conquista?.pontos || 0), 0);
                
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
                    xp,
                    conquistas: Object.values(conquistasMap)
                };
            }).sort((a, b) => b.xp - a.xp) || [];

            res.json(ranking);
        } catch (error) { res.status(500).json({ error: 'Erro ao gerar ranking' }); }
    });

    app.post('/api/gamificacao/atribuir', async (req, res) => {
        try {
            const { aluno_id, conquista_id } = req.body;
            const { error } = await supabase.from('gamificacao_progresso').insert([{ aluno_id, conquista_id }]);
            if (error) throw error;
            res.json({ success: true });
        } catch (error) { res.status(500).json({ error: 'Erro ao atribuir conquista' }); }
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
                res.sendFile(path.join(distPath, 'index.html'));
            });
        }
    }

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

