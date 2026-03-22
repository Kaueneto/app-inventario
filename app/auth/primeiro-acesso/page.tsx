'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

export default function PrimeiroAcessoPage() {
  const router = useRouter();
  const { user, loading: authLoading, mustSetPassword } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth');
      return;
    }

    if (!authLoading && user && !mustSetPassword) {
      router.replace('/dashboard');
    }
  }, [authLoading, user, mustSetPassword, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 6) {
      setError('A senha deve ter no minimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas nao conferem.');
      return;
    }

    setSaving(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: {
          must_set_password: false,
        },
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess('Senha definida com sucesso! Redirecionando...');
      setTimeout(() => {
        router.replace('/dashboard');
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Nao foi possivel definir a senha.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-slate-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-4 py-10 md:px-8">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-lg bg-slate-900 p-2">
            <LockKeyhole className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Primeiro acesso</h1>
            <p className="text-sm text-slate-500">Defina sua senha para continuar</p>
          </div>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Nova senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimo 6 caracteres"
              disabled={saving}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Confirmar senha</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={saving}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
            {saving ? 'Salvando...' : 'Definir senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
