'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
} from 'firebase/firestore';

interface Item {
  id: string;
  nome: string;
  criado_em?: string;
  atualizado_em?: string;
}

export function useGestaoFirebase(colecao: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = async (): Promise<Item[]> => {
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, colecao),
        orderBy('criado_em', 'desc')
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        nome: doc.data().nome,
        criado_em: doc.data().criado_em,
        atualizado_em: doc.data().atualizado_em,
      }));
      return items;
    } catch (err: any) {
      setError(err.message || 'erro ao buscar itens');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (nome: string): Promise<Item> => {
    setLoading(true);
    setError(null);
    try {
      // verificar  duplicação
      const q = query(collection(db, colecao));
      const snapshot = await getDocs(q);
      
      const exists = snapshot.docs.some(
        (doc) => doc.data().nome.toLowerCase() === nome.toLowerCase()
      );

      if (exists) {
        throw new Error('Este item já foi cadastrado');
      }

      const now = new Date().toISOString();
      const docRef = await addDoc(collection(db, colecao), {
        nome: nome.trim(),
        criado_em: now,
        atualizado_em: now,
      });

      return {
        id: docRef.id,
        nome: nome.trim(),
        criado_em: now,
        atualizado_em: now,
      };
    } catch (err: any) {
      setError(err.message || 'erro ao adicionar item');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await deleteDoc(doc(db, colecao, id));
    } catch (err: any) {
      setError(err.message || 'erro ao deletar item');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    fetchItems,
    addItem,
    deleteItem,
    loading,
    error,
  };
}
