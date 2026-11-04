import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { buildFormBData, canonicalizeFormBData } from '@/lib/form-b-data';
import { generateFormBPdf } from '@/lib/pdf-generator';
import { logFormPrintAudit } from '@/lib/access';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }

    if (session.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'FORBIDDEN: Form B is strictly restricted to Administrators.' },
        { status: 403 }
      );
    }

    const { id } = await Promise.resolve(params);

    // buildFormBData enforces: ADMIN ONLY
    const formData = await buildFormBData(id, session as any);
    const { shortHash } = canonicalizeFormBData(formData);

    // Generate PDF with official signatories from settings
    const pdfBuffer = await generateFormBPdf(formData, shortHash);

    // Record audit log entry
    await logFormPrintAudit(session as any, 'FORM_B', id, shortHash, true);

    const filename = `Form_B_${formData.startup.teamName.replace(/[^a-zA-Z0-9]/g, '_')}_${shortHash}.pdf`;

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
    console.error('Form B PDF download error:', err);
    if (err.message === 'FORBIDDEN') {
      return NextResponse.json(
        { error: 'FORBIDDEN: Only administrators can access Form B.' },
        { status: 403 }
      );
    }
    if (err.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
