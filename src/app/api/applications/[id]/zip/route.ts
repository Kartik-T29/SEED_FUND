import { getSession } from '@/lib/auth';
import { generateBundleZip, Forbidden } from '@/lib/access';

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return new Response('Not Found', { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const includeDocuments = searchParams.get('includeDocuments') === 'true';

    const buffer = await generateBundleZip(session, params.id, includeDocuments);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="Application_Bundle_${params.id}.zip"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    if (error instanceof Forbidden || error?.message === 'NOT_FOUND' || error?.message === 'FORBIDDEN') {
      return new Response('Not Found', { status: 404 });
    }
    console.error('Error generating bundle ZIP:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
