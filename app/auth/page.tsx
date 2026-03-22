'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, mustSetPassword, login, loading, error, setError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  React.useEffect(() => {
    if (user) {
      router.push(mustSetPassword ? '/auth/primeiro-acesso' : '/dashboard');
    }
  }, [user, mustSetPassword, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Preencha todos os campos');
      return;
    }

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      console.error('Erro ao fazer login:', err);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="bg-slate-950 p-2 rounded-lg">
              <LogIn className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Inventário</h1>
          </div>
          <p className="text-slate-600 text-sm">Sistema de Gestão de Bens</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-900 font-medium outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-slate-400"
              placeholder="seu@email.com"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-900 font-medium outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-slate-400"
              placeholder="••••••"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-950 hover:bg-slate-900 text-white font-semibold py-2.5 px-4 rounded-lg transition active:scale-[0.98] disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Entrando...' : 'Entrar no Sistema'}
          </button>

          <div className="text-center text-sm">
            <p className="text-slate-600">
              Primeiro acesso? Use o link recebido no email para entrar e definir sua senha.
            </p>
          </div>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-100">
          <p className="text-center text-slate-500 text-xs">
            Sistema de Gestão de Bens - Interno
          </p>
        </div>
      </div>
    </div>
  );
}
