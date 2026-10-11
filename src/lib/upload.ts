import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { MAX_FILE_SIZE_BYTES, ALLOWED_FILE_TYPES } from './constants';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

export async function saveUploadedFile(
  file: File,
  applicationId: string,
  docType: string
): Promise<{ filePath: string; fileName: string; fileSize: number }> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size exceeds ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB limit`);
  }

  // Validate file type
  const allAllowed = [...ALLOWED_FILE_TYPES.document, ...ALLOWED_FILE_TYPES.image];
  if (!allAllowed.includes(file.type)) {
    throw new Error('File type not allowed. Only PDF, JPEG, and PNG files are accepted.');
  }

  // Create directory
  const dir = path.join(UPLOAD_DIR, applicationId, docType);
  await mkdir(dir, { recursive: true });

  // Generate unique filename
  const ext = path.extname(file.name) || '.pdf';
  const safeName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_');
  const uniqueName = `${Date.now()}-${safeName}`;
  const filePath = path.join(dir, uniqueName);

  // Write file
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(filePath, buffer);

  return {
    filePath,
    fileName: file.name,
    fileSize: file.size,
  };
}

export async function deleteUploadedFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch {
    console.error(`Failed to delete file: ${filePath}`);
  }
}

export function getUploadDir(): string {
  return UPLOAD_DIR;
}
