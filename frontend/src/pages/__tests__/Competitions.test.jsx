import React from 'react'
import { render, screen } from '@testing-library/react'
import Competitions from '../Competitions'

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }) => {
    if (queryKey[0] === 'me') return { data: { email: 'testuser@example.com' } }
    if (queryKey[0] === 'competitions') return { data: [] }
    return { data: [] }
  },
  useMutation: () => ({ mutate: () => {}, isPending: false }),
  useQueryClient: () => ({ invalidateQueries: () => {} }),
}))

vi.mock('@/api/base44Client', () => ({ base44: { entities: { Competition: { list: () => [] } } } }))

vi.mock('@/components/competitions/CreateCompetitionDialog', () => ({ default: () => <div data-testid="create-dialog" /> }))
vi.mock('@/components/competitions/JoinCompetitionDialog', () => ({ default: () => <div data-testid="join-dialog" /> }))

vi.mock('react-router-dom', () => ({
  ...vi.importActual('react-router-dom'),
  Link: ({ children }) => <div>{children}</div>,
}))

test('shows competition mode cards section', () => {
  render(<Competitions />)
  expect(screen.getByText(/Duelo Rápido/i)).toBeInTheDocument()
  expect(screen.getByText(/Contra o Tempo/i)).toBeInTheDocument()
  expect(screen.getByText(/Liga Semanal/i)).toBeInTheDocument()
})