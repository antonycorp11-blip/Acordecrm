-- Gamificação 2.0, Avatares e Aulas em Vídeo (Supabase Postgres)

-- 1. Temporadas
CREATE TABLE IF NOT EXISTS temporadas (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    data_inicio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_fim TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'ativa' -- 'ativa' ou 'inativa'
);

-- Insere a primeira temporada por padrão
INSERT INTO temporadas (nome, status) VALUES ('Fundação', 'ativa') ON CONFLICT DO NOTHING;

-- Atualiza a tabela gamificacao_conquistas
ALTER TABLE gamificacao_conquistas ADD COLUMN IF NOT EXISTS temporada_id INTEGER REFERENCES temporadas(id);

-- Cria a tabela para rastrear os pontos de cada aluno por temporada
CREATE TABLE IF NOT EXISTS aluno_pontos_temporada (
    id SERIAL PRIMARY KEY,
    aluno_id INTEGER REFERENCES alunos(id) ON DELETE CASCADE,
    temporada_id INTEGER REFERENCES temporadas(id) ON DELETE CASCADE,
    pontos INTEGER DEFAULT 0,
    UNIQUE(aluno_id, temporada_id)
);

-- 2. Feed de Atividades
CREATE TABLE IF NOT EXISTS feed_atividades (
    id SERIAL PRIMARY KEY,
    aluno_id INTEGER REFERENCES alunos(id) ON DELETE SET NULL, -- Pode ser nulo se for um evento global
    mensagem TEXT NOT NULL,
    tipo TEXT NOT NULL, -- 'trofeu', 'presenca', 'novo_aluno', 'jogo', 'global'
    icone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Configuração de Avatar do Aluno
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS avatar_config JSONB DEFAULT '{"genero": "masculino", "cabelo": "1", "oculos": "0", "roupa": "1"}';

-- 4. Ficha de Aula / Treino - Upload de Fotos
ALTER TABLE aulas ADD COLUMN IF NOT EXISTS anexos_urls JSONB DEFAULT '[]';

-- 5. Aulas em Vídeo
CREATE TABLE IF NOT EXISTS aulas_video (
    id SERIAL PRIMARY KEY,
    youtube_url TEXT NOT NULL,
    youtube_id TEXT NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT,
    professor_id INTEGER REFERENCES professores(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS aulas_video_questoes (
    id SERIAL PRIMARY KEY,
    aula_video_id INTEGER REFERENCES aulas_video(id) ON DELETE CASCADE,
    pergunta TEXT NOT NULL,
    opcoes JSONB NOT NULL, -- Ex: ["A", "B", "C", "D"]
    resposta_correta INTEGER NOT NULL -- Índice da resposta correta (0 a 3)
);

CREATE TABLE IF NOT EXISTS aluno_video_progresso (
    id SERIAL PRIMARY KEY,
    aluno_id INTEGER REFERENCES alunos(id) ON DELETE CASCADE,
    aula_video_id INTEGER REFERENCES aulas_video(id) ON DELETE CASCADE,
    assistido BOOLEAN DEFAULT false,
    questionario_respondido BOOLEAN DEFAULT false,
    trofeu_resgatado BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(aluno_id, aula_video_id)
);
