'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import GestaoForm from '@/app/components/GestaoForm';
import { Loader2 } from 'lucide-react';

export default function TipoPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-slate-300 w-8 h-8" />
      </div>
    );
  }

  return <GestaoForm titulo="Cadastrar Tipo de Bem" colecao="tipos_bem" />;
}
