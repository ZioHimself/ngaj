import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        'packages/*/dist/',
        '**/*.spec.ts',
        '**/*.test.ts',
        '.agents/artifacts/',
        'installer/'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    },
    include: ['tests/**/*.spec.ts'],
    exclude: ['node_modules', 'dist', '.agents/artifacts', 'packages/*/dist']
  },
  resolve: {
    alias: {
      '@ngaj/shared': path.resolve(__dirname, './packages/shared/src'),
      '@ngaj/backend': path.resolve(__dirname, './packages/backend/src'),
      '@ngaj/frontend': path.resolve(__dirname, './packages/frontend/src'),
      '@ngaj/setup': path.resolve(__dirname, './packages/setup/src'),
      '@tests': path.resolve(__dirname, './tests')
    }
  }
});
