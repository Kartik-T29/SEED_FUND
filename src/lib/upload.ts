import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { MAX_FILE_SIZE_BYTES, ALLOWED_FILE_TYPES } from './constants';

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || './uploads');

function validatePathSegment(segment: string, name: string): void {
  if (!segment || typeof segment !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(segment)) {
    throw new Error(`Invalid ${name} format`);
  }
}

function verifyMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 4) return false;

  // PDF: %PDF (0x25 0x50 0x44 0x46)
  if (mimeType === 'application/pdf') {
    return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
  }

  // JPEG: 0xFF 0xD8 0xFF
  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  // PNG: 0x89 0x50 0x4E 0x47
  if (mimeType === 'image/png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  }

  return false;
}

export async function saveUploadedFile(
  file: File,
  applicationId: string,
  docType: string
): Promise<{ filePath: string; fileName: string; fileSize: number }> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size exceeds ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB limit`);
  }

  // Validate path segments to prevent directory traversal
  validatePathSegment(applicationId, 'applicationId');
  validatePathSegment(docType, 'docType');

  // Validate declared MIME type
  const allAllowed = [...ALLOWED_FILE_TYPES.document, ...ALLOWED_FILE_TYPES.image];
  if (!allAllowed.includes(file.type)) {
    throw new Error('File type not allowed. Only PDF, JPEG, and PNG files are accepted.');
  }

  // Read buffer and verify magic bytes
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  if (!verifyMagicBytes(buffer, file.type)) {
    throw new Error('File content does not match the expected format (invalid file signature).');
  }

  // Create directory inside UPLOAD_DIR
  const dir = path.join(UPLOAD_DIR, applicationId, docType);
  const resolvedDir = path.resolve(dir);
  if (!resolvedDir.startsWith(UPLOAD_DIR)) {
    throw new Error('Path traversal detected');
  }
  await mkdir(resolvedDir, { recursive: true });

  // Generate unique filename
  const ext = path.extname(file.name) || (file.type === 'application/pdf' ? '.pdf' : '.jpg');
  const safeName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_');
  const uniqueName = `${Date.now()}-${safeName}`;
  const filePath = path.join(resolvedDir, uniqueName);
  const resolvedFilePath = path.resolve(filePath);
  if (!resolvedFilePath.startsWith(UPLOAD_DIR)) {
    throw new Error('Path traversal detected');
  }

  // Write file
  await writeFile(resolvedFilePath, buffer);

  return {
    filePath: resolvedFilePath,
    fileName: file.name,
    fileSize: file.size,
  };
}

export async function deleteUploadedFile(filePath: string): Promise<void> {
  try {
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(UPLOAD_DIR)) {
      console.error(`Attempt to delete file outside upload directory blocked: ${filePath}`);
      return;
    }
    await unlink(resolvedPath);
  } catch {
    console.error(`Failed to delete file: ${filePath}`);
  }
}

export function getUploadDir(): string {
  return UPLOAD_DIR;
}
