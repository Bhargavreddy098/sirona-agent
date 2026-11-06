import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'node20',
    outDir: 'dist',
    ssr: true,
    rollupOptions: {
      input: 'src/index.ts',
      output: {
        entryFileNames: 'index.mjs',
        format: 'esm',
      },
      external: [
        'node:sqlite',
        'node:fs',
        'node:path',
        'node:os',
        'node:crypto',
        'node:child_process',
        'node:stream',
        'node:worker_threads',
        'express',
        'socket.io',
      ],
    },
  },
});
