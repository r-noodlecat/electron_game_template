import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, 'src/game'),
  base: './',
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, 'dist/game'),
    emptyOutDir: true,
  },
  test: {
    root: path.resolve(__dirname),
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
  },
});
