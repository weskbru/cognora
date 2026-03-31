import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['frontend/src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    setupFiles: ['frontend/src/setupTests.js'],
  },
  resolve: {
    alias: [
      { find: /^@\/components\/ui(.*)$/, replacement: path.resolve(__dirname, 'frontend/src/components/competitions/ui$1') },
      { find: /^@\/components\/layout(.*)$/, replacement: path.resolve(__dirname, 'frontend/src/components/competitions/layout$1') },
      { find: /^@\/components\/shared(.*)$/, replacement: path.resolve(__dirname, 'frontend/src/components/competitions/shared$1') },
      { find: /^@\/components\/documents(.*)$/, replacement: path.resolve(__dirname, 'frontend/src/components/competitions/documents$1') },
      { find: /^@\/components\/rewards(.*)$/, replacement: path.resolve(__dirname, 'frontend/src/components/competitions/rewards$1') },
      { find: /^@\/components\/leaderboard(.*)$/, replacement: path.resolve(__dirname, 'frontend/src/components/competitions/leaderboard$1') },
      { find: /^@\/components\/modes(.*)$/, replacement: path.resolve(__dirname, 'frontend/src/components/competitions/modes$1') },
      { find: /^@\/api(.*)$/, replacement: path.resolve(__dirname, 'frontend/src/api$1') },
      { find: /^@\/lib(.*)$/, replacement: path.resolve(__dirname, 'frontend/src/lib$1') },
      { find: /^@\/context(.*)$/, replacement: path.resolve(__dirname, 'frontend/src/context$1') },
      { find: /^@\/hooks(.*)$/, replacement: path.resolve(__dirname, 'frontend/src/hooks$1') },
      { find: '@', replacement: path.resolve(__dirname, 'frontend/src') },
    ],
  },
})
