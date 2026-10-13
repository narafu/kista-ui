import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    env: { TZ: 'UTC' },
    // Node 25+ 내장 Web Storage(--localstorage-file 없으면 undefined)가 jsdom의 localStorage를 가린다 — 끄고 jsdom 것을 쓴다
    execArgv: ['--no-experimental-webstorage'],
    exclude: [...configDefaults.exclude, '**/.next/**', 'e2e/**', 'tests/e2e/**', '**/.claude/**', '**/.worktrees/**'],
  },
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, './app'),
      '@widgets': path.resolve(__dirname, './widgets'),
      '@features': path.resolve(__dirname, './features'),
      '@entities': path.resolve(__dirname, './entities'),
      '@shared': path.resolve(__dirname, './shared'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/components': path.resolve(__dirname, './components'),
    },
  },
})
