import React, { createContext, useContext } from 'react';
import { useRewards } from '@/hooks/useRewards';
import RewardPopup from '@/components/rewards/RewardPopup';

const RewardsContext = createContext(null);

export function RewardsProvider({ children }) {
  const rewards = useRewards();

  return (
    <RewardsContext.Provider value={rewards}>
      {children}
      <RewardPopup popup={rewards.rewardPopup} onClose={rewards.clearRewardPopup} />
    </RewardsContext.Provider>
  );
}

export function useRewardsContext() {
  const ctx = useContext(RewardsContext);
  if (!ctx) throw new Error('useRewardsContext must be inside RewardsProvider');
  return ctx;
}