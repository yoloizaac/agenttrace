import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base: './' keeps the build deployable under a subpath (e.g. GitHub Pages).
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
