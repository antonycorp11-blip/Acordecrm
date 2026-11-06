-- Schema do Banco de Dados para Studio Acorde (PostgreSQL Compatible)

-- Tabela de Alunos
CREATE TABLE IF NOT EXISTS alunos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT UNIQUE,
    telefone TEXT,
    data_nascimento TEXT,
    responsavel_nome TEXT,
    responsavel_telefone TEXT,
    endereco TEXT,
    data_cadastro TEXT DEFAULT (datetime('now', 'localtime')),
    status TEXT DEFAULT 'ativo' -- 'ativo', 'inativo', 'inadimplente'
);

-- Tabela de Professores
CREATE TABLE IF NOT EXISTS professores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    telefone TEXT,
    especialidades TEXT, -- JSON ou lista separada por vírgula
    cor_agenda TEXT DEFAULT '#f97316', -- Cor para identificação na agenda
    status TEXT DEFAULT 'ativo'
);

-- Tabela de Cursos
CREATE TABLE IF NOT EXISTS cursos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    descricao TEXT
);

-- Tabela de Pacotes/Planos
CREATE TABLE IF NOT EXISTS pacotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    curso_id INTEGER,
    aulas_por_semana INTEGER DEFAULT 1,
    duracao_aula_minutos INTEGER DEFAULT 45,
    valor_mensal REAL NOT NULL,
    FOREIGN KEY (curso_id) REFERENCES cursos(id)
);

-- Tabela de Matrículas
CREATE TABLE IF NOT EXISTS matriculas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aluno_id INTEGER NOT NULL,
    pacote_id INTEGER NOT NULL,
    professor_id INTEGER NOT NULL,
    dia_semana INTEGER, -- 0 (domingo) a 6 (sábado)
    horario TEXT, -- HH:mm
    data_inicio TEXT DEFAULT (date('now')),
    status TEXT DEFAULT 'ativa',
    FOREIGN KEY (aluno_id) REFERENCES alunos(id),
    FOREIGN KEY (pacote_id) REFERENCES pacotes(id),
    FOREIGN KEY (professor_id) REFERENCES professores(id)
);

-- Tabela de Aulas (Agenda)
CREATE TABLE IF NOT EXISTS aulas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matricula_id INTEGER,
    aluno_id INTEGER NOT NULL,
    professor_id INTEGER NOT NULL,
    curso_id INTEGER NOT NULL,
    data TEXT NOT NULL, -- YYYY-MM-DD
    horario TEXT NOT NULL, -- HH:mm
    status TEXT DEFAULT 'pendente', -- 'pendente', 'realizada', 'falta_aluno', 'falta_professor', 'reagendada'
    nota_aula TEXT,
    reposicao_de_id INTEGER, -- Se for uma aula de reposição, aponta para a original
    FOREIGN KEY (matricula_id) REFERENCES matriculas(id),
    FOREIGN KEY (aluno_id) REFERENCES alunos(id),
    FOREIGN KEY (professor_id) REFERENCES professores(id),
    FOREIGN KEY (curso_id) REFERENCES cursos(id)
);

-- Tabela de Financeiro (Pagamentos)
CREATE TABLE IF NOT EXISTS pagamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aluno_id INTEGER NOT NULL,
    matricula_id INTEGER NOT NULL,
    valor REAL NOT NULL,
    data_vencimento TEXT NOT NULL,
    data_pagamento TEXT,
    metodo_pagamento TEXT,
    status TEXT DEFAULT 'pendente', -- 'pendente', 'pago', 'atrasado', 'cancelado'
    referencia_mes_ano TEXT, -- MM/YYYY
    FOREIGN KEY (aluno_id) REFERENCES alunos(id),
    FOREIGN KEY (matricula_id) REFERENCES matriculas(id)
);

-- Tabela de Gamificação
CREATE TABLE IF NOT EXISTS gamificacao_conquistas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    descricao TEXT,
    pontos_necessarios INTEGER DEFAULT 0,
    icone TEXT
);

CREATE TABLE IF NOT EXISTS aluno_pontos (
    aluno_id INTEGER PRIMARY KEY,
    pontos_total INTEGER DEFAULT 0,
    FOREIGN KEY (aluno_id) REFERENCES alunos(id)
);

-- Tabela de Usuários (Login)
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    role TEXT DEFAULT 'admin' -- 'admin', 'professor', 'secretaria'
);
