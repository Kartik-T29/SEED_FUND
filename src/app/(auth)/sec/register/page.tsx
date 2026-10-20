'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { registerSec } from '@/lib/auth-actions';
import { CheckCircle2, Shield } from 'lucide-react';

export default function SecRegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      const result = await registerSec(formData);
      if (result?.error) {
        setError(result.error);
        if (result.details) {
          setFieldErrors(result.details);
        }
      } else if (result?.success) {
        setSuccessMessage(result.message || 'Your account has been registered and is pending admin approval.');
      }
    } catch (e: any) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-130px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-lg shadow-sm">
        <CardHeader className="text-center">
          <div className="mx-auto w-10 h-10 rounded-full bg-blue-50 text-brand-primary flex items-center justify-center mb-2">
            <Shield className="w-5 h-5" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">SEC Evaluator Registration</CardTitle>
          <CardDescription className="text-xs text-gray-500 mt-1">
            Register as a Seed Evaluation Committee (SEC) member. Accounts require administrator approval before access is granted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {successMessage ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-lg text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <div>
                <h3 className="text-base font-bold text-emerald-900">Registration Submitted</h3>
                <p className="text-xs text-emerald-800 mt-1.5 leading-relaxed">
                  {successMessage}
                </p>
              </div>
              <div className="pt-2">
                <Link href="/login">
                  <Button variant="outline" className="w-full bg-white text-emerald-900 border-emerald-300 hover:bg-emerald-100">
                    Return to Login
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form action={handleSubmit} className="space-y-4">
              {error && <Alert variant="error">{error}</Alert>}

              <Input
                label="Full Name"
                id="name"
                name="name"
                required
                placeholder="Dr. / Prof. Full Name"
                error={fieldErrors.name?.[0]}
              />

              <Input
                label="Institutional Email Address"
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="evaluator@university.edu"
                error={fieldErrors.email?.[0]}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Designation"
                  id="designation"
                  name="designation"
                  placeholder="e.g. Professor / HoD"
                  error={fieldErrors.designation?.[0]}
                />
                <Input
                  label="Department"
                  id="department"
                  name="department"
                  placeholder="e.g. Electrical Engg."
                  error={fieldErrors.department?.[0]}
                />
              </div>

              <Input
                label="Invite Code (if configured)"
                id="inviteCode"
                name="inviteCode"
                placeholder="Enter invite code provided by administrator"
                helpText="Optional unless required by institutional policy"
                error={fieldErrors.inviteCode?.[0]}
              />

              <PasswordInput
                label="Password"
                id="password"
                name="password"
                autoComplete="new-password"
                required
                helpText="Min 8 chars, 1 uppercase, 1 number, 1 special character"
                error={fieldErrors.password?.[0]}
              />

              <PasswordInput
                label="Confirm Password"
                id="confirmPassword"
                name="confirmPassword"
                autoComplete="new-password"
                required
                error={fieldErrors.confirmPassword?.[0]}
              />

              <Button type="submit" className="w-full mt-4" loading={loading}>
                Register for SEC Access
              </Button>
            </form>
          )}
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
