'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserPlus,
  KeyRound,
  Edit,
  Power,
  Shield,
  Search,
  Filter,
  Check,
  X,
  AlertTriangle,
  Copy,
  Sparkles,
} from 'lucide-react';
import {
  createSecUserAction,
  updateUserAction,
  toggleUserActiveAction,
  resetUserPasswordAction,
} from '../actions';

interface UserItem {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'SEC_MEMBER' | 'STARTUP';
  active: boolean;
  designation?: string | null;
  department?: string | null;
  mustChangePassword: boolean;
  createdAt: string | Date;
  startup?: {
    teamName: string;
    enrollmentNo: string;
    program: string;
  } | null;
  _count?: {
    assessments: number;
  };
}

interface UsersManagementClientProps {
  initialUsers: UserItem[];
}

export default function UsersManagementClient({ initialUsers }: UsersManagementClientProps) {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'SEC_MEMBER' | 'STARTUP'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Active SEC count
  const activeSecCount = users.filter((u) => u.role === 'SEC_MEMBER' && u.active).length;

  // Modals state
  const [showAddSecModal, setShowAddSecModal] = useState(false);
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [toggleActiveUser, setToggleActiveUser] = useState<UserItem | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserItem | null>(null);

  // Form states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Add SEC Form
  const [addSecForm, setAddSecForm] = useState({
    name: '',
    email: '',
    designation: '',
    department: '',
    password: '',
    reason: '',
  });

  // Edit User Form
  const [editForm, setEditForm] = useState({
    name: '',
    designation: '',
    department: '',
    reason: '',
  });

  // Toggle Active Form
  const [toggleReason, setToggleReason] = useState('');

  // Reset Password Form
  const [newPassword, setNewPassword] = useState('');
  const [resetReason, setResetReason] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = u.name.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchStartup = u.startup?.teamName?.toLowerCase().includes(q);
      const matchDept = u.department?.toLowerCase().includes(q);
      return matchName || matchEmail || matchStartup || matchDept;
    }
    return true;
  });

  // Helpers
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let res = '';
    for (let i = 0; i < 12; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handlers
  const handleOpenAddSec = () => {
    setError(null);
    setAddSecForm({
      name: '',
      email: '',
      designation: '',
      department: '',
      password: generateRandomPassword(),
      reason: 'Adding evaluation committee member',
    });
    setShowAddSecModal(true);
  };

  const handleCreateSecUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addSecForm.reason.trim()) {
      setError('Admin reason is required for creating a user');
      return;
    }
    if (activeSecCount >= 3) {
      setError('Cannot create active SEC member: maximum limit of 3 active members reached.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await createSecUserAction(
        {
          name: addSecForm.name,
          email: addSecForm.email,
          designation: addSecForm.designation,
          department: addSecForm.department,
          password: addSecForm.password,
        },
        addSecForm.reason
      );

      if (res.success && res.user) {
        setUsers((prev) => [
          {
            ...res.user,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as UserItem,
          ...prev,
        ]);
        setSuccessMessage(`SEC Member "${res.user.name}" created successfully.`);
        setShowAddSecModal(false);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create SEC member');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (user: UserItem) => {
    setError(null);
    setEditUser(user);
    setEditForm({
      name: user.name,
      designation: user.designation || '',
      department: user.department || '',
      reason: 'Updating user profile metadata',
    });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    if (!editForm.reason.trim()) {
      setError('Admin reason is required for updating user details');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await updateUserAction(
        editUser.id,
        {
          name: editForm.name,
          designation: editForm.designation,
          department: editForm.department,
        },
        editForm.reason
      );

      if (res.success && res.user) {
        setUsers((prev) =>
          prev.map((u) => (u.id === editUser.id ? { ...u, ...res.user } : u))
        );
        setSuccessMessage(`User "${res.user.name}" updated successfully.`);
        setEditUser(null);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenToggleActive = (user: UserItem) => {
    setError(null);
    setToggleActiveUser(user);
    setToggleReason(
      user.active
        ? `Deactivating user account ${user.email}`
        : `Reactivating user account ${user.email}`
    );
  };

  const handleToggleActive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toggleActiveUser) return;
    if (!toggleReason.trim()) {
      setError('Admin reason is required for status changes');
      return;
    }

    const nextState = !toggleActiveUser.active;
    if (nextState && toggleActiveUser.role === 'SEC_MEMBER' && activeSecCount >= 3) {
      setError('Cannot activate member: maximum limit of 3 active SEC members reached.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await toggleUserActiveAction(toggleActiveUser.id, nextState, toggleReason);
      if (res.success && res.user) {
        setUsers((prev) =>
          prev.map((u) => (u.id === toggleActiveUser.id ? { ...u, active: nextState } : u))
        );
        setSuccessMessage(
          `User account ${nextState ? 'activated' : 'deactivated'} successfully.`
        );
        setToggleActiveUser(null);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to toggle user status');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenResetPassword = (user: UserItem) => {
    setError(null);
    setResetPasswordUser(user);
    const pwd = generateRandomPassword();
    setNewPassword(pwd);
    setGeneratedPassword(pwd);
    setResetReason(`Admin credential reset requested for ${user.email}`);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser) return;
    if (!resetReason.trim()) {
      setError('Admin reason is required for password reset');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await resetUserPasswordAction(resetPasswordUser.id, newPassword, resetReason);
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === resetPasswordUser.id ? { ...u, mustChangePassword: true } : u
          )
        );
        setSuccessMessage(
          `Password for ${resetPasswordUser.email} has been reset. The user will be required to change it on their next login.`
        );
        // keep modal open to allow copying if needed or close
        setResetPasswordUser(null);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium">{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 text-sm font-semibold ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Users</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{users.length}</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active SEC Members</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-bold text-gray-900">{activeSecCount}</p>
                <span className="text-xs text-gray-500">/ 3 max</span>
              </div>
            </div>
            <div className={`p-3 rounded-lg ${activeSecCount === 3 ? 'bg-amber-50 text-amber-600' : 'bg-purple-50 text-purple-600'}`}>
              <Shield className="h-6 w-6" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {activeSecCount >= 3 ? 'Quota full (3 active members)' : `${3 - activeSecCount} slot(s) available`}
          </p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Startups</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {users.filter((u) => u.role === 'STARTUP').length}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <Sparkles className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Administrators</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {users.filter((u) => u.role === 'ADMIN').length}
              </p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
              <Shield className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar & Controls */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-1 w-full sm:w-auto items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, department or team..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </div>

            <div className="flex items-center gap-1.5 border border-gray-300 rounded-md p-1 bg-gray-50">
              <Filter className="h-4 w-4 text-gray-400 ml-1.5" />
              {(['ALL', 'ADMIN', 'SEC_MEMBER', 'STARTUP'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-2.5 py-1 text-xs font-medium rounded ${
                    roleFilter === r
                      ? 'bg-white shadow-sm text-brand-primary'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {r === 'ALL' ? 'All Roles' : r === 'SEC_MEMBER' ? 'SEC Member' : r === 'ADMIN' ? 'Admin' : 'Startup'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <button
              onClick={handleOpenAddSec}
              disabled={activeSecCount >= 3}
              title={activeSecCount >= 3 ? 'Maximum of 3 active SEC members already configured' : 'Add new SEC member'}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-dark rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <UserPlus className="h-4 w-4" /> Add SEC Member
            </button>
          </div>
        </div>

        {activeSecCount >= 3 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <span>
              <strong>Note:</strong> 3 active SEC members are currently configured. To add or activate another member, you must first deactivate an existing active SEC member.
            </span>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-3 text-left">User</th>
                <th className="px-6 py-3 text-left">Role</th>
                <th className="px-6 py-3 text-left">Designation / Department</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No users found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                      {user.startup && (
                        <div className="text-xs text-brand-primary font-medium mt-0.5">
                          Team: {user.startup.teamName} ({user.startup.enrollmentNo})
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {user.role === 'ADMIN' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          Admin
                        </span>
                      )}
                      {user.role === 'SEC_MEMBER' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          SEC Evaluator
                        </span>
                      )}
                      {user.role === 'STARTUP' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                          Startup
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-xs text-gray-600">
                      {user.designation || user.department ? (
                        <div>
                          {user.designation && <div className="font-medium text-gray-900">{user.designation}</div>}
                          {user.department && <div className="text-gray-500">{user.department}</div>}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        {user.active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Deactivated
                          </span>
                        )}
                        {user.mustChangePassword && (
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Password reset required
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(user)}
                          title="Edit user details"
                          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                        >
                          <Edit className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleOpenResetPassword(user)}
                          title="Reset password"
                          className="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded"
                        >
                          <KeyRound className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleOpenToggleActive(user)}
                          title={user.active ? 'Deactivate user' : 'Reactivate user'}
                          className={`p-1.5 rounded ${
                            user.active
                              ? 'text-rose-600 hover:text-rose-900 hover:bg-rose-50'
                              : 'text-emerald-600 hover:text-emerald-900 hover:bg-emerald-50'
                          }`}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD SEC MEMBER */}
      {showAddSecModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-gray-900 font-semibold text-lg">
                <UserPlus className="h-5 w-5 text-brand-primary" />
                Add SEC Member
              </div>
              <button onClick={() => setShowAddSecModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateSecUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Jane Smith"
                  value={addSecForm.name}
                  onChange={(e) => setAddSecForm({ ...addSecForm, name: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. janesmith@university.edu"
                  value={addSecForm.email}
                  onChange={(e) => setAddSecForm({ ...addSecForm, email: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Professor"
                    value={addSecForm.designation}
                    onChange={(e) => setAddSecForm({ ...addSecForm, designation: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Science"
                    value={addSecForm.department}
                    onChange={(e) => setAddSecForm({ ...addSecForm, department: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Temporary Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setAddSecForm({ ...addSecForm, password: generateRandomPassword() })}
                    className="text-xs text-brand-primary hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" /> Regenerate
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={addSecForm.password}
                    onChange={(e) => setAddSecForm({ ...addSecForm, password: e.target.value })}
                    className="w-full font-mono text-sm border border-gray-300 rounded px-3 py-2 bg-gray-50 focus:ring-1 focus:ring-brand-primary"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(addSecForm.password)}
                    title="Copy password"
                    className="p-2 border border-gray-300 rounded hover:bg-gray-100 text-gray-600"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  User will be forced to change this password upon their first login.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Admin Audit Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Explain why this SEC member is being created..."
                  value={addSecForm.reason}
                  onChange={(e) => setAddSecForm({ ...addSecForm, reason: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddSecModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm text-white bg-brand-primary hover:bg-brand-primary-dark rounded disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create SEC Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-gray-900 font-semibold text-lg">
                <Edit className="h-5 w-5 text-brand-primary" />
                Edit Profile: {editUser.name}
              </div>
              <button onClick={() => setEditUser(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Associate Professor"
                  value={editForm.designation}
                  onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Department</label>
                <input
                  type="text"
                  placeholder="e.g. Electrical Engineering"
                  value={editForm.department}
                  onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Admin Audit Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Explain why this profile is being edited..."
                  value={editForm.reason}
                  onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm text-white bg-brand-primary hover:bg-brand-primary-dark rounded disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TOGGLE ACTIVE / DEACTIVATE */}
      {toggleActiveUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-gray-900 font-semibold text-lg">
                <Power className={`h-5 w-5 ${toggleActiveUser.active ? 'text-rose-600' : 'text-emerald-600'}`} />
                {toggleActiveUser.active ? 'Deactivate User Account' : 'Reactivate User Account'}
              </div>
              <button onClick={() => setToggleActiveUser(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded">
                {error}
              </div>
            )}

            <div className="text-sm text-gray-600 space-y-2">
              <p>
                You are about to{' '}
                <strong>{toggleActiveUser.active ? 'deactivate' : 'activate'}</strong> the account for{' '}
                <span className="font-semibold text-gray-900">{toggleActiveUser.name}</span> ({toggleActiveUser.email}).
              </p>
              {toggleActiveUser.active ? (
                <p className="text-rose-600 text-xs bg-rose-50 p-2.5 rounded border border-rose-200">
                  Deactivated users are blocked from logging into the portal immediately.
                </p>
              ) : (
                <p className="text-emerald-700 text-xs bg-emerald-50 p-2.5 rounded border border-emerald-200">
                  Reactivating will allow this user to log in and access their role dashboard.
                </p>
              )}
            </div>

            <form onSubmit={handleToggleActive} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Admin Audit Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Explain why this account is being deactivated or reactivated..."
                  value={toggleReason}
                  onChange={(e) => setToggleReason(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setToggleActiveUser(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-4 py-2 text-sm text-white rounded disabled:opacity-50 ${
                    toggleActiveUser.active
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {loading
                    ? 'Processing...'
                    : toggleActiveUser.active
                    ? 'Confirm Deactivation'
                    : 'Confirm Reactivation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESET PASSWORD */}
      {resetPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-gray-900 font-semibold text-lg">
                <KeyRound className="h-5 w-5 text-blue-600" />
                Reset Password: {resetPasswordUser.name}
              </div>
              <button onClick={() => setResetPasswordUser(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    New Temporary Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const pwd = generateRandomPassword();
                      setNewPassword(pwd);
                      setGeneratedPassword(pwd);
                    }}
                    className="text-xs text-brand-primary hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" /> Generate Random
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full font-mono text-sm border border-gray-300 rounded px-3 py-2 bg-gray-50 focus:ring-1 focus:ring-brand-primary"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(newPassword)}
                    title="Copy password"
                    className="p-2 border border-gray-300 rounded hover:bg-gray-100 text-gray-600"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  The user will be required to change this password immediately upon their next login.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Admin Audit Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Explain why this credential reset is being performed..."
                  value={resetReason}
                  onChange={(e) => setResetReason(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setResetPasswordUser(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
                >
                  {loading ? 'Resetting...' : 'Reset Password & Force Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
