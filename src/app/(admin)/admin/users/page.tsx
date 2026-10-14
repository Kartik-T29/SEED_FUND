import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { adminListUsers } from '@/lib/access';
import UsersManagementClient from './UsersManagementClient';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    redirect('/login');
  }

  const rawUsers = await adminListUsers({ userId: session.userId, role: session.role });

  // Sanitize: remove passwordHash before passing to client component
  const users = rawUsers.map(({ passwordHash, ...user }) => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage system users, designate active SEC evaluation committee members (maximum 3 active), edit profiles, deactivate accounts, and reset credentials.
        </p>
      </div>

      <UsersManagementClient initialUsers={users} />
    </div>
  );
}
