import React from 'react'
import { render, screen } from '@testing-library/react'
import DocumentDetail from '../DocumentDetail'

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }) => {
    if (queryKey[0] === 'document') return { data: { id: '1', name: 'Nutrição PDF', status: 'completed', subject_id: 's1' } }
    if (queryKey[0] === 'subjects') return { data: [{ id: 's1', name: 'Nutrição' }] }
    if (queryKey[0] === 'summaries') return { data: [] }
    if (queryKey[0] === 'questions') return { data: [] }
    if (queryKey[0] === 'flashcards') return { data: [] }
    return { data: [] }
  },
  useQueryClient: () => ({ invalidateQueries: () => {} }),
}))

vi.mock('react-router-dom', () => ({
  ...vi.importActual('react-router-dom'),
  useNavigate: () => () => {},
  Link: ({ children }) => <div>{children}</div>,
}))

vi.mock('@/components/documents/SummarySection', () => ({ default: () => <div data-testid="summary-section" /> }))
vi.mock('@/components/documents/QuestionsSection', () => ({ default: () => <div data-testid="questions-section" /> }))
vi.mock('@/components/documents/FlashcardsSection', () => ({ default: () => <div data-testid="flashcards-section" /> }))

test('DocumentDetail renders document title and tabs', () => {
  render(<DocumentDetail />)
  expect(screen.getByText(/Nutrição PDF/i)).toBeInTheDocument()
  expect(screen.getByText(/Resumo/i)).toBeInTheDocument()
})