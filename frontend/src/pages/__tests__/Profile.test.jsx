import React from 'react'
import { render, screen } from '@testing-library/react'
import Profile from '../Profile'

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'testuser@example.com' } }),
}))

vi.mock('@/context/RewardsContext', () => ({
  useRewardsContext: () => ({
    progress: {
      xp: 182,
      streak_days: 3,
      xp_history: [],
      user_email: 'testuser@example.com',
    },
    loading: false,
  }),
}))

vi.mock('@/hooks/useRewards', () => ({
  getLevelInfo: () => ({ level: 2, name: 'Estudante' }),
  getXpProgressPercent: () => 72,
  LEVELS: [{ level: 3, minXP: 250 }],
  XP_REWARDS: { CORRECT_ANSWER: 10, SUMMARY_GENERATED: 20, DOCUMENT_UPLOADED: 30, DAILY_LOGIN: 5 },
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: [] }),
}))

test('Profile renders level card and user name', () => {
  render(<Profile />)
  expect(screen.getAllByText(/Nível 2/i)[0]).toBeInTheDocument()
  expect(screen.getAllByText(/Estudante/i)[0]).toBeInTheDocument()
  expect(screen.getAllByText(/182/i)[0]).toBeInTheDocument()
})
