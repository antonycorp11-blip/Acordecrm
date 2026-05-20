const fetch = require('node-fetch');

async function main() {
  const payload = {
    migracao_id: "80f1728c-b63f-4225-8fa2-1e8620e92fdf",
    nome: "DAVI MIGUEL GOMES DE BRITO",
    email: "",
    telefone: "",
    cpf: null,
    endereco: "Rua I, 03, QUADRA 03\nSão Sebastião\n78098254 - Cuiabá - MT",
    data_nascimento: "14/10/2015",
    responsavel_nome: "JACKELINE SANTOS GOMES",
    responsavel_telefone: "(65) 99253-1779",
    responsavel_cpf: "057.486.541-13",
    curso_id: 1,
    professor_id: 2,
    dia_semana: "terca",
    horario: "17:00",
    pacote_id: 5,
    aulas_restantes: 10,
    reposicoes: 1,
    faturas_pendentes: 1,
    fatura_mes_atraso: false,
    valor_parcela: 350,
    valor_desconto: 250,
    dia_vencimento: 10,
    total_parcelas: 12
  };

  const response = await fetch('http://localhost:3000/api/alunos/migracao', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + (process.env.VITE_SUPABASE_ANON_KEY || '')
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  console.log('MIGRATION API RESULT:', result);
}

main().catch(console.error);
