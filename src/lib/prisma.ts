import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  let url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || 'file:./dev.db';
  let authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN;

  // Auto-normalize turso:// scheme to libsql:// which @libsql/client expects
  if (url.startsWith('turso://')) {
    url = url.replace(/^turso:\/\//, 'libsql://');
  }

  // Extract authToken from query parameter if embedded in connection string
  try {
    if (url.includes('authToken=')) {
      const parsed = new URL(url.replace(/^libsql:/, 'https:'));
      const qToken = parsed.searchParams.get('authToken');
      if (qToken && !authToken) {
        authToken = qToken;
      }
    }
  } catch {
    // Ignore URL parse error
  }

  if (url.startsWith('libsql:') || url.startsWith('https:')) {
    const adapter = new PrismaLibSql({ url, authToken });
    return new PrismaClient({ adapter });
  }

  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
