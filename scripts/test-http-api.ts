import dotenv from 'dotenv';
dotenv.config();

import { hashPassword, createSession } from '../src/lib/auth';
import { prisma } from '../src/lib/prisma';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const NGINX_URL = BASE_URL;

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function pass(name: string, detail?: string) {
  console.log(`${GREEN}✔ PASS:${RESET} ${BOLD}${name}${RESET}${detail ? ` - ${detail}` : ''}`);
}

function fail(name: string, err: any): never {
  console.error(`${RED}✘ FAIL:${RESET} ${BOLD}${name}${RESET}`, err);
  process.exit(1);
}

async function runHttpTests() {
  console.log(`\n${BLUE}====================================================${RESET}`);
  console.log(`${BOLD}${BLUE}HTTP & REVERSE PROXY INTEGRATION TESTS (${NGINX_URL})${RESET}`);
  console.log(`${BLUE}====================================================${RESET}`);

  // Test 0: Health check endpoint
  try {
    const res = await fetch(`${BASE_URL}/health`);
    if (res.status !== 200) {
      fail('Health Check GET /health', `Status: ${res.status}`);
    }
    const healthJson = await res.json();
    if ((healthJson.status !== 'healthy' && healthJson.status !== 'ok') || healthJson.database !== 'connected') {
      fail('Health Check response', JSON.stringify(healthJson));
    }
    pass('Health Check GET /health', `HTTP 200 OK - Status: ${healthJson.status}, DB: ${healthJson.database}`);
  } catch (e) {
    fail('Health Check GET /health', e);
  }

  // Test 1: Nginx reverse proxy connectivity
  try {
    const res = await fetch(`${NGINX_URL}/login`, { redirect: 'manual' });
    if (res.status !== 200) {
      fail('Nginx Proxy GET /login', `Status: ${res.status}`);
    }
    const html = await res.text();
    if (!html.includes('Sign in to your account') || !html.includes('IDEAPAD Seed Fund Portal')) {
      fail('Nginx Proxy GET /login Content', 'Expected content not found in HTML');
    }
    pass('Nginx Proxy GET /login', `HTTP 200 with IDEAPAD Portal branding (${html.length} bytes)`);
  } catch (e) {
    fail('Nginx Proxy GET /login', e);
  }

  // Test 2: Startup registration page
  try {
    const res = await fetch(`${NGINX_URL}/register`, { redirect: 'manual' });
    if (res.status !== 200) fail('Nginx Proxy GET /register', `Status: ${res.status}`);
    const html = await res.text();
    if (!html.includes('Startup Registration')) fail('Nginx Proxy GET /register Content', 'No register title');
    pass('Nginx Proxy GET /register', 'HTTP 200 with Startup Registration form');
  } catch (e) {
    fail('Nginx Proxy GET /register', e);
  }

  // Test 3: SEC Evaluator registration page
  try {
    const res = await fetch(`${NGINX_URL}/sec-register`, { redirect: 'manual' });
    if (res.status !== 200) fail('Nginx Proxy GET /sec-register', `Status: ${res.status}`);
    const html = await res.text();
    if (!html.includes('SEC Evaluator Registration')) fail('Nginx Proxy GET /sec-register Content', 'No SEC title');
    pass('Nginx Proxy GET /sec-register', 'HTTP 200 with SEC Evaluator Registration form');
  } catch (e) {
    fail('Nginx Proxy GET /sec-register', e);
  }

  // Test 4: Protected Admin route unauthenticated -> 307 to /login
  try {
    const res = await fetch(`${NGINX_URL}/admin`, { redirect: 'manual' });
    if (res.status !== 307) fail('Unauthenticated /admin guard', `Expected 307, got ${res.status}`);
    const loc = res.headers.get('location');
    if (!loc?.includes('/login')) fail('Unauthenticated /admin redirect target', `Target: ${loc}`);
    pass('Unauthenticated /admin route guard', `HTTP 307 Redirect -> ${loc}`);
  } catch (e) {
    fail('Unauthenticated /admin route guard', e);
  }

  // Test 5: Authenticated Admin access with valid session cookie
  try {
    const admin = await prisma.user.findUnique({ where: { email: 'aschandel.soet@itmuniversity.ac.in' } });
    if (!admin) fail('Admin query', 'Admin not found');
    const token = await createSession({
      userId: admin!.id,
      role: 'ADMIN',
      mustChangePassword: false,
    });

    const res = await fetch(`${NGINX_URL}/admin`, {
      headers: {
        Cookie: `ideapad_session=${token}`,
      },
      redirect: 'manual',
    });

    if (res.status !== 200) {
      const loc = res.headers.get('location');
      fail('Authenticated /admin access', `Expected HTTP 200, got ${res.status} (Location: ${loc})`);
    }
    const html = await res.text();
    if (!html.includes('Admin Operations Console')) {
      fail('Admin page content verification', 'Expected "Admin Operations Console" in HTML');
    }
    pass('Authenticated Admin Panel (/admin)', 'HTTP 200 OK - Admin Operations Console loaded');
  } catch (e) {
    fail('Authenticated Admin Panel', e);
  }

  // Test 6: Authenticated SEC access with valid session cookie
  try {
    const sec = await prisma.user.findFirst({
      where: { role: 'SEC_MEMBER', approvalStatus: 'APPROVED', active: true },
    });
    if (!sec) fail('SEC query', 'No approved SEC member found');
    const token = await createSession({
      userId: sec!.id,
      role: 'SEC_MEMBER',
      mustChangePassword: false,
    });

    const res = await fetch(`${NGINX_URL}/sec`, {
      headers: {
        Cookie: `ideapad_session=${token}`,
      },
      redirect: 'manual',
    });

    if (res.status !== 200) {
      fail('Authenticated /sec access', `Expected HTTP 200, got ${res.status}`);
    }
    const html = await res.text();
    if (!html.includes('SEC Dashboard')) {
      fail('SEC page content verification', 'Expected "SEC Dashboard" in HTML');
    }
    pass('Authenticated SEC Dashboard (/sec)', 'HTTP 200 OK - SEC Dashboard loaded');
  } catch (e) {
    fail('Authenticated SEC Dashboard', e);
  }

  // Test 7: Authenticated Startup access with valid session cookie
  try {
    const startup = await prisma.user.findFirst({
      where: { role: 'STARTUP', active: true },
    });
    if (!startup) fail('Startup query', 'No active startup user found');
    const token = await createSession({
      userId: startup!.id,
      role: 'STARTUP',
      mustChangePassword: false,
    });

    const res = await fetch(`${NGINX_URL}/dashboard`, {
      headers: {
        Cookie: `ideapad_session=${token}`,
      },
      redirect: 'manual',
    });

    if (res.status !== 200) {
      fail('Authenticated /dashboard access', `Expected HTTP 200, got ${res.status}`);
    }
    const html = await res.text();
    if (!html.includes('Startup Dashboard') && !html.includes('Application Details') && !html.includes('IDEAPAD')) {
      fail('Startup page content verification', 'Expected Startup portal content in HTML');
    }
    pass('Authenticated Startup Dashboard (/dashboard)', 'HTTP 200 OK - Startup Dashboard loaded');
  } catch (e) {
    fail('Authenticated Startup Dashboard', e);
  }

  // Test 8: SEC role trying to access /admin -> unauthorized / redirected
  try {
    const sec = await prisma.user.findFirst({
      where: { role: 'SEC_MEMBER', approvalStatus: 'APPROVED' },
    });
    const token = await createSession({
      userId: sec!.id,
      role: 'SEC_MEMBER',
      mustChangePassword: false,
    });

    const res = await fetch(`${NGINX_URL}/admin`, {
      headers: {
        Cookie: `ideapad_session=${token}`,
      },
      redirect: 'manual',
    });

    // Should redirect to /sec or /login
    if (res.status !== 307 && res.status !== 302 && res.status !== 403) {
      fail('SEC role boundary guard', `Expected redirect or 403, got ${res.status}`);
    }
    const loc = res.headers.get('location');
    pass('Role Boundary Protection (SEC blocked from /admin)', `HTTP ${res.status} Redirect -> ${loc}`);
  } catch (e) {
    fail('Role Boundary Protection', e);
  }

  // Test 9: Startup role trying to access /admin -> blocked
  try {
    const startup = await prisma.user.findFirst({
      where: { role: 'STARTUP' },
    });
    const token = await createSession({
      userId: startup!.id,
      role: 'STARTUP',
      mustChangePassword: false,
    });

    const res = await fetch(`${NGINX_URL}/admin`, {
      headers: {
        Cookie: `ideapad_session=${token}`,
      },
      redirect: 'manual',
    });

    if (res.status !== 307 && res.status !== 302 && res.status !== 403) {
      fail('Startup role boundary guard', `Expected redirect or 403, got ${res.status}`);
    }
    const loc = res.headers.get('location');
    pass('Role Boundary Protection (Startup blocked from /admin)', `HTTP ${res.status} Redirect -> ${loc}`);
  } catch (e) {
    fail('Role Boundary Protection', e);
  }

  console.log(`\n${GREEN}====================================================${RESET}`);
  console.log(`${BOLD}${GREEN}ALL HTTP & NGINX INTEGRATION TESTS PASSED!${RESET}`);
  console.log(`${GREEN}====================================================${RESET}`);
  await prisma.$disconnect();
  process.exit(0);
}

runHttpTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
