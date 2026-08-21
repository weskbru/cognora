import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import postcssConfig from './postcss.config.js'

const r = (p) => path.resolve(__dirname, 'frontend/src', p)

export default defineConfig({
  root: 'frontend',
  envDir: '..',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      // Polling is required when Docker mounts the project from Windows.
      usePolling: true,
      interval: 300,
      ignored: ['**/dist/**', '**/.git/**', '**/backend/**'],
    },
  },
  css: {
    postcss: postcssConfig,
  },
  resolve: {
    alias: [
      { find: /^@\/components\/ui(.*)$/,          replacement: r('components/competitions/ui$1') },
      { find: /^@\/components\/layout(.*)$/,      replacement: r('components/competitions/layout$1') },
      { find: /^@\/components\/shared(.*)$/,      replacement: r('components/competitions/shared$1') },
      { find: /^@\/components\/documents(.*)$/,   replacement: r('components/competitions/documents$1') },
      { find: /^@\/components\/rewards(.*)$/,     replacement: r('components/competitions/rewards$1') },
      { find: /^@\/components\/leaderboard(.*)$/, replacement: r('components/competitions/leaderboard$1') },
      { find: /^@\/components\/modes(.*)$/,       replacement: r('components/competitions/modes$1') },
      { find: '@', replacement: r('') },
    ],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
