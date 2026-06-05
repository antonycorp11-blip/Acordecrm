import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const url = 'https://saojbwipdxebibjmtxqc.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhb2pid2lwZHhlYmliam10eHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzcxODMsImV4cCI6MjA4NDE1MzE4M30.X9FmXtsbqGg1N-2z6UVSW7PoZmC7vK2K-HNsLLbRpNA';

const supabase = createClient(url, key);

async function check() {
  const { data: alunos, error: err1 } = await supabase.from('alunos').select('id, nome, email');
  console.log("Alunos error:", err1);
  console.log("Alunos:", alunos?.filter(a => a.nome.toLowerCase().includes('luan')));
}
check();
