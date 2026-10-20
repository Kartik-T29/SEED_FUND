import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

let cachedMiddlewareJwtSecret: Uint8Array | null = null;

function getJwtSecret(): Uint8Array | null {
  if (cachedMiddlewareJwtSecret) return cachedMiddlewareJwtSecret;
  const rawJwtSecret = process.env.JWT_SECRET;
  if (!rawJwtSecret) return null;
  cachedMiddlewareJwtSecret = new TextEncoder().encode(rawJwtSecret);
  return cachedMiddlewareJwtSecret;
}

function getCookieName(): string {
  return process.env.SESSION_COOKIE_NAME || 'ideapad_session';
}

// Routes that don't require authentication
const publicRoutes = ['/', '/login', '/register', '/sec/register'];

const roleRoutes: Record<string, string[]> = {
  STARTUP: ['/dashboard', '/apply', '/status'],
  SEC_MEMBER: ['/sec'],
  ADMIN: ['/admin'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle CORS preflight
  const origin = request.headers.get('origin');
  const allowedOrigin = process.env.FRONTEND_URL;

  if (request.method === 'OPTIONS') {
    const res = new NextResponse(null, { status: 204 });
    if (origin && allowedOrigin && origin === allowedOrigin) {
      res.headers.set('Access-Control-Allow-Origin', allowedOrigin);
      res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-action');
      res.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    return res;
  }

  // Allow public assets, API auth routes, and health check
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/api/health' ||
    pathname === '/health' ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/logo')
  ) {
    const res = NextResponse.next();
    addSecurityHeaders(res, origin);
    return res;
  }

  // Check for session token
  const token = request.cookies.get(getCookieName())?.value;

  // Public routes - redirect to dashboard if already authenticated
  if (publicRoutes.includes(pathname)) {
    if (token) {
      const secret = getJwtSecret();
      if (secret) {
        try {
          const { payload } = await jwtVerify(token, secret);
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
    }
    return NextResponse.next();
  }

  // Protected routes - require authentication
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const secret = getJwtSecret();
  if (!secret) {
    console.error('FATAL: JWT_SECRET environment variable is required');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, secret);
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

    // Allow API routes for authenticated users (with defense-in-depth checks)
    if (pathname.startsWith('/api/')) {
      if (pathname.includes('/zip') && role !== 'ADMIN') {
        return new NextResponse('Not Found', { status: 404 });
      }
      if (pathname.includes('/pdf/form-b') && role !== 'ADMIN') {
        return new NextResponse('Not Found', { status: 404 });
      }
      if (pathname.includes('/pdf/summary') && role === 'STARTUP') {
        return new NextResponse('Not Found', { status: 404 });
      }
      const res = NextResponse.next();
      addSecurityHeaders(res);
      return res;
    }

    if (!hasAccess) {
      // Redirect to the user's dashboard
      if (role === 'STARTUP') return NextResponse.redirect(new URL('/dashboard', request.url));
      if (role === 'SEC_MEMBER') return NextResponse.redirect(new URL('/sec', request.url));
      if (role === 'ADMIN') return NextResponse.redirect(new URL('/admin', request.url));
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const res = NextResponse.next();
    addSecurityHeaders(res);
    return res;
  } catch {
    // Invalid token - clear and redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete(getCookieName());
    return response;
  }
}

function addSecurityHeaders(response: NextResponse, origin?: string | null) {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  const allowedOrigin = process.env.FRONTEND_URL;
  if (origin && allowedOrigin && origin === allowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png).*)'],
};
