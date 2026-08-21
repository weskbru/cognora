import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        const status = typeof error === 'object' && error !== null && 'status' in error
          ? Number(error.status)
          : 0;
        return failureCount < 1 && (status === 0 || status >= 500);
      },
    },
  },
});
