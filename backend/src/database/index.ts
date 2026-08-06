import { PrismaClient } from '@prisma/client'

// PrismaClient is typed as `any` in this environment to avoid Prisma type
// mismatches when the generated client's models don't perfectly align with
// the application-level types.  The runtime client is fully functional.
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
}) as any

export { prisma }
