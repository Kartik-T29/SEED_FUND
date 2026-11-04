import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export interface StorageAdapter {
  saveFile(buffer: Buffer, originalFilename: string, mimeType: string): Promise<string>;
  readFile(pathOrKey: string): Promise<Buffer>;
  deleteFile(pathOrKey: string): Promise<void>;
}

export class LocalDiskStorageAdapter implements StorageAdapter {
  private baseDir: string;

  constructor() {
    this.baseDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  }

  private async ensureDir(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch {
      // directory exists or permission error handled on write
    }
  }

  async saveFile(buffer: Buffer, originalFilename: string, _mimeType: string): Promise<string> {
    await this.ensureDir();
    const ext = path.extname(originalFilename).toLowerCase();
    const randomName = `${crypto.randomUUID()}${ext}`;
    const destinationPath = path.join(this.baseDir, randomName);
    await fs.writeFile(destinationPath, buffer);
    return destinationPath;
  }

  async readFile(pathOrKey: string): Promise<Buffer> {
    // If it is a legacy data URI, extract base64 buffer
    if (pathOrKey.startsWith('data:')) {
      const commaIdx = pathOrKey.indexOf(',');
      return Buffer.from(pathOrKey.slice(commaIdx + 1), 'base64');
    }
    // Prevent directory traversal attacks
    const resolved = path.resolve(pathOrKey);
    return await fs.readFile(resolved);
  }

  async deleteFile(pathOrKey: string): Promise<void> {
    if (pathOrKey.startsWith('data:')) return;
    try {
      const resolved = path.resolve(pathOrKey);
      await fs.unlink(resolved);
    } catch {
      // Ignore if file doesn't exist
    }
  }
}

// Future S3 Storage Adapter Stub
export class S3StorageAdapter implements StorageAdapter {
  async saveFile(_buffer: Buffer, _originalFilename: string, _mimeType: string): Promise<string> {
    throw new Error('S3 adapter not yet configured. Switch STORAGE_PROVIDER to local.');
  }
  async readFile(_key: string): Promise<Buffer> {
    throw new Error('S3 adapter not yet configured.');
  }
  async deleteFile(_key: string): Promise<void> {
    throw new Error('S3 adapter not yet configured.');
  }
}

let _adapter: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (!_adapter) {
    const provider = process.env.STORAGE_PROVIDER || 'local';
    if (provider === 's3') {
      _adapter = new S3StorageAdapter();
    } else {
      _adapter = new LocalDiskStorageAdapter();
    }
  }
  return _adapter;
}
