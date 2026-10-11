import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-change-me-in-production');
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'ideapad_session';

// Routes that don't require authentication
const publicRoutes = ['/', '/login', '/register'];

const roleRoutes: Record<string, string[]> = {
  STARTUP: ['/dashboard', '/apply', '/status'],
  SEC_MEMBER: ['/sec'],
  ADMIN: ['/admin'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public assets and API auth routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/logo')
  ) {
    return NextResponse.next();
  }

  // Check for session token
  const token = request.cookies.get(COOKIE_NAME)?.value;

  // Public routes - redirect to dashboard if already authenticated
  if (publicRoutes.includes(pathname)) {
    if (token) {
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const role = payload.role as string;
        if (payload.mustChangePassword) {
          return NextResponse.redirect(new URL('/change-password', request.url));
        }
        // Redirect to appropriate dashboard
        if (role === 'STARTUP') return NextResponse.redirect(new URL('/dashboard', request.url));
        if (role === 'SEC_MEMBER') return NextResponse.redirect(new URL('/sec', request.url));
        if (role === 'ADMIN') return NextResponse.redirect(new URL('/admin', request.url));
      } catch {
        // Invalid token, continue to public page
      }
    }
    return NextResponse.next();
  }

  // Protected routes - require authentication
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const role = payload.role as string;
    const mustChangePassword = payload.mustChangePassword as boolean;

    // Force password change
    if (mustChangePassword && pathname !== '/change-password') {
      return NextResponse.redirect(new URL('/change-password', request.url));
    }

    // Allow change-password route for anyone authenticated
    if (pathname === '/change-password') {
      return NextResponse.next();
    }

    // Check role-based access
    const allowedPrefixes = roleRoutes[role] || [];
    const hasAccess = allowedPrefixes.some((prefix) => pathname.startsWith(prefix));

    // Allow API routes for authenticated users (specific checks happen in the route handlers)
    if (pathname.startsWith('/api/')) {
      return NextResponse.next();
    }

    if (!hasAccess) {
      // Redirect to the user's dashboard
      if (role === 'STARTUP') return NextResponse.redirect(new URL('/dashboard', request.url));
      if (role === 'SEC_MEMBER') return NextResponse.redirect(new URL('/sec', request.url));
      if (role === 'ADMIN') return NextResponse.redirect(new URL('/admin', request.url));
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
  } catch {
    // Invalid token - clear and redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png).*)'],
};
