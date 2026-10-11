'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { logout } from '@/lib/auth-actions';

export function Navbar() {
  const pathname = usePathname();
  
  const isAuthPage = pathname === '/login' || pathname === '/register';
  
  if (isAuthPage) {
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

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm no-print z-10 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex-shrink-0 flex items-center">
            <Link href="/">
              <img src="/logo.png" alt="IDEAPAD Logo" className="h-8 w-auto mr-4" />
            </Link>
            <span className="text-lg font-bold text-gray-800 hidden sm:block border-l pl-4 border-gray-300">
              Seed Fund Portal
            </span>
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
