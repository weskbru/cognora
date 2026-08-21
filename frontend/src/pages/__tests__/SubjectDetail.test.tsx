import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { base44 } from '@/api/base44Client';
import type { Document, Subject } from '@/types/entities';
import SubjectDetail from '../SubjectDetail';

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'student@example.com' } }),
}));

vi.mock('@/components/documents/UploadDialog', () => ({ default: () => null }));

vi.mock('@/api/base44Client', () => ({
  base44: {
    entities: {
      Subject: { get: vi.fn() },
      Document: { filter: vi.fn() },
    },
  },
}));

const subject: Subject = {
  id: 'subject-1',
  name: 'Biologia',
  description: 'Citologia',
};

function renderDetail(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/subjects/subject-1']}>
        <Routes>
          <Route path="/subjects/:id" element={<SubjectDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => vi.clearAllMocks());

describe('SubjectDetail', () => {
  it('renderiza imediatamente com os dados ja carregados na lista', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData<Subject[]>(['subjects', 'student@example.com'], [subject]);
    queryClient.setQueryData<Document[]>(['documents'], []);

    renderDetail(queryClient);

    expect(screen.getByText('Biologia')).toBeInTheDocument();
    expect(screen.getByText('Nenhum documento nesta matéria')).toBeInTheDocument();
    await waitFor(() => {
      expect(base44.entities.Subject.get).not.toHaveBeenCalled();
      expect(base44.entities.Document.filter).not.toHaveBeenCalled();
    });
  });

  it('nao exibe estado vazio antes de terminar a consulta de documentos', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    let finishDocuments!: (documents: Document[]) => void;
    const documentsPromise = new Promise<Document[]>(resolve => { finishDocuments = resolve; });
    vi.mocked(base44.entities.Subject.get).mockResolvedValue(subject);
    vi.mocked(base44.entities.Document.filter).mockReturnValue(documentsPromise);

    renderDetail(queryClient);

    expect(await screen.findByText('Biologia')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum documento nesta matéria')).not.toBeInTheDocument();

    await act(async () => finishDocuments([]));

    expect(await screen.findByText('Nenhum documento nesta matéria')).toBeInTheDocument();
  });
});
