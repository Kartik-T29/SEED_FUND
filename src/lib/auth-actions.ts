'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import prisma from '@/lib/db';
import { hashPassword, verifyPassword, createSession, setSessionCookie, clearSessionCookie } from '@/lib/auth';
import { loginSchema, registerSchema, secRegisterSchema } from '@/lib/validations';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';

async function getClientIp(): Promise<string> {
  try {
    const h = await headers();
    const cfIp = h.get('cf-connecting-ip');
    if (cfIp && cfIp.trim().length > 0) {
      return cfIp.trim();
    }
    const forwarded = h.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return h.get('x-real-ip') || '127.0.0.1';
  } catch {
    return '127.0.0.1';
  }
}

export async function login(formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  
  const result = loginSchema.safeParse(data);
  if (!result.success) {
    return { error: 'Invalid email or password' };
  }

  const { email, password } = result.data;
  const ip = await getClientIp();
  const rateLimitKey = `${ip}:${email.toLowerCase().trim()}`;
  
  const { allowed } = checkRateLimit(rateLimitKey);
  if (!allowed) {
    return { error: 'Too many login attempts. Please try again in 15 minutes.' };
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: 'Invalid email or password' };
  }

  if (user.active === false) {
    return { error: 'Your account has been deactivated. Please contact an administrator.' };
  }

  if (user.role === 'SEC_MEMBER' && user.approvalStatus === 'PENDING') {
    return { error: 'Your account is waiting for admin approval. You will be able to log in once an administrator approves your account.' };
  }

  if (user.role === 'SEC_MEMBER' && user.approvalStatus === 'REJECTED') {
    return { error: 'Your account registration has been rejected. Please contact an administrator.' };
  }

  // Reset rate limit on successful authentication
  resetRateLimit(rateLimitKey);

  const token = await createSession({
    userId: user.id,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  });
  
  await setSessionCookie(token);
  
  if (user.mustChangePassword) {
    redirect('/change-password');
  } else if (user.role === 'ADMIN') {
    redirect('/admin');
  } else if (user.role === 'SEC_MEMBER') {
    redirect('/sec'); // updated to match homeFor in access.ts
  } else {
    redirect('/dashboard');
  }
}

export async function register(formData: FormData) {
  const ip = await getClientIp();
  const { allowed } = checkRateLimit(`register:${ip}`);
  if (!allowed) {
    return { error: 'Too many registration attempts. Please try again later.' };
  }

  const data = Object.fromEntries(formData.entries());
  
  const result = registerSchema.safeParse(data);
  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors;
    const firstErrorMessage = result.error.errors[0]?.message || 'Invalid form data';
    return { 
      error: firstErrorMessage, 
      details: fieldErrors 
    };
  }

  const { email, password, name, enrollmentNo, program, phone, teamName } = result.data;

  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (existingUser) {
    return { 
      error: 'An account with this email already exists',
      details: { email: ['An account with this email already exists'] },
    };
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase().trim(),
      name: name.trim(),
      passwordHash,
      role: 'STARTUP',
      mustChangePassword: false,
      startup: {
        create: {
          teamName: teamName.trim(),
          enrollmentNo: enrollmentNo.trim(),
          program: program.trim(),
          phone: phone.trim(),
        }
      }
    },
  });

  const token = await createSession({
    userId: user.id,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  });
  
  await setSessionCookie(token);
  
  redirect('/dashboard');
}

export async function registerSec(formData: FormData) {
  const ip = await getClientIp();
  const { allowed } = checkRateLimit(`register-sec:${ip}`);
  if (!allowed) {
    return { error: 'Too many registration attempts. Please try again later.' };
  }

  const data = Object.fromEntries(formData.entries());
  
  const result = secRegisterSchema.safeParse(data);
  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors;
    const firstErrorMessage = result.error.errors[0]?.message || 'Invalid form data';
    return { 
      error: firstErrorMessage, 
      details: fieldErrors 
    };
  }

  const { email, password, name, designation, department, inviteCode } = result.data;

  // Optional invite code validation via env var SEC_INVITE_CODE
  const requiredInviteCode = process.env.SEC_INVITE_CODE;
  if (requiredInviteCode && requiredInviteCode.trim().length > 0) {
    if (!inviteCode || inviteCode.trim() !== requiredInviteCode.trim()) {
      return {
        error: 'Invalid or missing SEC invite code. Please enter the valid code provided by the administrator.',
        details: { inviteCode: ['Invalid or missing invite code'] },
      };
    }
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (existingUser) {
    return { 
      error: 'An account with this email already exists',
      details: { email: ['An account with this email already exists'] },
    };
  }

  const passwordHash = await hashPassword(password);

  // Server-enforced role and approvalStatus (no client mass assignment)
  await prisma.user.create({
    data: {
      email: email.toLowerCase().trim(),
      name: name.trim(),
      designation: designation?.trim() || null,
      department: department?.trim() || null,
      passwordHash,
      role: 'SEC_MEMBER',
      approvalStatus: 'PENDING',
      mustChangePassword: false,
      active: true,
    },
  });

  return {
    success: true,
    message: 'Your registration has been submitted and is waiting for admin approval. You will be able to log in once an administrator approves your account.',
  };
}

export async function logout() {
  await clearSessionCookie();
  redirect('/login');
}
