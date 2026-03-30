-- ============================================================
-- Cognora — Setup do banco de dados no Supabase
-- Cole este SQL no SQL Editor do painel Supabase e execute
-- ============================================================

-- Subjects (Materias)
create table if not exists subjects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  created_date timestamptz default now()
);

-- Documents (Documentos PDF)
create table if not exists documents (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  status text default 'pending' check (status in ('pending', 'processing', 'completed', 'error')),
  subject_id uuid references subjects(id) on delete set null,
  created_date timestamptz default now()
);

-- Questions (Questoes geradas por IA)
create table if not exists questions (
  id uuid default gen_random_uuid() primary key,
  text text not null,
  type text check (type in ('multiple_choice', 'true_false', 'essay')),
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  subject_id uuid references subjects(id) on delete set null,
  document_id uuid references documents(id) on delete set null,
  options jsonb,
  correct_answer text,
  created_date timestamptz default now()
);

-- Summaries (Resumos gerados por IA)
create table if not exists summaries (
  id uuid default gen_random_uuid() primary key,
  content text,
  document_id uuid references documents(id) on delete cascade,
  created_date timestamptz default now()
);

-- Competitions (Competicoes)
create table if not exists competitions (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  mode text check (mode in ('duel', 'time_attack', 'weekly_league')),
  status text default 'waiting' check (status in ('waiting', 'active', 'finished')),
  host_email text,
  participants jsonb default '[]',
  question_count integer default 5,
  time_limit_seconds integer,
  invite_code text unique,
  created_date timestamptz default now()
);

-- UserProgress (Progresso e XP dos usuarios)
create table if not exists user_progress (
  id uuid default gen_random_uuid() primary key,
  user_email text unique not null,
  xp integer default 0,
  level integer default 1,
  streak_days integer default 0,
  last_active_date date,
  total_questions_answered integer default 0,
  total_correct_answers integer default 0,
  total_summaries_generated integer default 0,
  total_documents_uploaded integer default 0,
  xp_history jsonb default '[]'
);

-- ============================================================
-- Politicas de acesso (RLS) — permissao publica para dev
-- Ajuste conforme necessario para producao
-- ============================================================

alter table subjects enable row level security;
alter table documents enable row level security;
alter table questions enable row level security;
alter table summaries enable row level security;
alter table competitions enable row level security;
alter table user_progress enable row level security;

-- Acesso total para usuarios autenticados (simples para dev)
create policy "Authenticated full access" on subjects
  for all to authenticated using (true) with check (true);

create policy "Authenticated full access" on documents
  for all to authenticated using (true) with check (true);

create policy "Authenticated full access" on questions
  for all to authenticated using (true) with check (true);

create policy "Authenticated full access" on summaries
  for all to authenticated using (true) with check (true);

create policy "Authenticated full access" on competitions
  for all to authenticated using (true) with check (true);

create policy "Authenticated full access" on user_progress
  for all to authenticated using (true) with check (true);
