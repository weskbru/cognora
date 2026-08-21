export type EntityId = string;

export interface User {
  id?: EntityId;
  email: string;
  username?: string | null;
  full_name?: string | null;
  role?: string | null;
}

export interface Subject {
  id: EntityId;
  name: string;
  description?: string | null;
  owner_email?: string | null;
  created_date?: string;
}

export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface Document {
  id: EntityId;
  name: string;
  file_url?: string | null;
  status: DocumentStatus;
  subject_id?: EntityId | null;
  created_date?: string;
}

export interface QuestionAlternative { text: string; correct?: boolean; }

export interface Question {
  id: EntityId;
  statement: string;
  type?: string | null;
  difficulty?: string | null;
  alternatives?: QuestionAlternative[] | null;
  correct_answer?: string | null;
  explanation?: string | null;
  owner_email?: string | null;
  subject_id?: EntityId | null;
  document_id?: EntityId | null;
  created_date?: string;
}

export interface Summary { id: EntityId; content?: string | null; document_id?: EntityId | null; created_date?: string; }
export interface Flashcard { id: EntityId; front: string; back: string; owner_email?: string | null; subject_id?: EntityId | null; document_id?: EntityId | null; created_date?: string; }

export type CompetitionMode = 'duel' | 'time_attack' | 'weekly_league';
export type CompetitionStatus = 'waiting' | 'active' | 'finished';

export interface CompetitionParticipant {
  email: string;
  display_name?: string | null;
  status: string;
  score: number;
  correct: number;
  wrong: number;
  time_spent_seconds?: number | null;
  finished_at?: string | null;
}

export interface Competition {
  id: EntityId;
  title: string;
  mode: CompetitionMode;
  status: CompetitionStatus;
  host_email?: string | null;
  subject_id?: EntityId | null;
  participants?: CompetitionParticipant[] | null;
  questions_data?: Question[] | null;
  question_ids?: EntityId[] | null;
  question_count?: number | null;
  time_limit_seconds?: number | null;
  invite_code?: string | null;
  winner_email?: string | null;
  finished_at?: string | null;
  week_start?: string | null;
  week_end?: string | null;
  created_date?: string;
}

export interface XpHistoryEntry {
  amount: number;
  reason: string;
  date: string;
}

export interface UserProgress {
  id: EntityId;
  user_email: string;
  xp?: number | null;
  level?: number | null;
  streak_days?: number | null;
  display_name?: string | null;
  avatar_emoji?: string | null;
  avatar_url?: string | null;
  xp_history?: XpHistoryEntry[] | null;
  [key: string]: unknown;
}
export interface QuestionAttempt { id: EntityId; question_id: EntityId; user_email: string; is_correct: boolean; created_date?: string; }
export interface StudySession {
  id: EntityId;
  user_email: string;
  status: string;
  subjects?: Array<{ id: EntityId; name: string }>;
  questions_planned?: EntityId[];
  questions_answered?: EntityId[];
  reviews_planned?: EntityId[];
  reviews_completed?: EntityId[];
  xp_awarded?: number;
  created_at?: string;
}
export interface SubjectProgress {
  id: EntityId;
  user_email: string;
  subject_id: EntityId;
  last_studied_at?: string | null;
  next_review_at?: string | null;
  review_stage?: number | null;
  completed_reviews_count?: number | null;
  accuracy_rate?: number | null;
}

export interface GenerationStatus {
  plan: 'free' | 'pro' | 'premium';
  used: number;
  limit: number;
  remaining: number;
  has_daily_bonus: boolean;
  [key: string]: unknown;
}

export interface DashboardSnapshot {
  subjects: Subject[];
  documents: Document[];
  questions: Question[];
  summaries: Summary[];
  attempts: QuestionAttempt[];
  subject_progress: SubjectProgress[];
  completed_sessions: StudySession[];
  user_progress: UserProgress | null;
  limits: GenerationStatus;
}
