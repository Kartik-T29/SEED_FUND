import * as _archiver from 'archiver';
const archiver = ((_archiver as any).default || _archiver) as typeof _archiver;
import stream from 'stream';
import fs from 'fs';
import path from 'path';

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_{2,}/g, '_');
}

export async function createBundleZipBuffer(
  teamName: string,
  applicationId: string,
  appPdf: Buffer,
  summaryPdf: Buffer,
  formBPdf: Buffer,
  documents: { filePath: string; name: string }[] = [],
  includeDocuments: boolean = false
): Promise<Buffer> {
  const cleanTeam = sanitizeFileName(teamName || 'Startup');
  const cleanAppId = sanitizeFileName(applicationId);

  const archive = (archiver as any)('zip', { zlib: { level: 9 } });
  const passThrough = new stream.PassThrough();
  const chunks: Buffer[] = [];
  passThrough.on('data', (chunk) => chunks.push(chunk));

  const completionPromise = new Promise<Buffer>((resolve, reject) => {
    passThrough.on('end', () => resolve(Buffer.concat(chunks)));
    passThrough.on('error', reject);
    archive.on('error', reject);
  });

  archive.pipe(passThrough);

  // Append the 3 primary PDFs
  archive.append(appPdf, { name: `${cleanTeam}_${cleanAppId}_Application.pdf` });
  archive.append(summaryPdf, { name: `${cleanTeam}_${cleanAppId}_Assessment_Summary.pdf` });
  archive.append(formBPdf, { name: `${cleanTeam}_${cleanAppId}_FormB.pdf` });

  // If includeDocuments is checked, add to documents/
  if (includeDocuments && documents && documents.length > 0) {
    const uploadDirResolved = path.resolve(process.env.UPLOAD_DIR || './uploads');
    for (const doc of documents) {
      if (doc.filePath) {
        const resolvedPath = path.resolve(doc.filePath);
        if (!resolvedPath.startsWith(uploadDirResolved)) {
          console.warn(`[Security] Blocked attempt to include file outside uploads in bundle: ${doc.filePath}`);
          continue;
        }
        if (fs.existsSync(resolvedPath)) {
          try {
            const fileBuf = fs.readFileSync(resolvedPath);
            const safeName = (doc.name || path.basename(resolvedPath)).replace(/[^a-zA-Z0-9._-]/g, '_');
            archive.append(fileBuf, { name: `documents/${safeName}` });
          } catch (err) {
            console.error(`Failed to read document file ${doc.filePath}`);
          }
        }
      }
    }
  }

  await archive.finalize();
  return completionPromise;
}
