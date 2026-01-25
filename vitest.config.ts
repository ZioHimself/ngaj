import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [
      ['tests/unit/components/**/*.tsx', 'jsdom'],
      ['tests/integration/dashboard/**/*.tsx', 'jsdom'],
    ],
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      // Only include backend code that has runtime logic
      include: [
        'packages/backend/src/**/*.ts'
      ],
      exclude: [
        'node_modules/**',
        '**/dist/**',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/index.ts'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    },
    include: ['tests/**/*.spec.ts', 'tests/**/*.spec.tsx'],
    exclude: ['node_modules', 'dist', '.agents/artifacts', 'packages/*/dist']
  },
  resolve: {
    alias: [
      // Shared package - use dist (built)
      { find: '@ngaj/shared', replacement: path.resolve(__dirname, './packages/shared/dist') },
      // Backend package - use src
      { find: /^@ngaj\/backend($|\/)/, replacement: path.resolve(__dirname, './packages/backend/src') + '$1' },
      // Frontend package - use src
      { find: /^@ngaj\/frontend($|\/)/, replacement: path.resolve(__dirname, './packages/frontend/src') + '$1' },
      // Setup package - use src for subpath imports
      { find: /^@ngaj\/setup\/(.*)/, replacement: path.resolve(__dirname, './packages/setup/src/$1') },
      { find: '@ngaj/setup', replacement: path.resolve(__dirname, './packages/setup/src') },
      // Tests
      { find: '@tests', replacement: path.resolve(__dirname, './tests') }
    ]
  }
});
