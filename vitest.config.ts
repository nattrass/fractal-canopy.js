import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        coverage: {
            include: ['src/**/*.ts'],
            thresholds: {
                branches: 70,
                functions: 70,
                lines: 70,
                statements: 70
            }
        }
    }
});
