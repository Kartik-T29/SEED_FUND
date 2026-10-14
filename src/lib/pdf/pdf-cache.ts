import crypto from 'crypto';

interface CachedPdf {
  hash: string;
  buffer: Buffer;
  createdAt: number;
}

const MAX_CACHE_SIZE = 50;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const pdfCache = new Map<string, CachedPdf>();

export function computeDataHash(data: unknown): string {
  const json = JSON.stringify(data, (key, value) => {
    if (value instanceof Date) return value.toISOString();
    return value;
  });
  return crypto.createHash('sha256').update(json || '').digest('hex');
}

export async function getOrGeneratePdf(
  key: string,
  dataHash: string,
  generator: () => Promise<Buffer>
): Promise<Buffer> {
  const now = Date.now();
  const cached = pdfCache.get(key);
  if (cached && cached.hash === dataHash && now - cached.createdAt < CACHE_TTL_MS) {
    return cached.buffer;
  }

  const buffer = await generator();

  // Evict oldest entries if cache exceeds max size
  if (pdfCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = pdfCache.keys().next().value;
    if (oldestKey) pdfCache.delete(oldestKey);
  }

  pdfCache.set(key, {
    hash: dataHash,
    buffer,
    createdAt: now,
  });
  return buffer;
}

export function invalidatePdfCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    pdfCache.clear();
    return;
  }
  for (const key of pdfCache.keys()) {
    if (key.startsWith(keyPrefix)) {
      pdfCache.delete(key);
    }
  }
}
