'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Categoria, Marca, Departamento, StatusItem } from '@/lib/supabase';

interface GestaoItem {
  id: string;
  nome: string;
}

interface GestaoData {
  categorias: GestaoItem[];
  status: GestaoItem[];
  departamentos: GestaoItem[];
  marcas: GestaoItem[];
  tiposBem: GestaoItem[];
  loading: boolean;
  error: string | null;
}

export function useGestaoData(): GestaoData {
  const [categorias, setCategorias] = useState<GestaoItem[]>([]);
  const [status, setStatus] = useState<GestaoItem[]>([]);
  const [departamentos, setDepartamentos] = useState<GestaoItem[]>([]);
  const [marcas, setMarcas] = useState<GestaoItem[]>([]);
  const [tiposBem, setTiposBem] = useState<GestaoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        // buscar Categorias
        const { data: categoriasData, error: categoriaError } = await supabase
          .from('categorias')
          .select('id, nome')
          .order('criado_em', { ascending: false });

        if (categoriaError) throw categoriaError;
        setCategorias(categoriasData || []);

        // buscar Status
        const { data: statusData, error: statusError } = await supabase
          .from('status')
          .select('id, nome')
          .order('criado_em', { ascending: false });

        if (statusError) throw statusError;
        setStatus(statusData || []);

        // buscar Departamentos
        const { data: departamentosData, error: departamentoError } = await supabase
          .from('departamentos')
          .select('id, nome')
          .order('criado_em', { ascending: false });

        if (departamentoError) throw departamentoError;
        setDepartamentos(departamentosData || []);

        // buscar Marcas
        const { data: marcasData, error: marcasError } = await supabase
          .from('marcas')
          .select('id, nome')
          .order('criado_em', { ascending: false });

        if (marcasError) throw marcasError;
        setMarcas(marcasData || []);

        // buscar Tipos de Bem
        const { data: tiposBemData, error: tiposBemError } = await supabase
          .from('tipos_bem')
          .select('id, nome')
          .order('criado_em', { ascending: false });

        if (tiposBemError) throw tiposBemError;
        setTiposBem(tiposBemData || []);

        setLoading(false);
      } catch (err: any) {
        console.error('erro ao buscar dados de gestão:', err);
        setError(err.message || 'erro ao carregar dados');
        setLoading(false);
      }
    };

    fetchData();

    // configurar real-time subscriptions
    const channels: any[] = [];

    const categoriasChannel = supabase
      .channel('categorias-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categorias' },
        () => {
          // recarregar quando tiver mudanças
          supabase
            .from('categorias')
            .select('id, nome')
            .order('criado_em', { ascending: false })
            .then(({ data }) => setCategorias(data || []));
        }
      )
      .subscribe();

    channels.push(categoriasChannel);

    const statusChannel = supabase
      .channel('status-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'status' },
        () => {
          supabase
            .from('status')
            .select('id, nome')
            .order('criado_em', { ascending: false })
            .then(({ data }) => setStatus(data || []));
        }
      )
      .subscribe();

    channels.push(statusChannel);

    const departamentosChannel = supabase
      .channel('departamentos-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'departamentos' },
        () => {
          supabase
            .from('departamentos')
            .select('id, nome')
            .order('criado_em', { ascending: false })
            .then(({ data }) => setDepartamentos(data || []));
        }
      )
      .subscribe();

    channels.push(departamentosChannel);

    const marcasChannel = supabase
      .channel('marcas-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'marcas' },
        () => {
          supabase
            .from('marcas')
            .select('id, nome')
            .order('criado_em', { ascending: false })
            .then(({ data }) => setMarcas(data || []));
        }
      )
      .subscribe();

    channels.push(marcasChannel);

    const tiposBemChannel = supabase
      .channel('tipos_bem-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tipos_bem' },
        () => {
          supabase
            .from('tipos_bem')
            .select('id, nome')
            .order('criado_em', { ascending: false })
            .then(({ data }) => setTiposBem(data || []));
        }
      )
      .subscribe();

    channels.push(tiposBemChannel);

    // Cleanup
    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, []);

  return {
    categorias,
    status,
    departamentos,
    marcas,
    tiposBem,
    loading,
    error,
  };
}
