import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function cleanToken(token: string | undefined): string | undefined {
  if (!token) return undefined;
  // JWT tokens consist ONLY of ASCII base64url characters and dots: [A-Za-z0-9_-.]
  // Strip any accidental box-drawing chars (e.g. │ U+2502 from terminal tables), newlines, spaces, quotes
  const cleaned = token.replace(/[^A-Za-z0-9\-_.]/g, '').trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

function cleanUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  // Strip out any terminal box-drawing chars, non-ASCII chars, newlines, quotes
  let cleaned = url.replace(/[^A-Za-z0-9\-._~:/?#\[\]@!$&'()*+,;=]/g, '').trim();
  if (cleaned.startsWith('turso://')) {
    cleaned = cleaned.replace(/^turso:\/\//, 'libsql://');
  }
  return cleaned.length > 0 ? cleaned : undefined;
}

function createPrismaClient(): PrismaClient {
  let url = cleanUrl(process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL) || 'file:./dev.db';
  let authToken = cleanToken(process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN);

  // Extract authToken from query parameter if embedded in connection string
  try {
    if (url.includes('authToken=')) {
      const parsed = new URL(url.replace(/^libsql:/, 'https:'));
      const qToken = parsed.searchParams.get('authToken');
      if (qToken && !authToken) {
        authToken = cleanToken(qToken);
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
