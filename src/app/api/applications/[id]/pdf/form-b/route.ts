import { getSession } from '@/lib/auth';
import { generateFormBPdf, Forbidden } from '@/lib/access';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return new Response('Not Found', { status: 404 });
    }

    const buffer = await generateFormBPdf(session, params.id);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="FormB_${params.id}.pdf"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    if (error instanceof Forbidden || error?.message === 'NOT_FOUND' || error?.message === 'FORBIDDEN') {
      return new Response('Not Found', { status: 404 });
    }
    console.error('Error generating Form B PDF:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
