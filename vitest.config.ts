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
    alias: {
      // Shared package - use dist (built)
      '@ngaj/shared': path.resolve(__dirname, './packages/shared/dist'),
      // Backend package - use src
      '@ngaj/backend': path.resolve(__dirname, './packages/backend/src'),
      // Frontend package - use src  
      '@ngaj/frontend': path.resolve(__dirname, './packages/frontend/src'),
      // Setup package - map all subpaths to src
      '@ngaj/setup/generators/secret': path.resolve(__dirname, './packages/setup/src/generators/secret'),
      '@ngaj/setup/utils/script-validator': path.resolve(__dirname, './packages/setup/src/utils/script-validator'),
      '@ngaj/setup/utils/lan-ip-detection': path.resolve(__dirname, './packages/setup/src/utils/lan-ip-detection'),
      '@ngaj/setup/utils/login-code-reader': path.resolve(__dirname, './packages/setup/src/utils/login-code-reader'),
      '@ngaj/setup/utils/shutdown-handler': path.resolve(__dirname, './packages/setup/src/utils/shutdown-handler'),
      '@ngaj/setup/utils/docker-manager': path.resolve(__dirname, './packages/setup/src/utils/docker-manager'),
      '@ngaj/setup/handlers/signal-handler': path.resolve(__dirname, './packages/setup/src/handlers/signal-handler'),
      '@ngaj/setup/writers/env-writer': path.resolve(__dirname, './packages/setup/src/writers/env-writer'),
      '@ngaj/setup/validators/anthropic': path.resolve(__dirname, './packages/setup/src/validators/anthropic'),
      '@ngaj/setup/validators/bluesky': path.resolve(__dirname, './packages/setup/src/validators/bluesky'),
      '@ngaj/setup': path.resolve(__dirname, './packages/setup/src'),
      // Tests
      '@tests': path.resolve(__dirname, './tests')
    }
  }
});
