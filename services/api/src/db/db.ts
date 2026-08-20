import { PrismaClient } from '@prisma/client';

const globalRef = global as unknown as { prisma: PrismaClient | undefined };

export const prisma = globalRef.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalRef.prisma = prisma;
}
