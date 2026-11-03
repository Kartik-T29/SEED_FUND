'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { registerSec } from '@/lib/auth-actions';

export default function SecRegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    try {
      const res = await registerSec(formData);
      if (res.error) {
        setError(res.error);
      } else {
        setSubmitted(true);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-130px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-gray-900">
            SEC Evaluator Registration
          </CardTitle>
          <p className="text-center text-xs text-gray-500 mt-1">
            Startup Evaluation Committee (SEC) Institutional Membership
          </p>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-4">
              <Alert variant="success">
                Registration submitted successfully! Your SEC Evaluator profile is currently pending administrative review and verification. Once approved by the administrator, you will be able to log in and evaluate applications.
              </Alert>
              <div className="pt-2">
                <Link href="/login" className="w-full block">
                  <Button className="w-full">Proceed to Sign In</Button>
                </Link>
              </div>
            </div>
          ) : (
            <form action={handleSubmit} className="space-y-4">
              {error && <Alert variant="error">{error}</Alert>}

              <Input label="Full Name" id="name" name="name" required placeholder="Prof. Jane Doe" />
              <Input label="Institutional Email" id="email" name="email" type="email" required placeholder="jane.doe@itm.ac.in" />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Designation" id="designation" name="designation" required placeholder="Associate Professor" />
                <Input label="Department / School" id="department" name="department" required placeholder="Dept. of Computer Science" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input 
                  label="Password" 
                  id="password" 
                  name="password" 
                  type="password" 
                  required 
                  helpText="Min 8 characters" 
                />
                <Input label="Confirm Password" id="confirmPassword" name="confirmPassword" type="password" required />
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full" loading={loading}>
                  Register as SEC Evaluator
                </Button>
              </div>
            </form>
          )}
        </CardContent>
        <CardFooter className="justify-center border-t border-gray-100 pt-4">
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
