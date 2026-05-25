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
      'x-backend-secret': 'studio-acorde-secret-key-2024',
      'x-api-version': 'v1.6'
    }
  }
});

// Middleware JWT
const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    // Ignorar rotas públicas
    const publicRoutes = ['/api/ping', '/api/auth/login', '/api/auth/register', '/api/vagas', '/api/auth/check-student', '/api/auth/setup-password'];
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
                senha_plana: effectivePassword,
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
            const { data, error } = await supabase.from('usuarios').select('id, nome, email, role, senha_plana').order('nome');
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
                nome, email, senha: hashedPassword, senha_plana: effectivePassword, role
            }]).select('id, nome, email, role, senha_plana').single();
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
                updateData.senha_plana = effectivePassword;
            }

            const { data, error } = await supabase.from('usuarios').update(updateData).eq('id', id).select('id, nome, email, role, senha_plana').single();
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
            const email = (req.user?.email || '').toLowerCase().trim();
            const searchEmail = (email === 'aquilles1213@gmail.com') ? 'teste@teste.com' : email;

            // 1. Buscar o aluno logado
            const { data: aluno, error } = await supabase
                .from('alunos')
                .select('*, matriculas(*, cursos(nome))')
                .ilike('email', searchEmail)
                .single();
            
            if (error || !aluno) {
                // Tenta fallback para aluno de teste
                const { data: fallback, error: errFb } = await supabase.from('alunos').select('*, matriculas(*, cursos(nome))').eq('id', 3).maybeSingle();
                if (fallback) {
                    const activeCourse = (fallback.matriculas || []).find((m: any) => m?.status === 'ativa')?.cursos?.nome || 'STUDENT';
                    return res.json({ ...fallback, ranking: 1, curso_ativo: activeCourse, conquistas: [] });
                }
                return res.status(404).json({ error: 'Aluno não encontrado' });
            }

            // 2. Calcular Ranking e XP real (baseado em conquistas)
            const { data: allAlunos } = await supabase.from('alunos').select('id, xp');
            const { data: progresso } = await supabase.from('gamificacao_progresso').select('*, conquista:conquista_id(*)');
            
            const rankingList = (allAlunos || []).map(al => {
                const prog = progresso?.filter(p => p.aluno_id === al.id) || [];
                const xpCalculado = prog.reduce((acc, p) => acc + (p.conquista?.pontos || 0), 0);
                return { id: al.id, xp: (al.xp || 0) + xpCalculado };
            }).sort((a, b) => b.xp - a.xp);

            const myEntry = rankingList.find(r => r.id === aluno.id);
            const myRank = rankingList.findIndex(r => r.id === aluno.id) + 1;
            const myXp = myEntry ? myEntry.xp : (aluno.xp || 0);

            const activeCourse = (aluno.matriculas || []).find((m: any) => m?.status === 'ativa')?.cursos?.nome || 'STUDENT';

            const { data: solicitacoes } = await supabase
                .from('gamificacao_solicitacoes')
                .select('conquista_id, status')
                .eq('aluno_id', aluno.id);

            res.json({
                ...aluno,
                ranking: myRank,
                xp: myXp,
                curso_ativo: activeCourse,
                conquistas: progresso?.filter(p => p.aluno_id === aluno.id).map(p => ({
                    ...p.conquista,
                    data_conquista: p.created_at
                })) || [],
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
                curso_id, dia_semana, horario,
                valor_parcela, valor_com_desconto, dia_vencimento
            } = req.body;
            
            console.log(`[ALUNO_UPDATE_API] ID: ${studentId}`, { nome, curso_id, dia_semana, horario });

            // 1. Capturar dados atuais (e-mail antigo)
            const { data: oldAluno } = await supabase.from('alunos').select('email').eq('id', Number(studentId)).single();

            // 2. Atualizar Aluno (campos básicos)
            const updateFields: any = { nome, email, telefone, cpf, endereco, responsavel_nome, responsavel_telefone };
            Object.keys(updateFields).forEach(key => updateFields[key] === undefined && delete updateFields[key]);

            const { error: aluError } = await supabase.from('alunos').update(updateFields).eq('id', Number(studentId));
            if (aluError) {
                console.error('[ALUNO_UPDATE_ERROR]:', aluError);
                return res.status(500).json({ error: aluError.message, stage: 'aluno' });
            }

            // 3. Sincronizar Login (Usuários)
            if (oldAluno?.email && (nome || email)) {
                await supabase.from('usuarios')
                    .update({ nome: nome || undefined, email: email || undefined })
                    .eq('email', oldAluno.email);
            }

            // 4. Atualizar Matrícula Ativa (com busca robusta de ID)
            const matUpdate: any = {};
            if (curso_id && !isNaN(Number(curso_id))) matUpdate.curso_id = Number(curso_id);
            if (dia_semana !== undefined && dia_semana !== '' && !isNaN(Number(dia_semana))) matUpdate.dia_semana = Number(dia_semana);
            if (horario !== undefined && horario !== '') matUpdate.horario = horario;
            if (valor_parcela !== undefined) matUpdate.valor_parcela = valor_parcela === null || valor_parcela === '' ? null : Number(valor_parcela);
            if (valor_com_desconto !== undefined) matUpdate.valor_com_desconto = valor_com_desconto === null || valor_com_desconto === '' ? null : Number(valor_com_desconto);
            if (dia_vencimento !== undefined) matUpdate.dia_vencimento = dia_vencimento === null || dia_vencimento === '' ? null : Number(dia_vencimento);

            console.log(`[MATRICULA_UPDATE] Aluno ${studentId}, payload:`, matUpdate);

            if (Object.keys(matUpdate).length > 0) {
                // PASSO 1: Buscar a matrícula ativa (ou qualquer matrícula) do aluno via SELECT
                let matriculaId: string | null = null;
                
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

                // PASSO 2: Atualizar por ID
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

                    // PASSO 3: Reagendar Aulas Pendentes se o dia ou horário mudou
                    if (matUpdate.dia_semana !== undefined || matUpdate.horario !== undefined) {
                        const { data: aulasFuturas } = await supabase.from('aulas')
                            .select('id, data')
                            .eq('matricula_id', matriculaId)
                            .eq('status', 'pendente');
                            
                        if (aulasFuturas && aulasFuturas.length > 0) {
                            console.log(`[MATRICULA_UPDATE] Reagendando ${aulasFuturas.length} aulas pendentes na agenda...`);
                            
                            // Ordenar as aulas pendentes da mais próxima para a mais distante
                            const aulasOrdenadas = aulasFuturas.sort((a: any, b: any) => new Date(a.data).getTime() - new Date(b.data).getTime());
                            
                            // Achar a próxima data real possível para o novo dia da semana a partir de amanhã
                            let currentNextDay = new Date();
                            currentNextDay.setHours(12, 0, 0, 0);
                            // Pode começar a buscar a partir de hoje mesmo se ainda der tempo
                            // Para garantir segurança de agenda, vamos buscar a partir da data atual
                            
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
                                    // Pula pra próxima semana para a próxima aula do laço
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
                    const hoje = new Date().toISOString().split('T')[0];
                    const { data: aulasFuturas } = await supabase.from('aulas')
                        .select('id, data')
                        .eq('aluno_id', studentId)
                        .eq('status', 'pendente')
                        .gte('data', hoje);

                    if (aulasFuturas && aulasFuturas.length > 0) {
                        const novoDia = Number(matUpdate.dia_semana); // 0=Dom...6=Sáb
                        for (const aula of aulasFuturas) {
                            const dataAtual = new Date(aula.data + 'T12:00:00');
                            const diaAtual = dataAtual.getDay();

                            const updateAula: any = {};

                            if (diaAtual !== novoDia) {
                                // Calcula quantos dias avançar para chegar no novo dia da semana
                                let diff = novoDia - diaAtual;
                                if (diff <= 0) diff += 7; // Sempre avança (nunca volta no tempo)
                                const novaData = new Date(dataAtual);
                                novaData.setDate(novaData.getDate() + diff);
                                updateAula.data = novaData.toISOString().split('T')[0];
                            }

                            if (matUpdate.horario) updateAula.horario = matUpdate.horario;

                            if (Object.keys(updateAula).length > 0) {
                                await supabase.from('aulas').update(updateAula).eq('id', aula.id);
                            }
                        }
                        console.log(`[REAGENDAMENTO] ${aulasFuturas.length} aulas futuras reagendadas para dia ${matUpdate.dia_semana}.`);
                    }
                } else if (matUpdate.horario) {
                    // Só mudou o horário, manter os dias das aulas
                    const hoje = new Date().toISOString().split('T')[0];
                    await supabase.from('aulas')
                        .update({ horario: matUpdate.horario })
                        .eq('aluno_id', studentId)
                        .eq('status', 'pendente')
                        .gte('data', hoje);
                    console.log(`[HORARIO_UPDATE] Horário atualizado para aulas futuras do aluno ${studentId}.`);
                }
            }

            return res.json({ success: true, message: 'Dados sincronizados com sucesso' });
        } catch (error: any) {
            console.error('[API_FATAL_ERROR]:', error);
            res.status(500).json({ error: error.message, stage: 'fatal' });
        }
    });

    app.delete('/api/cursos/:id', async (req, res) => {
        try {
            const { error } = await supabase.from('cursos').delete().eq('id', req.params.id);
            if (error) throw error;
            res.json({ success: true });
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.post('/api/aulas', async (req: any, res) => {
        try {
            const { aluno_id, data, horario, horario_fim, curso_nome, status, conteudo, tarefa_casa, midias, xp_ganho } = req.body;
            
            if (!req.user) {
                return res.status(401).json({ error: 'Não autorizado' });
            }
            
            const { data: prof, error: profErr } = await supabase.from('professores')
                .select('*')
                .ilike('email', req.user.email)
                .maybeSingle();
                
            if (profErr || !prof) {
                return res.status(404).json({ error: 'Professor não cadastrado com este e-mail' });
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

            const newAula = {
                aluno_id,
                professor_id: prof.id,
                data,
                horario: horario || '12:00',
                horario_fim: calcHorarioFim(horario, horario_fim),
                curso_nome: curso_nome || 'Música',
                status: status || 'realizada',
                conteudo: conteudo || '',
                tarefa_casa: tarefa_casa || '',
                midias: midias || [],
                xp_ganho: xp_ganho || 50
            };

            const { data: createdAula, error: createErr } = await supabase.from('aulas').insert([newAula]).select().single();
            if (createErr) throw createErr;

            if (newAula.status === 'realizada') {
                const valorAula = Number(prof.valor_aula) || 0;
                const novoSaldo = (Number(prof.saldo) || 0) + valorAula;
                await supabase.from('professores').update({ saldo: novoSaldo }).eq('id', prof.id);

                const { data: aluno } = await supabase.from('alunos').select('xp').eq('id', aluno_id).single();
                if (aluno) {
                    const novoXp = (Number(aluno.xp) || 0) + Number(newAula.xp_ganho);
                    await supabase.from('alunos').update({ xp: novoXp }).eq('id', aluno_id);
                }
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

            // Lógica de Saldo de Professor por Presença/Falta
            if (aulaAntiga && aulaAntiga.professor_id) {
                const { data: prof } = await supabase.from('professores').select('valor_aula, saldo').eq('id', aulaAntiga.professor_id).single();
                if (prof) {
                    const valorAula = Number(prof.valor_aula) || 0;
                    let difSaldo = 0;
                    
                    const eraAtiva = ['realizada', 'falta_aluno'].includes(aulaAntiga.status);
                    const ehAtiva = ['realizada', 'falta_aluno'].includes(status);
                    
                    if (!eraAtiva && ehAtiva) {
                        difSaldo = valorAula;
                    } else if (eraAtiva && !ehAtiva) {
                        difSaldo = -valorAula;
                    }
                    
                    if (difSaldo !== 0) {
                        const novoSaldo = (Number(prof.saldo) || 0) + difSaldo;
                        await supabase.from('professores').update({ saldo: novoSaldo }).eq('id', aulaAntiga.professor_id);
                    }
                }
            }

            // Lógica de conceder XP para o aluno quando a aula é realizada
            if (status === 'realizada' && table === 'aulas' && data?.aluno_id) {
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
                data_primeira_parcela, dia_vencimento, valor_parcela, valor_com_desconto, total_parcelas,
                is_emusys_legacy, emusys_original_aulas, emusys_aulas_feitas, emusys_original_parcelas, emusys_parcelas_pagas, emusys_data_ultima_aula
            } = req.body;

            // 1. Criar Aluno
            let dataNascFormatada = req.body.data_nascimento || null;
            if (dataNascFormatada && dataNascFormatada.includes('/')) {
                const parts = dataNascFormatada.split('/');
                if (parts.length === 3) {
                    dataNascFormatada = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
            }

            const { data: aluno, error: errA } = await supabase.from('alunos').insert([{ 
                nome, 
                email: email && email.trim() !== '' ? email : null,
                telefone, cpf, endereco,
                data_nascimento: dataNascFormatada,
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
                dia_semana: dia_semana ? new Date(dia_semana + 'T12:00:00').getDay() : null,
                horario, 
                sala_id, 
                pacote_id,
                data_primeira_parcela: data_primeira_parcela || null,
                dia_vencimento,
                valor_parcela,
                valor_com_desconto,
                total_parcelas,
                data_inicio: dia_semana || null,
                is_emusys_legacy: is_emusys_legacy || false,
                emusys_aulas_feitas: emusys_aulas_feitas || 0,
                emusys_parcelas_pagas: emusys_parcelas_pagas || 0,
                emusys_data_ultima_aula: emusys_data_ultima_aula || null
            }]).select().single();
            if (errM) {
                await supabase.from('alunos').delete().eq('id', aluno.id);
                throw errM;
            }

            // 3. Automação de Aulas (Reserva na Agenda)
            const { data: pacote } = await supabase.from('pacotes').select('*').eq('id', pacote_id).single();
            const originalTotalAulas = is_emusys_legacy ? (Number(emusys_original_aulas) || 48) : (pacote?.total_aulas || 1);
            const aulasRestantes = is_emusys_legacy ? (originalTotalAulas - (Number(emusys_aulas_feitas) || 0)) : originalTotalAulas;
            
            const aulasToInsert = [];
            let currentAulaDate = new Date(dia_semana + 'T12:00:00');

            // Se for legado, podemos querer começar da data da última aula + 7 dias?
            // Se o usuário forneceu emusys_data_ultima_aula, usamos ela como base.
            if (is_emusys_legacy && emusys_data_ultima_aula) {
                currentAulaDate = new Date(emusys_data_ultima_aula + 'T12:00:00');
                currentAulaDate.setDate(currentAulaDate.getDate() + 7);
            }
            
            for (let i = 0; i < (aulasRestantes > 0 ? aulasRestantes : 0); i++) {
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
            let currentVencimento = new Date(data_primeira_parcela + 'T12:00:00');
            
            if (is_emusys_legacy && req.body.emusys_mes_inicio_parcela === 'proximo') {
                currentVencimento.setMonth(currentVencimento.getMonth() + 1);
            }
            
            const parcelasToGenerate = is_emusys_legacy ? ((Number(emusys_original_parcelas) || 12) - (Number(emusys_parcelas_pagas) || 0)) : (total_parcelas || 1);

            for (let i = 0; i < (parcelasToGenerate > 0 ? parcelasToGenerate : 0); i++) {
                pagamentosToInsert.push({
                    aluno_id: aluno.id,
                    matricula_id: matricula.id,
                    valor: valor_parcela,
                    valor_com_desconto: valor_com_desconto || null,
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
                valor_parcela, valor_desconto, dia_vencimento, total_parcelas
            } = req.body;

            const nAulas = Number(aulas_restantes);
            const nRepos = Number(reposicoes);
            const nFaturas = Number(faturas_pendentes);
            const nValor = Number(valor_parcela);
            const nDesconto = Number(valor_desconto);
            const nDiaVenc = Number(dia_vencimento);
            const nTotalParcelas = Number(total_parcelas);

            // 1. Criar Aluno
            let dataNascFormatada = data_nascimento || null;
            if (dataNascFormatada && dataNascFormatada.includes('/')) {
                const parts = dataNascFormatada.split('/');
                if (parts.length === 3) {
                    // Assume DD/MM/YYYY
                    dataNascFormatada = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
            }

            const { data: aluno, error: errA } = await supabase.from('alunos').insert([{ 
                nome, 
                email: email && email.trim() !== '' ? email : null,
                telefone, cpf, endereco,
                data_nascimento: dataNascFormatada,
                responsavel_nome: responsavel_nome || null,
                responsavel_telefone: responsavel_telefone || null,
                responsavel_cpf: responsavel_cpf || null,
                status: 'ativo'
            }]).select().single();
            if (errA) throw errA;

            // 2. Criar Matrícula
            const diasMap: { [key: string]: number } = { 'domingo': 0, 'segunda': 1, 'terca': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sabado': 6 };
            const diaIndex = typeof dia_semana === 'string' ? (diasMap[dia_semana.toLowerCase()] ?? 1) : dia_semana;

            const spDate = new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"});
            const now = new Date(spDate);
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const dataHojeLocal = `${yyyy}-${mm}-${dd}`;

            const formatLocalDateString = (d: Date) => {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const dt = String(d.getDate()).padStart(2, '0');
                return `${y}-${m}-${dt}`;
            };

            const { data: matricula, error: errM } = await supabase.from('matriculas').insert([{
                aluno_id: aluno.id, 
                curso_id, 
                professor_id, 
                dia_semana: diaIndex,
                horario, 
                pacote_id,
                dia_vencimento: nDiaVenc || 10,
                valor_parcela: nValor || 0,
                valor_com_desconto: nDesconto || null,
                total_parcelas: nTotalParcelas || 12,
                data_inicio: dataHojeLocal
            }]).select().single();
            if (errM) {
                await supabase.from('alunos').delete().eq('id', aluno.id);
                throw errM;
            }

            // 3. Criar Aulas Restantes
            if (nAulas > 0) {
                const aulasToInsert = [];
                let currentAulaDate = new Date(spDate);
                const targetDay = diaIndex;
                const currentDay = currentAulaDate.getDay();
                let diff = targetDay - currentDay;
                if (diff <= 0) diff += 7;
                currentAulaDate.setDate(currentAulaDate.getDate() + diff);

                for (let i = 0; i < nAulas; i++) {
                    while (isHoliday(currentAulaDate)) {
                        currentAulaDate.setDate(currentAulaDate.getDate() + 7);
                    }
                    aulasToInsert.push({
                        aluno_id: aluno.id,
                        matricula_id: matricula.id,
                        professor_id,
                        curso_id,
                        data: formatLocalDateString(currentAulaDate),
                        horario,
                        status: 'pendente',
                        tipo: 'regular'
                    });
                    currentAulaDate.setDate(currentAulaDate.getDate() + 7);
                }
                await supabase.from('aulas').insert(aulasToInsert);
            }

            // 4. Criar Reposições
            if (nRepos > 0) {
                const reposToInsert = [];
                for (let i = 0; i < nRepos; i++) {
                    reposToInsert.push({
                        aluno_id: aluno.id,
                        matricula_id: matricula.id,
                        professor_id,
                        curso_id,
                        data: '2099-12-31',
                        horario: '00:00',
                        status: 'pendente',
                        tipo: 'reposicao'
                    });
                }
                await supabase.from('aulas').insert(reposToInsert);
            }

            // 5. Geração de Pagamentos (Financeiro)
            const pagamentosToInsert = [];
            const vencimentoMesAtual = new Date(now.getFullYear(), now.getMonth(), nDiaVenc || 10);
            
            // 5.1. Parcela do Mês Atual (Apenas se estiver em atraso ou ainda não paga)
            if (fatura_mes_atraso) {
                pagamentosToInsert.push({
                    aluno_id: aluno.id,
                    matricula_id: matricula.id,
                    valor: nValor,
                    valor_com_desconto: nDesconto || null,
                    data_vencimento: formatLocalDateString(vencimentoMesAtual),
                    status: (vencimentoMesAtual < now) ? 'atrasado' : 'pendente',
                    tipo_receita: 'mensalidade',
                    referencia_mes_ano: `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`
                });
            }

            // 5.2. Parcelas Restantes (Futuras - A partir do mês que vem)
            if (nFaturas > 0) {
                for (let i = 1; i <= nFaturas; i++) {
                    const nextDate = new Date(now.getFullYear(), now.getMonth() + i, nDiaVenc || 10);
                    pagamentosToInsert.push({
                        aluno_id: aluno.id,
                        matricula_id: matricula.id,
                        valor: nValor,
                        valor_com_desconto: nDesconto || null,
                        data_vencimento: formatLocalDateString(nextDate),
                        status: 'pendente',
                        tipo_receita: 'mensalidade',
                        referencia_mes_ano: `${(nextDate.getMonth() + 1).toString().padStart(2, '0')}/${nextDate.getFullYear()}`
                    });
                }
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
            res.json(prof);
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });

    app.get('/api/professores', async (req, res) => {
        const { data } = await supabase.from('professores').select('*').order('nome');
        // Filter out duplicates by nome
        const uniqueData = data ? Array.from(new Map(data.map(item => [item.nome.trim().toLowerCase(), item])).values()) : [];
        res.json(uniqueData);
    });

    app.post('/api/professores', async (req, res) => {
        try {
            const body = { ...req.body };
            if (body.email === '') body.email = null;

            const { data, error } = await supabase.from('professores').insert([body]).select().single();
            if (error) {
                console.error('Erro Supabase (Professor):', error);
                return res.status(error.code === '23505' ? 409 : 500).json({ 
                    error: 'Erro ao salvar professor', 
                    message: error.message,
                    details: error.details
                });
            }
            res.json(data);
        } catch (error: any) { 
            res.status(500).json({ error: 'Erro ao salvar professor', message: error.message }); 
        }
    });

    app.put('/api/professores/:id', async (req, res) => {
        try {
            const body = { ...req.body };
            if (body.email === '') body.email = null;

            const { data, error } = await supabase.from('professores')
                .update(body)
                .eq('id', req.params.id)
                .select()
                .single();
            if (error) throw error;
            res.json(data);
        } catch (error) { res.status(500).json({ error: 'Erro ao atualizar professor' }); }
    });

    app.patch('/api/professores/:id', async (req, res) => {
        try {
            const body = { ...req.body };
            if (body.email === '') body.email = null;

            const { data, error } = await supabase.from('professores')
                .update(body)
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
            const { metodo_pagamento, valor_pago } = req.body;
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase.from('pagamentos')
                .update({ 
                    status: 'pago', 
                    data_pagamento: today, 
                    metodo_pagamento: metodo_pagamento || 'dinheiro',
                    valor_pago: valor_pago || null
                })
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
            
            // Só somar pagamentos de alunos ativos, trazendo matrículas para considerar desconto
            const { data: pags, error } = await supabase.from('pagamentos')
                .select('valor, status, tipo_receita, matricula_id, aluno:aluno_id!inner(status, matriculas(id, status, valor_com_desconto, valor_parcela))')
                .eq('referencia_mes_ano', mesRef)
                .neq('aluno.status', 'arquivado');
            
            if (error) throw error;

            let faturamentoPrevisto = 0;
            let receitaMes = 0;
            let pendentes = 0;

            if (pags) {
                for (const p of pags) {
                    let valorEfetivo = Number(p.valor);
                    
                    if (p.tipo_receita === 'mensalidade' && p.status === 'pendente') {
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
    app.get('/api/agenda', async (req: any, res) => {
        try {
            const start = (req.query.start || req.query.date) as string;
            const end = (req.query.end || req.query.date) as string;
            
            console.log(`[AGENDA] Request params: start=${start}, end=${end}`);

            let filterProfId = req.query.professor_id as string;
            let filterAlunoId: string | null = null;

            if (req.user && req.user.role === 'professor') {
                const { data: prof } = await supabase.from('professores').select('id').ilike('email', req.user.email).single();
                if (prof) {
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
                .select('id, data, horario, status, professor_id, aluno_id, conteudo, tarefa_casa, midias, xp_ganho, alunos!inner(nome, status), professores(nome), cursos(nome)')
                .eq('alunos.status', 'ativo')
                .order('data', { ascending: true });
            
            if (start) query = query.gte('data', start);
            if (end) query = query.lte('data', end);
            if (filterProfId) query = query.eq('professor_id', filterProfId);
            if (filterAlunoId) query = query.eq('aluno_id', filterAlunoId);

            const { data: aulas, error: errA } = await query;
            if (errA) console.error('[AGENDA] Erro aulas:', errA);
            
            console.log(`[AGENDA] Retornadas ${aulas?.length || 0} aulas regulares`);

            let expQuery = supabase.from('aulas_experimentais')
                .select('id, data, horario, status, professor_id, lead_id, leads(nome), professores(nome)');
                
            if (start) expQuery = expQuery.gte('data', start);
            if (end) expQuery = expQuery.lte('data', end);
            if (filterProfId) expQuery = expQuery.eq('professor_id', filterProfId);

            const { data: experimentais, error: errE } = await expQuery;

            const combined = [
                ...(aulas?.map((a: any) => ({
                    ...a,
                    id: `reg-${a.id}`,
                    originalId: a.id,
                    type: 'regular',
                    aluno_nome: a.alunos?.nome,
                    professor_nome: a.professores?.nome,
                    curso_nome: a.cursos?.nome || 'Curso'
                })) || []),
                ...(experimentais?.map((e: any) => ({
                    ...e,
                    id: `exp-${e.id}`,
                    originalId: e.id,
                    type: 'experimental',
                    aluno_nome: e.leads?.nome,
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
                const titulo = 'Confirme sua próxima aula! 🎸';
                const msg = `Olá ${aula.alunos.nome.split(' ')[0]}, precisamos confirmar sua presença na próxima aula. Toque aqui e acesse sua Área do Aluno!`;
                
                await sendPushNotification(titulo, msg, String(aula.alunos.id));
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
                const titulo = 'Aula Confirmada! ✅';
                const msg = `O aluno ${aula.alunos?.nome || 'seu aluno'} confirmou a presença na próxima aula!`;
                
                await supabase.from('notificacoes').insert([{
                    titulo, mensagem: msg, tipo: 'agenda', professor_id: aula.professores.id
                }]);

                await sendPushNotification(titulo, msg, String(aula.professores.id));
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
            const ext = path.extname(req.file.originalname) || '.webm';
            const filename = `studio/${Date.now()}_${req.file.filename}${ext}`;
            const fileBuffer = fs.readFileSync(req.file.path);
            const mimeType = req.file.mimetype || 'audio/webm';

            // Upload para Supabase Storage (bucket 'uploads') — URL permanente em produção
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(filename, fileBuffer, { contentType: mimeType, upsert: true });

            // Limpa arquivo temporário
            try { fs.unlinkSync(req.file.path); } catch {}

            if (uploadError) {
                console.error('[UPLOAD] Supabase Storage falhou:', uploadError.message);
                return res.status(500).json({ error: 'Falha ao salvar arquivo: ' + uploadError.message });
            }

            const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filename);
            const url = publicUrlData?.publicUrl || '';
            console.log('[UPLOAD] OK:', url);
            res.json({ url });
        } catch (error: any) {
            console.error('Erro no upload genérico index:', error);
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/gamificacao/ranking', async (req, res) => {
        try {
            const { data: alunos } = await supabase
                .from('alunos')
                .select('id, nome, xp, foto_url, status, matriculas(cursos(nome))')
                .eq('status', 'ativo');
            const { data: progresso } = await supabase.from('gamificacao_progresso').select('*, conquista:conquista_id(*)');
            
            const ranking = (alunos || []).map(al => {
                const prog = progresso?.filter(p => p.aluno_id === al.id) || [];
                // XP de conquistas (badges)
                const xpConquistas = prog.reduce((acc, p) => acc + (p.conquista?.pontos || 0), 0);
                // XP TOTAL = XP direto de presença (aulas realizadas) + XP de conquistas
                const xpTotal = (Number((al as any).xp) || 0) + xpConquistas;
                
                const conquistasMap: any = {};
                prog.forEach(p => {
                    const cid = p.conquista_id;
                    if (!conquistasMap[cid]) {
                        conquistasMap[cid] = { ...p.conquista, count: 0 };
                    }
                    conquistasMap[cid].count++;
                });

                const cursoNome = (al as any).matriculas?.find((m: any) => m?.cursos?.nome)?.cursos?.nome || 'STUDENT';

                return {
                    id: al.id,
                    nome: (al as any).nome,
                    foto_url: (al as any).foto_url,
                    curso: cursoNome,
                    xp: xpTotal,
                    xp_presenca: Number((al as any).xp) || 0,
                    xp_conquistas: xpConquistas,
                    conquistas: Object.values(conquistasMap)
                };
            }).sort((a, b) => b.xp - a.xp);

            res.json(ranking);
        } catch (error) { res.status(500).json({ error: 'Erro ao gerar ranking' }); }
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
            res.json({ success: true });
        } catch (error: any) {
            console.error('[GAMIFICACAO_ATRIBUIR] Erro ao atribuir conquista:', error);
            res.status(500).json({ error: error.message || 'Erro ao atribuir conquista' });
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
            }

            res.json({ success: true });
        } catch (error: any) {
            console.error('[GAMIFICACAO_REVISAR] Erro:', error);
            res.status(500).json({ error: error.message || 'Erro ao revisar solicitação' });
        }
    });

    // ==========================================
    // NOTIFICAÇÕES PUSH ONESIGNAL & LOCAL FEED
    // ==========================================
    async function sendPushNotification(titulo: string, mensagem: string, targetUserId?: string) {
        const appKey = process.env.ONESIGNAL_REST_API_KEY;
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

            const { data: aluno } = await supabase.from('alunos').select('id, nome').eq('email', email).single();
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

            res.json({ success: true, data: treino });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // 3. Upload de vídeo curto de treino (24h de duração)
    app.post('/api/treinos/upload-video', upload.single('video'), async (req: any, res) => {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo de vídeo enviado.' });
        }
        try {
            const email = req.user?.email;
            if (!email) return res.status(401).json({ error: 'Não autorizado.' });

            const { data: aluno } = await supabase.from('alunos').select('id, nome').eq('email', email).single();
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
            }

            let ext = path.extname(req.file.originalname) || '.mp4';
            let mimeType = req.file.mimetype || 'video/mp4';
            const extLower = ext.toLowerCase();

            // Bypass incondicional para iOS:
            if (mimeType.includes('quicktime') || extLower === '.mov' || extLower === '.qt') {
                mimeType = 'video/mp4';
                ext = '.mp4';
            } else if (!mimeType.startsWith('video/') || mimeType.includes('octet-stream')) {
                // Se cair de pára-quedas como octet-stream, preservamos a extensão para adivinhar
                if (extLower === '.webm') mimeType = 'video/webm';
                else mimeType = 'video/mp4';
            }

            const filename = `treinos/${aluno.id}_${Date.now()}_video${ext}`;
            const fileBuffer = fs.readFileSync(req.file.path);

            // O supabase client precisa do contentType certo para o player Web Mobile não quebrar.
            const { error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(filename, fileBuffer, { 
                    contentType: mimeType, 
                    upsert: true,
                    cacheControl: '3600'
                });

            try { fs.unlinkSync(req.file.path); } catch {}

            if (uploadError) {
                console.error('[TREINO_VIDEO_UPLOAD] Erro Storage:', uploadError.message);
                return res.status(500).json({ error: 'Falha ao salvar vídeo: ' + uploadError.message });
            }

            const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filename);
            const url = publicUrlData?.publicUrl || '';

            if (treino.video_url) {
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

