'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Mail, Lock, ShieldAlert, Loader2 } from 'lucide-react';
import ThemeToggle from '@/components/theme-toggle';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-screen relative">
      
      {/* Theme Toggle Positioned in Top-Right Corner */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md glass-panel p-8 animate-float relative overflow-hidden border border-white/10 shadow-2xl">
        
        {/* Glow effect in background of card */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl" />

        <div className="text-center mb-6 relative z-10">
          {/* Logo Image */}
          <div className="mb-4 flex justify-center">
            <img 
              src="/logo.png" 
              alt="Sanasa General Insurance Logo" 
              className="h-24 w-auto object-contain drop-shadow-[0_0_10px_rgba(99,102,241,0.15)]"
            />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-indigo-200 to-cyan-200 bg-clip-text text-transparent tracking-tight">
            SGIC IT Workspace
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">
            Admin Portal Access
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-sm flex items-start gap-3 relative z-10">
            <ShieldAlert className="shrink-0 text-red-400" size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="email"
                placeholder="admin@sgic.lk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full glass-input glass-input-icon"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full glass-input glass-input-icon"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full glass-btn mt-4 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin text-white" size={18} />
                <span>Verifying credentials...</span>
              </>
            ) : (
              <>
                <LogIn size={18} />
                <span>Access Dashboard</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-8 text-xs text-slate-500 relative z-10 border-t border-white/5 pt-4">
          <p>Protected administrative workspace environment.</p>
          <p className="mt-1">Sanasa General Insurance Company (SGIC).</p>
        </div>
      </div>
    </div>
  );
}
