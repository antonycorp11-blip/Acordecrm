/**
 * Vercel Serverless Handler
 * Implementação direta e leve para a Vercel — não importa o server.ts monolítico.
 * O server.ts continua sendo usado para desenvolvimento local (npm run dev).
 */
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const JWT_SECRET = process.env.JWT_SECRET || 'studio-acorde-secret-key-2024';
const BACKEND_SECRET = 'studio-acorde-secret-key-2024';

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { 'x-backend-secret': BACKEND_SECRET } }
  });
}

function jsonResponse(res: any, status: number, data: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(status).end(JSON.stringify(data));
}

function getToken(req: any): any {
  const auth = req.headers['authorization'];
  if (!auth) return null;
  const token = auth.split(' ')[1];
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export default async function handler(req: any, res: any) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  const url: string = req.url || '';
  const method: string = req.method || 'GET';
  const supabase = getSupabase();

  // ── GET /api/ping ──────────────────────────────────────────────────────
  if (url.includes('/api/ping')) {
    return jsonResponse(res, 200, { message: 'pong' });
  }

  // ── POST /api/auth/register ────────────────────────────────────────────
  if (url.includes('/api/auth/register') && method === 'POST') {
    try {
      const { nome, email, password } = req.body || {};
      if (!nome || !email || !password) {
        return jsonResponse(res, 400, { error: 'Nome, email e senha são obrigatórios.' });
      }

      const { data: existing } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', email);

      if (existing && existing.length > 0) {
        return jsonResponse(res, 400, { error: 'Email já cadastrado.' });
      }

      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(password, salt);

      const { data: user, error } = await supabase
        .from('usuarios')
        .insert([{ nome, email, senha: hashedPassword, role: 'aluno' }])
        .select()
        .single();

      if (error) {
        console.error('Register DB error:', error);
        return jsonResponse(res, 500, { error: 'Erro ao criar conta: ' + error.message });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '1d' }
      );
      return jsonResponse(res, 200, {
        token,
        user: { id: user.id, nome: user.nome, email: user.email, role: user.role }
      });
    } catch (e: any) {
      console.error('Register exception:', e);
      return jsonResponse(res, 500, { error: 'Erro interno: ' + e.message });
    }
  }

  // ── POST /api/auth/login ───────────────────────────────────────────────
  if (url.includes('/api/auth/login') && method === 'POST') {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return jsonResponse(res, 400, { error: 'Email e senha são obrigatórios.' });
      }

      const { data: user, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !user) {
        return jsonResponse(res, 401, { error: 'Credenciais inválidas.' });
      }

      const valid = bcrypt.compareSync(password, user.senha);
      if (!valid) {
        return jsonResponse(res, 401, { error: 'Credenciais inválidas.' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '1d' }
      );
      return jsonResponse(res, 200, {
        token,
        user: { id: user.id, nome: user.nome, email: user.email, role: user.role }
      });
    } catch (e: any) {
      console.error('Login exception:', e);
      return jsonResponse(res, 500, { error: 'Erro interno: ' + e.message });
    }
  }

  // ── Rotas autenticadas — verifica token ────────────────────────────────
  const user = getToken(req);
  if (!user) {
    return jsonResponse(res, 401, { error: 'Acesso negado: Token inválido ou ausente.' });
  }

  // ── GET /api/usuarios ──────────────────────────────────────────────────
  if (url.includes('/api/usuarios') && method === 'GET') {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nome, email, role')
      .order('nome');
    if (error) return jsonResponse(res, 500, { error: error.message });
    return jsonResponse(res, 200, data);
  }

  // ── POST /api/usuarios ─────────────────────────────────────────────────
  if (url.includes('/api/usuarios') && method === 'POST') {
    try {
      const { nome, email, password, role } = req.body || {};
      const { data: existing } = await supabase.from('usuarios').select('id').eq('email', email);
      if (existing && existing.length > 0) {
        return jsonResponse(res, 400, { error: 'Email já cadastrado.' });
      }
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(password, salt);
      const { data, error } = await supabase
        .from('usuarios')
        .insert([{ nome, email, senha: hashedPassword, role: role || 'aluno' }])
        .select()
        .single();
      if (error) return jsonResponse(res, 500, { error: error.message });
      return jsonResponse(res, 201, data);
    } catch (e: any) {
      return jsonResponse(res, 500, { error: e.message });
    }
  }

  // ── DELETE /api/usuarios/:id ───────────────────────────────────────────
  if (url.match(/\/api\/usuarios\/\d+/) && method === 'DELETE') {
    const id = url.split('/').pop();
    const { error } = await supabase.from('usuarios').delete().eq('id', id);
    if (error) return jsonResponse(res, 500, { error: error.message });
    return jsonResponse(res, 200, { success: true });
  }

  // ── Delegar todas as outras rotas ao server.ts (local dev não chega aqui) ──
  // Em produção, rotas não mapeadas acima retornam 404
  return jsonResponse(res, 404, { error: 'Rota não encontrada na API serverless.' });
}
