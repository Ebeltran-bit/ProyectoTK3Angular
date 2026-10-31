import { defineConfig } from 'vitest/config';

// Tests de la lógica del juego (funciones puras, sin navegador ni Angular)
export default defineConfig({
  test: {
    include: ['src/app/juego/**/*.spec.ts'],
    environment: 'node',
  },
});
