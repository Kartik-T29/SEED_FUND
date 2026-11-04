import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getStartupSubmissionForDownload } from '@/lib/access';
import { generateApplicationPdf } from '@/lib/pdf-generator';
import { prisma } from '@/lib/prisma';
import { CanonicalApplicationData } from '@/lib/application-data';

export const dynamic = 'force-dynamic';

// Rate limiter: 10 downloads per minute per user
const downloadTimestamps = new Map<string, number[]>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 10;

  const timestamps = downloadTimestamps.get(userId) || [];
  const recent = timestamps.filter((t) => now - t < windowMs);

  if (recent.length >= maxRequests) {
    downloadTimestamps.set(userId, recent);
    return false;
  }

  recent.push(now);
  downloadTimestamps.set(userId, recent);
  return true;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }

    if (session.role !== 'STARTUP') {
      return NextResponse.json({ error: 'FORBIDDEN: Only startups can download their application' }, { status: 403 });
    }

    // Rate Limit Check
    if (!checkRateLimit(session.userId)) {
      return NextResponse.json(
        { error: 'RATE_LIMIT_EXCEEDED: Maximum 10 downloads per minute allowed.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const versionParam = searchParams.get('version');
    const requestedVersion = versionParam ? parseInt(versionParam, 10) : undefined;

    // Server-enforced: NO application ID accepted from query parameters.
    // Derived strictly from the authenticated startup's session.
    const { application, snapshot } = await getStartupSubmissionForDownload(
      { userId: session.userId, role: session.role },
      { version: requestedVersion }
    );

    const canonicalData = snapshot.data as unknown as CanonicalApplicationData;
    const dataHash = snapshot.dataHash;

    // Generate PDF from immutable snapshot
    const pdfBuffer = await generateApplicationPdf(canonicalData, dataHash);

    // Audit Log Entry
    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        action: `DOWNLOAD_APPLICATION_PDF_v${canonicalData.version}`,
        entity: 'ApplicationSnapshot',
        entityId: snapshot.id,
      },
    });

    const safeStartupName = (canonicalData.startup.teamName || 'Startup')
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'Startup';

    const filename = `IDEAPAD-Seed-Application-${safeStartupName}-${canonicalData.applicationId}-v${canonicalData.version}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (err: any) {
    console.error('Application download error:', err);
    if (err.message === 'DRAFT_NOT_DOWNLOADABLE') {
      return NextResponse.json(
        { error: 'You can download your application after you submit it.' },
        { status: 403 }
      );
    }
    if (err.message === 'FORBIDDEN' || err.message === 'UNAUTHENTICATED' || err.message === 'NO_STARTUP') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    if (err.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json(
      { error: err.message || 'Failed to generate application download' },
      { status: 500 }
    );
  }
}
