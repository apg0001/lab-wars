import { defineConfig } from 'vitest/config';

// GitHub Pages 프로젝트 경로(/manga-wars/)에서도 동작하도록 상대 경로로 빌드한다.
export default defineConfig({
  base: './',
  build: { target: 'es2022' },
  test: { include: ['tests/**/*.test.ts', 'server/tests/**/*.test.ts'] },
});
