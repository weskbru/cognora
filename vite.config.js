import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import tailwindAnimate from 'tailwindcss-animate'

const r = (p) => path.resolve(__dirname, 'frontend/src', p)

const tailwindConfig = {
  darkMode: ["class"],
  content: [
    path.resolve(__dirname, "frontend/index.html"),
    path.resolve(__dirname, "frontend/src/**/*.{ts,tsx,js,jsx}"),
  ],
  safelist: [
    'bg-primary/10', 'text-primary',
    'bg-accent/10', 'text-accent',
    'bg-emerald-100', 'text-emerald-600', 'text-emerald-700', 'bg-emerald-50', 'border-emerald-500',
    'bg-amber-100', 'text-amber-600', 'text-amber-700',
    'bg-blue-100', 'text-blue-700',
    'bg-red-100', 'text-red-700', 'bg-red-50', 'border-red-500',
    'bg-orange-100', 'text-orange-600', 'text-orange-700', 'text-orange-500',
    'bg-amber-500', 'text-amber-500', 'text-amber-600',
  ],
  theme: {
    extend: {
      fontFamily: { inter: ['var(--font-inter)'] },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))', '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))', '4': 'hsl(var(--chart-4))', '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [tailwindAnimate],
}

export default defineConfig({
  root: 'frontend',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      // Polling necessário no Windows com Docker (inotify não propaga eventos do NTFS)
      usePolling: true,
      interval: 300,
    },
  },
  css: {
    postcss: {
      plugins: [tailwindcss(tailwindConfig), autoprefixer()],
    },
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
