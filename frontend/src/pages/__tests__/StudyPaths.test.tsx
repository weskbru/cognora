import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { base44 } from '@/api/base44Client';
import type { StudyPath } from '@/types/entities';
import StudyPaths from '../StudyPaths';

vi.mock('@/api/base44Client', () => ({
  base44: {
    studyPaths: {
      list: vi.fn(),
      create: vi.fn(),
      updateProgress: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

function renderPage(): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <StudyPaths />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('StudyPaths', () => {
  it('mostra o formulário quando o usuário ainda não possui trilhas', async () => {
    vi.mocked(base44.studyPaths.list).mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('Monte sua trilha')).toBeInTheDocument();
    expect(screen.getByLabelText('Qual é o seu objetivo?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gerar trilha' })).toBeDisabled();
  });

  it('exibe a trilha concluída e salva um marco marcado', async () => {
    const path: StudyPath = {
      id: 'path-1',
      objective: 'Passar no concurso da Polícia Civil',
      target_date: '2026-12-20',
      weeks_count: 1,
      hours_per_week: 10,
      title: 'Preparação para a Polícia Civil',
      overview: 'Plano progressivo com fundamentos e revisão.',
      status: 'completed',
      weeks: [{
        number: 1,
        focus: 'Português e Raciocínio Lógico',
        topics: ['Interpretação', 'Concordância', 'Porcentagem'],
        milestones: ['Resolver 20 questões', 'Revisar os erros'],
        estimated_hours: 10,
      }],
      completed_milestones: [],
      created_at: '2026-08-24T12:00:00Z',
      updated_at: '2026-08-24T12:00:00Z',
    };
    vi.mocked(base44.studyPaths.list).mockResolvedValue([path]);
    vi.mocked(base44.studyPaths.updateProgress).mockResolvedValue({
      ...path,
      completed_milestones: ['1:0'],
    });

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Preparação para a Polícia Civil' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Resolver 20 questões' }));

    expect(base44.studyPaths.updateProgress).toHaveBeenCalledWith('path-1', ['1:0']);
  });
});
