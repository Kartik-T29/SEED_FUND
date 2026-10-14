import { getSession } from '@/lib/auth';
import { generateApplicationPdf, Forbidden } from '@/lib/access';

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

    const buffer = await generateApplicationPdf(session, params.id);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Application_${params.id}.pdf"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    if (error instanceof Forbidden || error?.message === 'NOT_FOUND' || error?.message === 'FORBIDDEN') {
      return new Response('Not Found', { status: 404 });
    }
    console.error('Error generating application PDF:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
