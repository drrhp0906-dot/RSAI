import { PrismaClient } from '@prisma/client'

// cache key bumped (prismaV2) so schema updates are picked up by the
// long-running dev server instead of reusing a stale generated client
const globalForPrisma = globalThis as unknown as {
  prismaV2?: PrismaClient
}

export const db =
  globalForPrisma.prismaV2 ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prismaV2 = db
