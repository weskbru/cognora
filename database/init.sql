-- Cognora — inicializacao do banco PostgreSQL
-- Executado automaticamente pelo Docker na primeira vez

CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    owner_email TEXT,
    created_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    file_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    created_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    statement TEXT NOT NULL,
    type TEXT CHECK (type IN ('multiple_choice', 'true_false', 'essay')),
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
    alternatives JSONB,
    correct_answer TEXT,
    explanation TEXT,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    created_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS summaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    created_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS competitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    mode TEXT CHECK (mode IN ('duel', 'time_attack', 'weekly_league')),
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
    host_email TEXT,
    participants JSONB DEFAULT '[]',
    question_count INTEGER DEFAULT 5,
    time_limit_seconds INTEGER,
    invite_code TEXT UNIQUE,
    created_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flashcards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    created_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS question_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    created_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT UNIQUE NOT NULL,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    streak_days INTEGER DEFAULT 0,
    last_active_date DATE,
    total_questions_answered INTEGER DEFAULT 0,
    total_correct_answers INTEGER DEFAULT 0,
    total_summaries_generated INTEGER DEFAULT 0,
    total_documents_uploaded INTEGER DEFAULT 0,
    xp_history JSONB DEFAULT '[]',
    display_name TEXT,
    avatar_emoji TEXT,
    avatar_url TEXT,
    plan TEXT DEFAULT 'free',
    daily_generations_used INTEGER DEFAULT 0,
    last_generation_date DATE
);

-- Migração para bancos existentes
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS daily_generations_used INTEGER DEFAULT 0;
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS last_generation_date DATE;
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS avatar_emoji TEXT;
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS owner_email TEXT;
