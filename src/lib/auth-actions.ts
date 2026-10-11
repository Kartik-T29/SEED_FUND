'use server';

import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { hashPassword, verifyPassword, createSession, setSessionCookie, clearSessionCookie } from '@/lib/auth';
import { loginSchema, registerSchema } from '@/lib/validations';
import { checkRateLimit } from '@/lib/rate-limit';

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
