require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

const supabase = createClient(supabaseUrl, supabaseKey);

const t2Trophies = [
  // 1. Teclado / Piano
  { nome: 'Reino de Dó', descricao: 'Escrever corretamente a escala de Dó Maior e executá-la no teclado sem erros.', pontos: 250, classe: 'Comum', instrumento: 'Teclado / Piano', temporada_id: 2 },
  { nome: 'Guardião de Sol', descricao: 'Escrever corretamente a escala de Sol Maior e executá-la no teclado sem erros.', pontos: 250, classe: 'Comum', instrumento: 'Teclado / Piano', temporada_id: 2 },
  { nome: 'Chama de Ré', descricao: 'Escrever corretamente a escala de Ré Maior e executá-la no teclado sem erros.', pontos: 250, classe: 'Comum', instrumento: 'Teclado / Piano', temporada_id: 2 },
  { nome: 'Espírito de Lá', descricao: 'Escrever corretamente a escala de Lá Maior e executá-la no teclado sem erros.', pontos: 250, classe: 'Comum', instrumento: 'Teclado / Piano', temporada_id: 2 },
  { nome: 'Poder de Mi', descricao: 'Escrever corretamente a escala de Mi Maior e executá-la no teclado sem erros.', pontos: 500, classe: 'Raro', instrumento: 'Teclado / Piano', temporada_id: 2 },
  { nome: 'Fortaleza de Si', descricao: 'Escrever corretamente a escala de Si Maior e executá-la no teclado sem erros.', pontos: 500, classe: 'Raro', instrumento: 'Teclado / Piano', temporada_id: 2 },
  { nome: 'Trono de Fá♯', descricao: 'Escrever corretamente a escala de Fá♯ Maior e executá-la no teclado sem erros.', pontos: 750, classe: 'Epico', instrumento: 'Teclado / Piano', temporada_id: 2 },
  { nome: 'Coroa de Dó♯', descricao: 'Escrever corretamente a escala de Dó♯ Maior e executá-la no teclado sem erros.', pontos: 1200, classe: 'Lendario', instrumento: 'Teclado / Piano', temporada_id: 2 },
  { nome: 'Campos de Fá', descricao: 'Escrever corretamente a escala de Fá Maior e executá-la no teclado sem erros.', pontos: 250, classe: 'Comum', instrumento: 'Teclado / Piano', temporada_id: 2 },
  { nome: 'Bastião de Sib', descricao: 'Escrever corretamente a escala de Sib Maior e executá-la no teclado sem erros.', pontos: 500, classe: 'Raro', instrumento: 'Teclado / Piano', temporada_id: 2 },
  { nome: 'Império de Mib', descricao: 'Escrever corretamente a escala de Mib Maior e executá-la no teclado sem erros.', pontos: 500, classe: 'Raro', instrumento: 'Teclado / Piano', temporada_id: 2 },
  { nome: 'Reino de Láb', descricao: 'Escrever corretamente a escala de Láb Maior e executá-la no teclado sem erros.', pontos: 750, classe: 'Epico', instrumento: 'Teclado / Piano', temporada_id: 2 },
  { nome: 'Trono de Réb', descricao: 'Escrever corretamente a escala de Réb Maior e executá-la no teclado sem erros.', pontos: 750, classe: 'Epico', instrumento: 'Teclado / Piano', temporada_id: 2 },
  { nome: 'Coroa de Solb', descricao: 'Escrever corretamente a escala de Solb Maior e executá-la no teclado sem erros.', pontos: 1200, classe: 'Lendario', instrumento: 'Teclado / Piano', temporada_id: 2 },
  { nome: 'Reino Perdido de Dób', descricao: 'Escrever corretamente a escala de Dób Maior e executá-la no teclado sem erros.', pontos: 1200, classe: 'Lendario', instrumento: 'Teclado / Piano', temporada_id: 2 },
  { nome: 'Mestre dos Sustenidos', descricao: 'Desbloquear todos os troféus das escalas com sustenidos.', pontos: 750, classe: 'Epico', instrumento: 'Teclado / Piano', temporada_id: 2 },
  { nome: 'Mestre das Escalas', descricao: 'Desbloquear todos os troféus de escalas maiores do teclado.', pontos: 1200, classe: 'Lendario', instrumento: 'Teclado / Piano', temporada_id: 2 },

  // 2. Cordas (Violão / Guitarra / Baixo)
  { nome: 'Reino de Dó', descricao: 'Escrever corretamente a escala de Dó Maior e executá-la na digitação ensinada pela escola.', pontos: 250, classe: 'Comum', instrumento: 'Cordas (Violão/Guitarra/Baixo)', temporada_id: 2 },
  { nome: 'Guardião de Sol', descricao: 'Escrever corretamente a escala de Sol Maior e executá-la na digitação ensinada pela escola.', pontos: 250, classe: 'Comum', instrumento: 'Cordas (Violão/Guitarra/Baixo)', temporada_id: 2 },
  { nome: 'Chama de Ré', descricao: 'Escrever corretamente a escala de Ré Maior e executá-la na digitação ensinada pela escola.', pontos: 250, classe: 'Comum', instrumento: 'Cordas (Violão/Guitarra/Baixo)', temporada_id: 2 },
  { nome: 'Espírito de Lá', descricao: 'Escrever corretamente a escala de Lá Maior e executá-la na digitação ensinada pela escola.', pontos: 250, classe: 'Comum', instrumento: 'Cordas (Violão/Guitarra/Baixo)', temporada_id: 2 },
  { nome: 'Poder de Mi', descricao: 'Escrever corretamente a escala de Mi Maior e executá-la na digitação ensinada pela escola.', pontos: 500, classe: 'Raro', instrumento: 'Cordas (Violão/Guitarra/Baixo)', temporada_id: 2 },
  { nome: 'Fortaleza de Si', descricao: 'Escrever corretamente a escala de Si Maior e executá-la na digitação ensinada pela escola.', pontos: 500, classe: 'Raro', instrumento: 'Cordas (Violão/Guitarra/Baixo)', temporada_id: 2 },
  { nome: 'Trono de Fá♯', descricao: 'Escrever corretamente a escala de Fá♯ Maior e executá-la na digitação ensinada pela escola.', pontos: 750, classe: 'Epico', instrumento: 'Cordas (Violão/Guitarra/Baixo)', temporada_id: 2 },
  { nome: 'Coroa de Dó♯', descricao: 'Escrever corretamente a escala de Dó♯ Maior e executá-la na digitação ensinada pela escola.', pontos: 1200, classe: 'Lendario', instrumento: 'Cordas (Violão/Guitarra/Baixo)', temporada_id: 2 },
  { nome: 'Campos de Fá', descricao: 'Escrever corretamente a escala de Fá Maior e executá-la na digitação ensinada pela escola.', pontos: 250, classe: 'Comum', instrumento: 'Cordas (Violão/Guitarra/Baixo)', temporada_id: 2 },
  { nome: 'Bastião de Sib', descricao: 'Escrever corretamente a escala de Sib Maior e executá-la na digitação ensinada pela escola.', pontos: 500, classe: 'Raro', instrumento: 'Cordas (Violão/Guitarra/Baixo)', temporada_id: 2 },
  { nome: 'Império de Mib', descricao: 'Escrever corretamente a escala de Mib Maior e executá-la na digitação ensinada pela escola.', pontos: 500, classe: 'Raro', instrumento: 'Cordas (Violão/Guitarra/Baixo)', temporada_id: 2 },
  { nome: 'Reino de Láb', descricao: 'Escrever corretamente a escala de Láb Maior e executá-la na digitação ensinada pela escola.', pontos: 750, classe: 'Epico', instrumento: 'Cordas (Violão/Guitarra/Baixo)', temporada_id: 2 },
  { nome: 'Trono de Réb', descricao: 'Escrever corretamente a escala de Réb Maior e executá-la na digitação ensinada pela escola.', pontos: 750, classe: 'Epico', instrumento: 'Cordas (Violão/Guitarra/Baixo)', temporada_id: 2 },
  { nome: 'Coroa de Solb', descricao: 'Escrever corretamente a escala de Solb Maior e executá-la na digitação ensinada pela escola.', pontos: 1200, classe: 'Lendario', instrumento: 'Cordas (Violão/Guitarra/Baixo)', temporada_id: 2 },
  { nome: 'Reino Perdido de Dób', descricao: 'Escrever corretamente a escala de Dób Maior e executá-la na digitação ensinada pela escola.', pontos: 1200, classe: 'Lendario', instrumento: 'Cordas (Violão/Guitarra/Baixo)', temporada_id: 2 },
  { nome: 'Mestre dos Sustenidos', descricao: 'Desbloquear todos os troféus das escalas com sustenidos.', pontos: 750, classe: 'Epico', instrumento: 'Cordas (Violão/Guitarra/Baixo)', temporada_id: 2 },
  { nome: 'Mestre das Escalas', descricao: 'Desbloquear todos os troféus de escalas maiores do instrumento.', pontos: 1200, classe: 'Lendario', instrumento: 'Cordas (Violão/Guitarra/Baixo)', temporada_id: 2 },

  // 3. Bateria
  { nome: 'Golpe do Aprendiz', descricao: 'Executar corretamente o rudimento Single Stroke em andamento definido pelo professor.', pontos: 250, classe: 'Comum', instrumento: 'Bateria', temporada_id: 2 },
  { nome: 'Ordem dos Singles', descricao: 'Executar Single Stroke com metrônomo sem perder o tempo.', pontos: 250, classe: 'Comum', instrumento: 'Bateria', temporada_id: 2 },
  { nome: 'Chama dos Doubles', descricao: 'Executar Double Stroke corretamente.', pontos: 250, classe: 'Comum', instrumento: 'Bateria', temporada_id: 2 },
  { nome: 'Vento dos Paradiddles', descricao: 'Executar Paradiddle com técnica correta.', pontos: 500, classe: 'Raro', instrumento: 'Bateria', temporada_id: 2 },
  { nome: 'Guardião dos Flams', descricao: 'Executar Flams com precisão.', pontos: 500, classe: 'Raro', instrumento: 'Bateria', temporada_id: 2 },
  { nome: 'Domínio dos Drags', descricao: 'Executar Drags corretamente.', pontos: 500, classe: 'Raro', instrumento: 'Bateria', temporada_id: 2 },
  { nome: 'Mestre dos Five Stroke', descricao: 'Executar Five Stroke Roll com fluidez.', pontos: 750, classe: 'Epico', instrumento: 'Bateria', temporada_id: 2 },
  { nome: 'Seven Stroke', descricao: 'Executar Seven Stroke Roll corretamente.', pontos: 750, classe: 'Epico', instrumento: 'Bateria', temporada_id: 2 },
  { nome: 'Exército dos Paradiddles', descricao: 'Dominar todas as variações de Paradiddle ensinadas na temporada.', pontos: 750, classe: 'Epico', instrumento: 'Bateria', temporada_id: 2 },
  { nome: 'Lenda dos Rudimentos', descricao: 'Dominar todos os rudimentos da Temporada 2.', pontos: 1200, classe: 'Lendario', instrumento: 'Bateria', temporada_id: 2 },

  // 4. Técnica Vocal
  { nome: 'Primeiro Fôlego', descricao: 'Executar corretamente o exercício de respiração ensinado na temporada.', pontos: 250, classe: 'Comum', instrumento: 'Técnica Vocal', temporada_id: 2 },
  { nome: 'Voz Desperta', descricao: 'Realizar aquecimento vocal completo sem erros.', pontos: 250, classe: 'Comum', instrumento: 'Técnica Vocal', temporada_id: 2 },
  { nome: 'Fluxo Constante', descricao: 'Sustentar uma nota por 20 segundos com apoio respiratório adequado.', pontos: 500, classe: 'Raro', instrumento: 'Técnica Vocal', temporada_id: 2 },
  { nome: 'Pulmão de Aço', descricao: 'Sustentar uma nota por 30 segundos mantendo afinação e apoio.', pontos: 500, classe: 'Raro', instrumento: 'Técnica Vocal', temporada_id: 2 },
  { nome: 'Voz Equilibrada', descricao: 'Executar todos os exercícios de ressonância corretamente.', pontos: 750, classe: 'Epico', instrumento: 'Técnica Vocal', temporada_id: 2 },
  { nome: 'Afinação Cristalina', descricao: 'Demonstrar excelente afinação em todos os exercícios da temporada.', pontos: 750, classe: 'Epico', instrumento: 'Técnica Vocal', temporada_id: 2 },
  { nome: 'Voz de Ouro', descricao: 'Concluir todos os exercícios vocais da Temporada 2 com excelência.', pontos: 1200, classe: 'Lendario', instrumento: 'Técnica Vocal', temporada_id: 2 },

  // 5. Teoria Musical
  { nome: 'Guardião dos Tons', descricao: 'Explicar corretamente o conceito de tom e semitom.', pontos: 250, classe: 'Comum', instrumento: 'Teoria Musical', temporada_id: 2 },
  { nome: 'Mestre dos Semitons', descricao: 'Identificar corretamente tons e semitons em exercícios propostos.', pontos: 250, classe: 'Comum', instrumento: 'Teoria Musical', temporada_id: 2 },
  { nome: 'Explorador das Escalas', descricao: 'Construir corretamente qualquer escala maior solicitada pelo professor.', pontos: 500, classe: 'Raro', instrumento: 'Teoria Musical', temporada_id: 2 },
  { nome: 'Decifrador Musical', descricao: 'Identificar a armadura de clave de todas as escalas maiores estudadas.', pontos: 500, classe: 'Raro', instrumento: 'Teoria Musical', temporada_id: 2 },
  { nome: 'Círculo das Quintas', descricao: 'Montar corretamente o ciclo das quintas sem consulta.', pontos: 750, classe: 'Epico', instrumento: 'Teoria Musical', temporada_id: 2 },
  { nome: 'Sábio da Harmonia', descricao: 'Explicar a formação das escalas maiores utilizando a sequência de tons e semitons.', pontos: 750, classe: 'Epico', instrumento: 'Teoria Musical', temporada_id: 2 },
  { nome: 'Arquiteto das Escalas', descricao: 'Construir corretamente todas as escalas maiores sem consulta.', pontos: 1200, classe: 'Lendario', instrumento: 'Teoria Musical', temporada_id: 2 },
  { nome: 'Oráculo Musical', descricao: 'Desbloquear todos os troféus de Teoria Musical da Temporada 2.', pontos: 1200, classe: 'Lendario', instrumento: 'Teoria Musical', temporada_id: 2 }
];

console.log(`Total T2 Trophies to insert: ${t2Trophies.length}`);
