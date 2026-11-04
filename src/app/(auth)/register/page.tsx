'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { register } from '@/lib/auth-actions';
import { Logo } from '@/components/brand/Logo';

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, string[]> | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDetails(null);
    try {
      const formData = new FormData(e.currentTarget);
      const result = await register(formData);
      if (result?.error) {
        setError(result.error);
        if (result?.details) {
          setDetails(result.details as Record<string, string[]>);
        }
      } else if (result?.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }
    } catch (err: any) {
      console.error('Registration submit error:', err);
      setError(err?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-130px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex justify-center mb-3">
            <Logo size="lg" className="h-11 w-auto" />
          </div>
          <CardTitle className="text-center text-2xl">Startup Registration</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <Alert variant="error">{error}</Alert>}
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Input 
                label="Full Name" 
                id="name" 
                name="name" 
                required 
                error={details?.name?.[0]} 
              />
              <Input 
                label="Team / Startup Name" 
                id="teamName" 
                name="teamName" 
                required 
                error={details?.teamName?.[0]} 
              />
              <Input 
                label="Email address" 
                id="email" 
                name="email" 
                type="email" 
                required 
                error={details?.email?.[0]} 
              />
              <Input 
                label="Phone Number" 
                id="phone" 
                name="phone" 
                required 
                placeholder="10-digit mobile number" 
                error={details?.phone?.[0]} 
              />
              <Input 
                label="Enrollment Number" 
                id="enrollmentNo" 
                name="enrollmentNo" 
                required 
                error={details?.enrollmentNo?.[0]} 
              />
              <Input 
                label="Program" 
                id="program" 
                name="program" 
                required 
                error={details?.program?.[0]} 
              />
              <Input 
                label="Password" 
                id="password" 
                name="password" 
                type="password" 
                required 
                helpText="Min 8 chars, 1 uppercase, 1 number, 1 special char" 
                error={details?.password?.[0]} 
              />
              <Input 
                label="Confirm Password" 
                id="confirmPassword" 
                name="confirmPassword" 
                type="password" 
                required 
                error={details?.confirmPassword?.[0]} 
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
