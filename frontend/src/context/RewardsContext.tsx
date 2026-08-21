import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useRewards } from '@/hooks/useRewards';
import RewardPopup from '@/components/rewards/RewardPopup';
import type { RewardsContextValue } from '@/types/rewards';

const RewardsContext = createContext<RewardsContextValue | null>(null);

export function RewardsProvider({ children }: { children: ReactNode }) {
  const rewards = useRewards();

  return (
    <RewardsContext.Provider value={rewards}>
      {children}
      <RewardPopup popup={rewards.rewardPopup} onClose={rewards.clearRewardPopup} />
    </RewardsContext.Provider>
  );
}

export function useRewardsContext(): RewardsContextValue {
  const ctx = useContext(RewardsContext);
  if (!ctx) throw new Error('useRewardsContext must be inside RewardsProvider');
  return ctx;
}
