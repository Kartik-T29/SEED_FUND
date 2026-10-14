'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut, LayoutDashboard, Users, FileBarChart, Layers, FileText } from 'lucide-react';
import { logout } from '@/lib/auth-actions';

export function Navbar() {
  const pathname = usePathname();

  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isPrintPage = pathname.endsWith('/print');

  if (isAuthPage || isPrintPage) {
    return (
      <nav className="bg-white border-b border-gray-200 shadow-sm no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0">
              <Link href="/">
                <img src="/logo.png" alt="IDEAPAD Logo" className="h-10 w-auto" />
              </Link>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  const isAdmin = pathname.startsWith('/admin');
  const isSec = pathname.startsWith('/sec');
  const isStartup = pathname.startsWith('/dashboard') || pathname.startsWith('/status') || pathname.startsWith('/apply');

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm no-print z-10 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="flex items-center">
              <img src="/logo.png" alt="IDEAPAD Logo" className="h-8 w-auto mr-4" />
              <span className="text-lg font-bold text-gray-800 hidden sm:block border-l pl-4 border-gray-300">
                Seed Fund Portal
              </span>
            </Link>

            {/* Role Nav Items */}
            {isAdmin && (
              <div className="hidden md:flex items-center ml-8 space-x-1">
                <Link
                  href="/admin"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${
                    pathname === '/admin' || pathname.startsWith('/admin/applications')
                      ? 'bg-brand-primary/10 text-brand-primary'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Layers className="h-4 w-4" /> Applications
                </Link>
                <Link
                  href="/admin/users"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${
                    pathname.startsWith('/admin/users')
                      ? 'bg-brand-primary/10 text-brand-primary'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Users className="h-4 w-4" /> User Management
                </Link>
                <Link
                  href="/admin/reports"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${
                    pathname.startsWith('/admin/reports')
                      ? 'bg-brand-primary/10 text-brand-primary'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <FileBarChart className="h-4 w-4" /> Reports & Audit
                </Link>
              </div>
            )}

            {isSec && (
              <div className="hidden md:flex items-center ml-8 space-x-1">
                <Link
                  href="/sec"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${
                    pathname === '/sec'
                      ? 'bg-brand-primary/10 text-brand-primary'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" /> SEC Dashboard
                </Link>
              </div>
            )}

            {isStartup && (
              <div className="hidden md:flex items-center ml-8 space-x-1">
                <Link
                  href="/dashboard"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${
                    pathname === '/dashboard'
                      ? 'bg-brand-primary/10 text-brand-primary'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Link>
                <Link
                  href="/dashboard/apply"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${
                    pathname.startsWith('/dashboard/apply')
                      ? 'bg-brand-primary/10 text-brand-primary'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <FileText className="h-4 w-4" /> Application
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <form action={logout}>
              <Button type="submit" variant="ghost" size="sm" className="text-gray-600">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </div>
    </nav>
  );
}
