import { getSession } from '@/lib/auth';
import { generateSummaryReportPdf, Forbidden } from '@/lib/access';

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return new Response('Not Found', { status: 404 });
    }

    const buffer = await generateSummaryReportPdf(session, params.id);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Assessment_Summary_${params.id}.pdf"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    if (
      error instanceof Forbidden ||
      error?.message === 'NOT_FOUND' ||
      error?.message === 'FORBIDDEN' ||
      error?.message === 'REVEAL_AFTER_OWN_SUBMIT'
    ) {
      return new Response('Not Found', { status: 404 });
    }
    console.error('Error generating summary PDF:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
