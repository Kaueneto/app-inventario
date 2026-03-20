'use client';

import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from './firebase';

export const useFirebaseAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (err: any) {
      const errorMessage = getFirebaseErrorMessage(err.code);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('Login bem-sucedido:', result.user.email);
      return result.user;
    } catch (err: any) {
      console.error('erro Firebase:', err.code, err.message);
      const errorMessage = getFirebaseErrorMessage(err.code);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setError(null);
    try {
      await signOut(auth);
    } catch (err: any) {
      setError('erro ao fazer logout');
    } finally {
      setLoading(false);
    }
  };

  return { register, login, logout, loading, error, setError };
};

function getFirebaseErrorMessage(code: string): string {
  const messages: { [key: string]: string } = {
    'auth/email-already-in-use': 'Email já está registrado',
    'auth/invalid-email': 'Email inválido',
    'auth/operation-not-allowed': 'Operação não permitida',
    'auth/weak-password': 'Senha muito fraca',
    'auth/user-disabled': 'Usuário desabilitado',
    'auth/user-not-found': 'usuário não encontrado',
    'auth/wrong-password': 'senha incorreta',
  };
  return messages[code] || 'erro de autenticação';
}
