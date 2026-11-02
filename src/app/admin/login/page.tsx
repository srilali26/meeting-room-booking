'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Lock, Mail, Loader2, Calendar } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('adminpassword123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    if (supabase) {
      const { data, error: sbError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!sbError && data.session) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('admin_session', JSON.stringify({ email, token: data.session.access_token }));
        }
        router.push('/admin');
        return;
      }
    }

    // Fallback demo/configured admin check
    const demoAdminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const demoAdminPassword = process.env.ADMIN_PASSWORD || 'adminpassword123';

    if (email === demoAdminEmail && password === demoAdminPassword) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_session', JSON.stringify({ email, timestamp: Date.now() }));
        document.cookie = 'admin_session=active; path=/; max-age=86400';
      }
      router.push('/admin');
    } else {
      setError('Invalid email or password. Use admin@example.com / adminpassword123 for demo access.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-2xl rounded-3xl border-slate-200 dark:border-slate-800">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-blue-500/20">
            <Lock className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-black text-slate-900 dark:text-slate-100">
            Admin Portal
          </CardTitle>
          <CardDescription>
            Sign in to manage rooms, QR codes, and system bookings.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4 pt-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Admin Email
              </label>
              <div className="relative">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-[11px] text-blue-800 dark:text-blue-300">
              <strong>Demo Credentials Pre-filled:</strong>
              <br />
              Email: <code>admin@example.com</code> &bull; Password: <code>adminpassword123</code>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" variant="default" className="w-full font-bold" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Authenticating...
                </>
              ) : (
                'Sign In to Dashboard'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
