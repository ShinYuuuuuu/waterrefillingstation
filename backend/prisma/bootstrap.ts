import { spawnSync } from 'node:child_process'
import { prisma } from '../src/database'

async function bootstrap() {
  const tenantCount = await prisma.tenant.count()
  await prisma.$disconnect()

  if (tenantCount > 0) {
    console.log('Database already initialized; seed skipped.')
    return
  }

  console.log('Empty database detected; creating initial application data...')
  const result = spawnSync('npm', ['run', 'db:seed'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

bootstrap().catch(async (error) => {
  console.error('Database bootstrap failed:', error)
  await prisma.$disconnect()
  process.exit(1)
})
