import { redirect } from 'next/navigation';

export default async function AdminApplicationRedirect({ params }: { params: { id: string } }) {
  redirect(`/admin/applications/${params.id}`);
}
