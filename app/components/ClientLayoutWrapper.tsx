'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import Header from './Header';
import Sidebar from './Sidebar';
import { usePathname, useRouter } from 'next/navigation';

interface ClientLayoutWrapperProps {
  children: React.ReactNode;
}

export default function ClientLayoutWrapper({
  children,
}: ClientLayoutWrapperProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user, loading, mustSetPassword } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || loading || !user) return;

    const isFirstAccessPage = pathname === '/auth/primeiro-acesso';
    if (mustSetPassword && !isFirstAccessPage) {
      router.replace('/auth/primeiro-acesso');
    }
  }, [mounted, loading, user, mustSetPassword, pathname, router]);

  // durante o carregamento do Firebase, renderiza sem header
  if (!mounted || loading) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  // se não tem usuário (está na página de login), renderiza sem header
  if (!user) {
    return <>{children}</>;
  }

  if (mustSetPassword && pathname !== '/auth/primeiro-acesso') {
    return null;
  }

  // se tem usuário, mostra header e sidebar
  return (
    <div className="min-h-screen bg-gray-50">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {children}
    </div>
  );
}
