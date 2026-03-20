import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

interface GestaoItem {
  id: string;
  nome: string;
}

interface GestaoData {
  categorias: GestaoItem[];
  status: GestaoItem[];
  departamentos: GestaoItem[];
  marcas: GestaoItem[];
  loading: boolean;
  error: string | null;
}

export function useGestaoData(): GestaoData {
  const [categorias, setCategorias] = useState<GestaoItem[]>([]);
  const [status, setStatus] = useState<GestaoItem[]>([]);
  const [departamentos, setDepartamentos] = useState<GestaoItem[]>([]);
  const [marcas, setMarcas] = useState<GestaoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    let unsubscribers: (() => void)[] = [];

    try {
      // carregar Categorias
      const categoriasUnsub = onSnapshot(
        query(collection(db, 'categorias'), orderBy('criado_em', 'desc')),
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            nome: doc.data().nome,
          }));
          setCategorias(data);
        },
        (err) => {
          console.error('erro ao buscar categorias:', err);
          setError('erro ao carregar categorias');
        }
      );
      unsubscribers.push(categoriasUnsub);

      // carregar Status
      const statusUnsub = onSnapshot(
        query(collection(db, 'status'), orderBy('criado_em', 'desc')),
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            nome: doc.data().nome,
          }));
          setStatus(data);
        },
        (err) => {
          console.error('erro ao buscar status:', err);
          setError('erro ao carregar status');
        }
      );
      unsubscribers.push(statusUnsub);

      // carregar Departamentos
      const departamentosUnsub = onSnapshot(
        query(collection(db, 'departamentos'), orderBy('criado_em', 'desc')),
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            nome: doc.data().nome,
          }));
          setDepartamentos(data);
        },
        (err) => {
          console.error('erro ao buscar departamentos:', err);
          setError('erro ao carregar departamentos');
        }
      );
      unsubscribers.push(departamentosUnsub);

      // carregar Marcas
      const marcasUnsub = onSnapshot(
        query(collection(db, 'marcas'), orderBy('criado_em', 'desc')),
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            nome: doc.data().nome,
          }));
          setMarcas(data);
        },
        (err) => {
          console.error('erro ao buscar marcas:', err);
          setError('erro ao carregar marcas');
        }
      );
      unsubscribers.push(marcasUnsub);

      setLoading(false);
    } catch (err: any) {
      console.error('erro ao configurar listeners:', err);
      setError('erro ao carregar dados');
      setLoading(false);
    }

    // limpar
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, []);

  return {
    categorias,
    status,
    departamentos,
    marcas,
    loading,
    error,
  };
}
