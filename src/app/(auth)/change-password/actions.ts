'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import prisma from '@/lib/db';
import { hashPassword, verifyPassword, getSession, createSession, setSessionCookie } from '@/lib/auth';
import { changePasswordSchema } from '@/lib/validations';

export async function changePassword(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const data = Object.fromEntries(formData.entries());
  
  const result = changePasswordSchema.safeParse(data);
  if (!result.success) {
    return { error: 'Invalid form data' };
  }

  const { currentPassword, newPassword } = result.data;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    return { error: 'Incorrect current password' };
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: { 
      passwordHash: hashedPassword,
      mustChangePassword: false 
    },
  });

  // Re-issue session token
  const token = await createSession({
    userId: user.id,
    role: user.role,
    mustChangePassword: false,
  });
  
  await setSessionCookie(token);
  
  // Redirect to dashboard
  if (user.role === 'ADMIN') redirect('/admin');
  if (user.role === 'SEC_MEMBER') redirect('/sec');
  redirect('/dashboard');
}
