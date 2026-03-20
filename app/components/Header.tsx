'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/auth');
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="px-4 md:px-8 py-4 flex items-center justify-between">
        {/* Menu Hambúrguer - Canto Superior Esquerdo */}
        <button
          onClick={onMenuClick}
          className="p-2.5 hover:bg-gray-100 rounded-lg transition duration-200"
          aria-label="Menu"
        >
          <svg
            className="w-6 h-6 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Logout - Canto Superior Direito */}
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 hidden sm:inline">{user.email}</span>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="p-2.5 hover:bg-red-50 rounded-lg transition duration-200 text-gray-700 hover:text-red-600 disabled:opacity-50"
              title="Deslogar"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}