import type { UserProgress } from '@/types/entities';

export interface RewardPopupState {
  xp: number;
  reason: string;
  levelUp: boolean;
  newLevel: number | null;
}

export interface RewardNotification extends RewardPopupState {
  id: number;
  date: string;
}

export type ProfileUpdate = Partial<Pick<UserProgress, 'display_name' | 'avatar_emoji' | 'avatar_url'>>;

export interface RewardsContextValue {
  progress: UserProgress | null;
  loading: boolean;
  rewardPopup: RewardPopupState | null;
  clearRewardPopup: () => void;
  notifications: RewardNotification[];
  unreadCount: number;
  clearUnread: () => void;
  addXPForCorrectAnswer: () => Promise<void>;
  addXPForWrongAnswer: () => Promise<void>;
  addXPForSummary: () => Promise<void>;
  addXPForDocument: () => Promise<void>;
  updateProfile: (fields: ProfileUpdate) => Promise<void>;
  refreshProgress: () => Promise<void>;
}
