'use server';

import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { hashPassword, verifyPassword, createSession, setSessionCookie, clearSessionCookie, getSession } from '@/lib/auth';
import { loginSchema, registerSchema } from '@/lib/validations';
import { checkRateLimit } from '@/lib/rate-limit';
import { adminApproveSecUser, adminRejectSecUser } from '@/lib/access';

export async function login(formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  
  const result = loginSchema.safeParse(data);
  if (!result.success) {
    return { error: 'Invalid email or password' };
  }

  const { email, password } = result.data;
  const ip = 'anonymous'; 
  
  const { allowed, remainingAttempts } = checkRateLimit(`${ip}:${email}`);
  if (!allowed) {
    return { error: 'Too many login attempts. Please try again in 15 minutes.' };
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: 'Invalid email or password', remainingAttempts };
  }

  if (user.role === 'SEC_MEMBER' && user.approvalStatus === 'PENDING') {
    return { error: 'Your SEC Evaluator account is awaiting verification and approval by the administrator.' };
  }

  if (user.role === 'SEC_MEMBER' && user.approvalStatus === 'REJECTED') {
    return { error: 'Your SEC Evaluator registration has been rejected. Please contact the administrator.' };
  }

  if (!user.active) {
    return { error: 'Your account has been deactivated. Please contact the administrator.' };
  }

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
  const data = Object.fromEntries(formData.entries());
  
  const result = registerSchema.safeParse(data);
  if (!result.success) {
    return { 
      error: 'Invalid form data', 
      details: result.error.flatten().fieldErrors 
    };
  }

  const { email, password, name, enrollmentNo, program, phone, teamName } = result.data;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return { error: 'User with this email already exists' };
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: 'STARTUP',
      mustChangePassword: false,
      startup: {
        create: {
          teamName,
          enrollmentNo,
          program,
          phone,
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

export async function logout() {
  await clearSessionCookie();
  redirect('/login');
}

export async function registerSec(formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  const name = String(data.name || '').trim();
  const email = String(data.email || '').trim().toLowerCase();
  const designation = String(data.designation || '').trim();
  const department = String(data.department || '').trim();
  const password = String(data.password || '');
  const confirmPassword = String(data.confirmPassword || '');

  if (!name || !email || !designation || !department || !password) {
    return { error: 'All fields are required.' };
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters long.' };
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: 'An account with this email address already exists.' };
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.create({
    data: {
      name,
      email,
      role: 'SEC_MEMBER',
      approvalStatus: 'PENDING',
      active: true,
      designation,
      department,
      passwordHash,
      mustChangePassword: false,
    },
  });

  return { success: true };
}

export async function approveSecAction(userId: string) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Unauthorized' };
  }
  await adminApproveSecUser(session as any, userId);
  return { success: true };
}

export async function rejectSecAction(userId: string) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Unauthorized' };
  }
  await adminRejectSecUser(session as any, userId);
  return { success: true };
}
