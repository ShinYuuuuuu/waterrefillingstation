import { defineConfig } from 'vitest/config'
import dotenv from 'dotenv'

dotenv.config()

const configuredDatabaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL
if (!configuredDatabaseUrl) throw new Error('DATABASE_URL is required for tests')

const testDatabaseUrl = new URL(configuredDatabaseUrl)
const configuredDatabaseName = testDatabaseUrl.pathname.replace(/^\//, '')
if (process.env.TEST_DATABASE_URL) {
  if (!configuredDatabaseName.endsWith('_test')) {
    throw new Error('TEST_DATABASE_URL must point to a database ending in _test')
  }
} else if (!configuredDatabaseName.endsWith('_test')) {
  testDatabaseUrl.pathname = `/${configuredDatabaseName}_test`
}

process.env.DATABASE_URL = testDatabaseUrl.toString()

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: testDatabaseUrl.toString(),
    },
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    globals: true,
    fileParallelism: false,
    threads: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        'src/**/*.test.ts',
        'src/**/*.d.ts',
        'src/index.ts',
      ],
    },
  },
})
