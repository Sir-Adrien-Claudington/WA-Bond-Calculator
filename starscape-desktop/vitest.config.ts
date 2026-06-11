import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      '@api':       resolve(__dirname, 'src/api'),
      '@constants': resolve(__dirname, 'src/constants'),
      '@scenes':    resolve(__dirname, 'src/scenes'),
      '@screens':   resolve(__dirname, 'src/screens'),
      '@store':     resolve(__dirname, 'src/store'),
      '@hooks':     resolve(__dirname, 'src/hooks'),
      '@data':      resolve(__dirname, 'src/data'),
      '@utils':     resolve(__dirname, 'src/utils'),
    },
  },
});
