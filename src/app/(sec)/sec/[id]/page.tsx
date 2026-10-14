import { redirect } from 'next/navigation';

export default async function SECApplicationDetail({ params }: { params: { id: string } }) {
  redirect(`/sec/applications/${params.id}`);
}
