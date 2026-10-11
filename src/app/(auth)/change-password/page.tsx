'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { changePassword } from './actions';

export default function ChangePasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    try {
      const result = await changePassword(formData);
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
          <CardTitle className="text-center text-2xl">Change Password Required</CardTitle>
          <CardDescription className="text-center">
            For security reasons, you must change your password before continuing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-6">
            {error && <Alert variant="error">{error}</Alert>}
            
            <div className="space-y-4">
              <Input
                label="Current Password"
                id="currentPassword"
                name="currentPassword"
                type="password"
                required
              />
              <Input
                label="New Password"
                id="newPassword"
                name="newPassword"
                type="password"
                required
                helpText="Min 8 chars, 1 uppercase, 1 number, 1 special char"
              />
              <Input
                label="Confirm New Password"
                id="confirmNewPassword"
                name="confirmNewPassword"
                type="password"
                required
              />
            </div>

            <Button type="submit" className="w-full" loading={loading}>
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
