-- Cognora — inicializacao do banco PostgreSQL
-- Executado automaticamente pelo Docker na primeira vez

CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    hashed_password TEXT,
    google_id TEXT UNIQUE,
    role TEXT DEFAULT 'user' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE
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
    questions_data JSONB DEFAULT '[]',
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

CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    subjects JSONB DEFAULT '[]',
    questions_planned JSONB DEFAULT '[]',
    questions_answered JSONB DEFAULT '[]',
    reviews_planned JSONB DEFAULT '[]',
    reviews_completed JSONB DEFAULT '[]',
    xp_awarded INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMP,
    abandoned_at TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subject_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    last_studied_at TIMESTAMPTZ,
    next_review_at TIMESTAMPTZ,
    review_stage INTEGER DEFAULT 1,
    completed_reviews_count INTEGER DEFAULT 0,
    accuracy_rate INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
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
    subscription_status TEXT DEFAULT 'inactive',
    plan_started_at TIMESTAMP,
    plan_expires_at TIMESTAMP,
    daily_generations_used INTEGER DEFAULT 0,
    last_generation_date DATE,
    summaries_used_month INTEGER DEFAULT 0,
    questions_used_month INTEGER DEFAULT 0,
    flashcards_used_month INTEGER DEFAULT 0,
    usage_month DATE,
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT
);

CREATE TABLE IF NOT EXISTS pix_payment_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    user_name TEXT,
    plan TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    pix_reference TEXT NOT NULL UNIQUE,
    pix_payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMP NOT NULL,
    paid_at TIMESTAMP,
    approved_at TIMESTAMP,
    approved_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    rejected_at TIMESTAMP,
    admin_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    admin_email TEXT NOT NULL,
    action TEXT NOT NULL,
    target_user_email TEXT,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migração para bancos existentes
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS daily_generations_used INTEGER DEFAULT 0;
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS last_generation_date DATE;
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS summaries_used_month INTEGER DEFAULT 0;
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS questions_used_month INTEGER DEFAULT 0;
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS flashcards_used_month INTEGER DEFAULT 0;
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS usage_month DATE;
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS avatar_emoji TEXT;
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;
ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS questions_data JSONB DEFAULT '[]';
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMP;
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS owner_email TEXT;

CREATE INDEX IF NOT EXISTS ix_users_username ON users (username);
CREATE INDEX IF NOT EXISTS ix_users_google_id ON users (google_id);
CREATE INDEX IF NOT EXISTS ix_prt_user_email ON password_reset_tokens (user_email);
CREATE INDEX IF NOT EXISTS ix_prt_token ON password_reset_tokens (token);
CREATE INDEX IF NOT EXISTS ix_pix_payment_requests_user_id ON pix_payment_requests (user_id);
CREATE INDEX IF NOT EXISTS ix_pix_payment_requests_user_email ON pix_payment_requests (user_email);
CREATE INDEX IF NOT EXISTS ix_pix_payment_requests_status ON pix_payment_requests (status);
CREATE INDEX IF NOT EXISTS ix_pix_payment_requests_reference ON pix_payment_requests (pix_reference);
CREATE INDEX IF NOT EXISTS ix_admin_audit_logs_admin_email ON admin_audit_logs (admin_email);
CREATE INDEX IF NOT EXISTS ix_admin_audit_logs_action ON admin_audit_logs (action);
CREATE INDEX IF NOT EXISTS ix_study_sessions_user_email ON study_sessions (user_email);
CREATE INDEX IF NOT EXISTS ix_study_sessions_status ON study_sessions (status);
CREATE INDEX IF NOT EXISTS ix_study_sessions_started_at ON study_sessions (started_at);
CREATE INDEX IF NOT EXISTS ix_subject_progress_user_email ON subject_progress (user_email);
CREATE INDEX IF NOT EXISTS ix_subject_progress_subject_id ON subject_progress (subject_id);
CREATE INDEX IF NOT EXISTS ix_subject_progress_next_review_at ON subject_progress (next_review_at);
