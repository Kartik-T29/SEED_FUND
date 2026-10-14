import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SECApplicationDetail({ params }: { params: { id: string } }) {
  redirect(`/sec/applications/${params.id}`);
}
