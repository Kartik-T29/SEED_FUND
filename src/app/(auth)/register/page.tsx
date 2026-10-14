'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { register } from '@/lib/auth-actions';

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      const result = await register(formData);
      if (result?.error) {
        setError(result.error);
        if (result.details) {
          setFieldErrors(result.details);
        }
      }
    } catch (e: any) {
      if (e?.message?.includes('NEXT_REDIRECT') || e?.digest?.includes('NEXT_REDIRECT')) {
        throw e;
      }
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-130px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Startup Registration</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-6">
            {error && <Alert variant="error">{error}</Alert>}
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Input
                label="Full Name"
                id="name"
                name="name"
                required
                error={fieldErrors.name?.[0]}
              />
              <Input
                label="Team / Startup Name"
                id="teamName"
                name="teamName"
                required
                error={fieldErrors.teamName?.[0]}
              />
              <Input
                label="Email address"
                id="email"
                name="email"
                type="email"
                required
                error={fieldErrors.email?.[0]}
              />
              <Input
                label="Phone Number"
                id="phone"
                name="phone"
                required
                placeholder="10-digit mobile (e.g. 9876543210)"
                error={fieldErrors.phone?.[0]}
              />
              <Input
                label="Enrollment Number"
                id="enrollmentNo"
                name="enrollmentNo"
                required
                error={fieldErrors.enrollmentNo?.[0]}
              />
              <Input
                label="Program"
                id="program"
                name="program"
                required
                error={fieldErrors.program?.[0]}
              />
              <Input 
                label="Password" 
                id="password" 
                name="password" 
                type="password" 
                required 
                helpText="Min 8 chars, 1 uppercase, 1 number, 1 special char" 
                error={fieldErrors.password?.[0]}
              />
              <Input
                label="Confirm Password"
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                error={fieldErrors.confirmPassword?.[0]}
              />
            </div>

            <Button type="submit" className="w-full" loading={loading}>
              Register
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center border-t border-gray-100 pt-6">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-brand-primary hover:text-brand-primary-dark">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
