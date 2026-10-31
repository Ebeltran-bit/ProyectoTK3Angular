import { defineConfig } from 'vitest/config';

// Tests de la lógica del juego (funciones puras, sin navegador ni Angular)
export default defineConfig({
  test: {
    include: ['src/app/juego/**/*.spec.ts'],
    environment: 'node',
    // Hasta que llegue el motor de ritmo (etapa 3) no hay tests del juego
    passWithNoTests: true,
  },
});
