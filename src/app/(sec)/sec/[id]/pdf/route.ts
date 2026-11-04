import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { buildFormAData, canonicalizeFormAData } from '@/lib/form-a-data';
import { generateFormAPdf } from '@/lib/pdf-generator';
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

    const { id } = await Promise.resolve(params);

    // buildFormAData enforces: Admin or one of the 3 panel members of that application
    const formData = await buildFormAData(id, session as any);
    const { shortHash } = canonicalizeFormAData(formData);

    // Generate PDF using exact Word template layout with serif fonts
    const pdfBuffer = await generateFormAPdf(formData, shortHash);

    // Record audit log entry
    await logFormPrintAudit(session as any, 'FORM_A', id, shortHash, true);

    const filename = `Form_A_${formData.startup.teamName.replace(/[^a-zA-Z0-9]/g, '_')}_${shortHash}.pdf`;

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
    console.error('Form A PDF download error:', err);
    if (err.message === 'NOT_A_PANEL_MEMBER' || err.message === 'FORBIDDEN' || err.message === 'NOT_APPROVED_SEC') {
      return NextResponse.json(
        { error: 'FORBIDDEN: You are not authorized to download Form A for this application.' },
        { status: 403 }
      );
    }
    if (err.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
