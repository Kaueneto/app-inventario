'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useGestaoData } from '@/lib/useGestaoData';
import { supabase } from '@/lib/supabase';
import type { BemSupabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart
} from 'recharts';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { categorias, departamentos, marcas, tiposBem, status: statusList, loading: gestaoLoading } = useGestaoData();
  const [bens, setBens] = useState<BemSupabase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // função p resolver nomes a partir de IDs
  const getCategoryName = (categoryId: string | null | undefined) => {
    if (!categoryId) return 'Indefinida';
    const category = categorias.find(c => c.id === categoryId);
    return category?.nome || 'Indefinida';
  };

  const getBrandName = (brandId: string | null | undefined) => {
    if (!brandId) return 'Sem marca';
    const brand = marcas.find(m => m.id === brandId);
    return brand?.nome || 'Sem marca';
  };

  const getTipoBemName = (tipoBemId: string | null | undefined) => {
    if (!tipoBemId) return 'Sem tipo';
    const tipo = tiposBem.find(t => t.id === tipoBemId);
    return tipo?.nome || 'Sem tipo';
  };

  const getDepartmentName = (departmentId: string | null | undefined) => {
    if (!departmentId) return 'Indefinido';
    const dept = departamentos.find(d => d.id === departmentId);
    return dept?.nome || 'Indefinido';
  };

  const getStatusName = (statusId: string | null | undefined) => {
    if (!statusId) return 'Indefinido';
    const stat = statusList.find(s => s.id === statusId);
    return stat?.nome || 'Indefinido';
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    
    const fetchBens = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('bens')
        .select('*')
        .order('criado_em', { ascending: false });
      
      if (error) {
        console.error('Erro ao buscar bens:', error);
      } else {
        setBens(data || []);
      }
      setIsLoading(false);
    };

    fetchBens();

    // realtime subscription
    const channel = supabase
      .channel('dashboard-bens-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bens'
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setBens(prev => prev.filter(b => b.id !== (payload.old as BemSupabase).id));
          } else {
            const newBem = payload.new as BemSupabase;
            setBens(prev => {
              const existing = prev.find(b => b.id === newBem.id);
              if (existing) {
                return prev.map(b => b.id === newBem.id ? newBem : b);
              }
              return [newBem, ...prev];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const stats = useMemo(() => ({
    totalItens: bens.reduce((acc, b) => acc + (Number(b.qtde) || 0), 0),
    totalValor: bens.reduce((acc, b) => acc + (Number(b.valor) || 0), 0),
    totalBens: bens.length,
    categorias: new Set(bens.map(b => b.categoria_id)).size,
  }), [bens]);

  const marcasData = useMemo(() => {
    const marcasMap = new Map<string, number>();
    bens.forEach(bem => {
      const marca = getBrandName(bem.marca_id);
      marcasMap.set(marca, (marcasMap.get(marca) || 0) + Number(bem.qtde || 0));
    });
    return Array.from(marcasMap, ([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [bens, marcas]);

  const categoriasData = useMemo(() => {
    const categoriasMap = new Map<string, number>();
    bens.forEach(bem => {
      const categoria = getCategoryName(bem.categoria_id);
      categoriasMap.set(categoria, (categoriasMap.get(categoria) || 0) + Number(bem.qtde || 0));
    });
    return Array.from(categoriasMap, ([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [bens, categorias]);

  const tiposBemData = useMemo(() => {
    const tiposMap = new Map<string, number>();
    bens.forEach((bem) => {
      const tipo = getTipoBemName(bem.tipo_bem_id);
      tiposMap.set(tipo, (tiposMap.get(tipo) || 0) + Number(bem.qtde || 0));
    });
    return Array.from(tiposMap, ([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [bens, tiposBem]);

  const statusData = useMemo(() => {
    const statusMap = new Map<string, number>();
    bens.forEach(bem => {
      const status = getStatusName(bem.status_id);
      statusMap.set(status, (statusMap.get(status) || 0) + Number(bem.qtde || 0));
    });
    return Array.from(statusMap, ([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [bens, statusList]);

  const departamentosData = useMemo(() => {
    const departamentosMap = new Map<string, number>();
    bens.forEach(bem => {
      const depto = getDepartmentName(bem.departamento_id);
      departamentosMap.set(depto, (departamentosMap.get(depto) || 0) + Number(bem.qtde || 0));
    });
    return Array.from(departamentosMap, ([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [bens, departamentos]);

  const valoresCategorias = useMemo(() => {
    const categoriasMap = new Map<string, number>();
    bens.forEach(bem => {
      const categoria = getCategoryName(bem.categoria_id);
      categoriasMap.set(categoria, (categoriasMap.get(categoria) || 0) + (Number(bem.valor || 0) * Number(bem.qtde || 1)));
    });
    return Array.from(categoriasMap, ([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [bens, categorias]);

  const aquisicoesTempo = useMemo(() => {
    const aquisMap = new Map<string, { data: string; quantidade: number }>();
    bens.forEach(bem => {
      if (bem.data_aquisicao) {
        const chave = bem.data_aquisicao.substring(0, 7);
        if (aquisMap.has(chave)) {
          const item = aquisMap.get(chave)!;
          item.quantidade += Number(bem.qtde || 1);
        } else {
          aquisMap.set(chave, { data: chave, quantidade: Number(bem.qtde || 1) });
        }
      }
    });
    
    return Array.from(aquisMap.values())
      .sort((a, b) => a.data.localeCompare(b.data))
      .slice(-12);
  }, [bens]);

  const CORES = ['#000000', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

  if (loading || isLoading || gestaoLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-black mx-auto mb-4" />
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="flex-1 overflow-auto bg-gray-50">
      <div className="px-4 md:px-6 py-6">
        <div className="mx-auto w-full">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-black mb-2">Dashboard</h1>
            <p className="text-gray-600">Olá, {user.email}</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-black rounded-xl shadow-sm p-6">
              <div>
                <p className="text-white/80 text-sm font-medium mb-2">Total de Itens</p>
                <p className="text-3xl font-bold text-white">{stats.totalItens.toLocaleString('pt-BR')}</p>
              </div>
            </div>

            <div className="bg-blue-500 rounded-xl shadow-sm p-6">
              <div>
                <p className="text-white/80 text-sm font-medium mb-2">Valor Total em Bens</p>
                <p className="text-3xl font-bold text-white">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalValor)}
                </p>
              </div>
            </div>

            <div className="bg-green-500 rounded-xl shadow-sm p-6">
              <div>
                <p className="text-white/80 text-sm font-medium mb-2">Total de Bens</p>
                <p className="text-3xl font-bold text-white">{stats.totalBens}</p>
              </div>
            </div>

            <div className="bg-purple-500 rounded-xl shadow-sm p-6">
              <div>
                <p className="text-white/80 text-sm font-medium mb-2">Categorias</p>
                <p className="text-3xl font-bold text-white">{stats.categorias}</p>
              </div>
            </div>
          </div>

          {/* Gráficos - Primeira Linha */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Marcas */}
            <div className="bg-white text-gray-800  rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold text-black mb-4">Distribuição por Marca</h2>
              {marcasData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={marcasData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                    <Bar dataKey="value" fill="#000" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-12">Sem dados</p>
              )}
            </div>

            {/* Categorias - Pizza */}
            <div className="bg-white text-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold text-black mb-4">Distribuição por Categoria</h2>
              {categoriasData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoriasData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#000"
                      dataKey="value"
                    >
                      {categoriasData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-12">Sem dados</p>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="bg-white text-gray-800 rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold text-black mb-4">Visão Geral por Tipo de Bem</h2>
            {tiposBemData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={tiposBemData} layout="vertical" margin={{ left: 40, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0f172a" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-12">Sem dados de tipo de bem</p>
            )}
          </div>

          {/* Status */}
          <div className="bg-white text-gray-800  rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold text-black mb-4">Status dos Itens</h2>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statusData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-12">Sem dados</p>
            )}
          </div>

          {/* Segunda linha de gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Departamentos */}
            <div className="bg-white text-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold text-black mb-4">Itens por Departamento</h2>
              {departamentosData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={departamentosData} layout="vertical" margin={{ left: 150 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-800 text-center py-12">Sem dados</p>
              )}
            </div>

            {/* Valores por Categoria */}
            <div className="bg-white text-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold text-black mb-4">Valor Investido por Categoria</h2>
              {valoresCategorias.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={valoresCategorias}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#000" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#000" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value) => new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(Number(value))}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#000"
                      fillOpacity={1}
                      fill="url(#colorValue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-800 text-center py-12">Sem dados</p>
              )}
            </div>
          </div>

          {/* Aquisições ao longo do tempo */}
          <div className="bg-white text-gray-800  rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold text-black mb-4">Aquisições ao Longo do Tempo (Últimos 12 Meses)</h2>
            {aquisicoesTempo.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={aquisicoesTempo}>
                  <defs>
                    <linearGradient id="colorAquis" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="data" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} label={{ value: 'Quantidade', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="quantidade"
                    stroke="#3B82F6"
                    fillOpacity={1}
                    fill="url(#colorAquis)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-12">Sem dados de aquisições</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
