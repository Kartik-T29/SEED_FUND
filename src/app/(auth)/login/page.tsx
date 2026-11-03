'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { login } from '@/lib/auth-actions';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    try {
      const result = await login(formData);
      if (result?.error) {
        setError(result.error);
      }
    } catch (e) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-130px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Sign in to your account</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-6">
            {error && <Alert variant="error">{error}</Alert>}
            
            <div className="space-y-4">
              <Input
                label="Email address"
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
              <Input
                label="Password"
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>

            <Button type="submit" className="w-full" loading={loading}>
              Sign in
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2 border-t border-gray-100 pt-6 text-center text-sm text-gray-600">
          <p>
            Don't have an account?{' '}
            <Link href="/register" className="font-semibold text-brand-primary hover:text-brand-primary-dark">
              Register as Startup
            </Link>
          </p>
          <p className="text-xs text-gray-500">
            SEC Committee Evaluator?{' '}
            <Link href="/sec-register" className="font-semibold text-indigo-600 hover:text-indigo-800 underline">
              Register for Evaluation Access
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
