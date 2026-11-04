import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getDatabaseUrl(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;
  // Clean potential terminal escape or box characters
  url = url.replace(/[^A-Za-z0-9\-._~:/?#\[\]@!$&'()*+,;=]/g, '').trim();
  // Ensure connection limit parameter is set if not already present
  if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
    if (!url.includes('connection_limit=')) {
      url += (url.includes('?') ? '&' : '?') + 'connection_limit=10&connect_timeout=10';
    }
  }
  return url;
}

export function createPrismaClient(): PrismaClient {
  const url = getDatabaseUrl();
  return new PrismaClient({
    datasources: url ? { db: { url } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

// Proxy wrapper enables: import { prisma } from '@/lib/prisma';
// But defers actual client instantiation until the first property is accessed at runtime!
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma() as any;
    const value = client[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

export default prisma;
