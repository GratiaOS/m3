import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    // SVGR runs before React so the generated JSX is handled correctly
    svgr({
      svgrOptions: {
        icon: false, // keep original viewBox/size
        exportType: 'default',
      },
      // Only transform `?react` imports to avoid hijacking plain URL imports
      include: '**/*.svg?react',
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@gratiaos/presence-kernel': path.resolve(__dirname, '../../garden-core/packages/presence-kernel/src/index.ts'),
    },
  },
});
