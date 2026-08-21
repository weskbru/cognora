import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import DocumentDetail from '../DocumentDetail'

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === 'document') return { data: { id: '1', name: 'Nutrição PDF', status: 'completed', subject_id: 's1' } }
    if (queryKey[0] === 'subjects') return { data: [{ id: 's1', name: 'Nutrição' }] }
    if (queryKey[0] === 'summaries') return { data: [] }
    if (queryKey[0] === 'questions') return { data: [] }
    if (queryKey[0] === 'flashcards') return { data: [] }
    return { data: [] }
  },
  useQueryClient: () => ({ invalidateQueries: () => {} }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => () => {},
    useParams: () => ({ id: '1' }),
    Link: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  }
})

vi.mock('@/components/documents/SummarySection', () => ({ default: () => <div data-testid="summary-section" /> }))
vi.mock('@/components/documents/QuestionsSection', () => ({ default: () => <div data-testid="questions-section" /> }))
vi.mock('@/components/documents/FlashcardsSection', () => ({ default: () => <div data-testid="flashcards-section" /> }))

test('DocumentDetail renders document title and tabs', () => {
  render(<DocumentDetail />)
  expect(screen.getByText(/Nutrição PDF/i)).toBeInTheDocument()
  expect(screen.getByText(/Resumo/i)).toBeInTheDocument()
})
