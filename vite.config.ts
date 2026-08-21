import viteFastifyBuild from '@fastify/vite/plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [viteFastifyBuild({ spa: true }), react()],
  build: {
    outDir: 'dist',
  },
});
