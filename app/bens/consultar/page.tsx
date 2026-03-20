'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import Toast from '@/app/components/Toast';
import { X, Edit, History, Loader2, Plus, ChevronDown } from 'lucide-react';
import { Bem } from '@/lib/types';
import { useGestaoData } from '@/lib/useGestaoData';
import Link from 'next/link';

export default function ConsultaBensPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { categorias, departamentos, status, marcas, loading: gestaoLoading } = useGestaoData();
  
  const [bens, setBens] = useState<(Bem & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Filtros
  const [filters, setFilters] = useState({
    nome_item: '',
    marca: '',
    categoria: '',
    departamento: '',
    responsavel: '',
    localizacao: '',
    status: '',
    numero_serie: '',
  });

  const [allBens, setAllBens] = useState<(Bem & { id: string })[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'bens'), (snapshot) => {
      const bensData: (Bem & { id: string })[] = [];
      snapshot.forEach((doc) => {
        bensData.push({
          id: doc.id,
          ...doc.data(),
        } as Bem & { id: string });
      });

      setAllBens(bensData);
      setBens(bensData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSearch = () => {
    let filtered = allBens;

    if (filters.nome_item) {
      filtered = filtered.filter((bem) =>
        bem.nome_item?.toLowerCase().includes(filters.nome_item.toLowerCase())
      );
    }
    if (filters.marca) {
      filtered = filtered.filter((bem) =>
        bem.marca?.toLowerCase().includes(filters.marca.toLowerCase())
      );
    }
    if (filters.categoria) {
      filtered = filtered.filter((bem) => bem.categoria === filters.categoria);
    }
    if (filters.departamento) {
      filtered = filtered.filter((bem) => bem.departamento === filters.departamento);
    }
    if (filters.responsavel) {
      filtered = filtered.filter((bem) =>
        bem.responsavel?.toLowerCase().includes(filters.responsavel.toLowerCase())
      );
    }
    if (filters.localizacao) {
      filtered = filtered.filter((bem) =>
        bem.localizacao?.toLowerCase().includes(filters.localizacao.toLowerCase())
      );
    }
    if (filters.status) {
      filtered = filtered.filter((bem) => bem.status === filters.status);
    }
    if (filters.numero_serie) {
      filtered = filtered.filter((bem) =>
        bem.numero_serie?.toLowerCase().includes(filters.numero_serie.toLowerCase())
      );
    }

    setBens(filtered);
  };

  const handleClearFilters = () => {
    setFilters({
      nome_item: '',
      marca: '',
      categoria: '',
      departamento: '',
      responsavel: '',
      localizacao: '',
      status: '',
      numero_serie: '',
    });
    setBens(allBens);
    setToastMessage('Filtros limpos!');
    setShowToast(true);
  };

  if (authLoading || loading || gestaoLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-slate-300 w-8 h-8" />
      </div>
    );
  }

  const inputClass = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm font-medium transition-all outline-none focus:ring-1 focus:ring-slate-950 focus:border-slate-950 placeholder:text-slate-400";
  const labelClass = "block text-sm font-medium text-slate-700 mb-2";

  const getStatusColor = (status: string) => {
    return status === 'Em uso' ? 'bg-green-100 text-green-700' :
           status === 'Conserto' ? 'bg-yellow-100 text-yellow-700' :
           status === 'Emprestado' ? 'bg-blue-100 text-blue-700' :
           status === 'Sucata' || status === 'Descartado' ? 'bg-red-100 text-red-700' :
           'bg-slate-100 text-slate-700';
  };

  return (
    <div className="min-h-screen bg-white">
      {showToast && (
        <Toast 
          message={toastMessage} 
          type="success" 
          duration={2000}
          onClose={() => setShowToast(false)}
        />
      )}

      {/* navbar */}
      <nav className="border-b border-slate-100 px-6 h-14 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-30">
        <div className="flex items-center gap-4">
          <h1 className="text-gray-800 text-base font-bold ">Consulta de Bens</h1>
        </div>
        <Link href="/bens/novo">
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-950 text-white text-xs font-black rounded-lg hover:shadow-lg transition">
            <Plus className="w-4 h-4" />
            + Novo Bem
          </button>
        </Link>
      </nav>

      {/* filtros */}
      <div className="bg-slate-50/50 border-b border-slate-100 p-6">
        <div className="max-w-full">
          <h2 className="text-sm font-bold text-slate-900 mb-4">Filtros de Busca</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className={labelClass}>Nome do Item</label>
              <input
                type="text"
                placeholder="Ex: Servidor..."
                value={filters.nome_item}
                onChange={(e) => handleFilterChange('nome_item', e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Marca</label>
              <input
                type="text"
                placeholder="Ex: Dell..."
                value={filters.marca}
                onChange={(e) => handleFilterChange('marca', e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Categoria</label>
              <select
                value={filters.categoria}
                onChange={(e) => handleFilterChange('categoria', e.target.value)}
                className={inputClass}
              >
                <option value="">Todas</option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.nome}>
                    {cat.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Departamento</label>
              <select
                value={filters.departamento}
                onChange={(e) => handleFilterChange('departamento', e.target.value)}
                className={inputClass}
              >
                <option value="">Todos</option>
                {departamentos.map((dept) => (
                  <option key={dept.id} value={dept.nome}>
                    {dept.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Responsável</label>
              <input
                type="text"
                placeholder="Ex: João..."
                value={filters.responsavel}
                onChange={(e) => handleFilterChange('responsavel', e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Localização</label>
              <input
                type="text"
                placeholder="Ex: Sala 202..."
                value={filters.localizacao}
                onChange={(e) => handleFilterChange('localizacao', e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className={inputClass}
              >
                <option value="">Todos</option>
                {status.map((s) => (
                  <option key={s.id} value={s.nome}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Número de Série</label>
              <input
                type="text"
                placeholder="SN..."
                value={filters.numero_serie}
                onChange={(e) => handleFilterChange('numero_serie', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* botoes de Ação */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSearch}
              className="flex items-center gap-2 px-4 py-2 bg-slate-950 text-white text-xs font-bold rounded-lg hover:bg-slate-900 transition"
            >
              Pesquisar
            </button>
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition"
            >
              <X className="w-4 h-4" />
              Limpar Campos
            </button>
            <span className="text-xs text-slate-500 font-medium">
              {bens.length} resultado{bens.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* resultados */}
      <main className="p-6">
        {bens.length === 0 ? (
          <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-12 text-center">
            <p className="text-slate-500 text-sm">Nenhum bem encontrado com os filtros selecionados.</p>
          </div>
        ) : (
          <>

            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-3 py-2 text-left  text-slate-600 ">Ações</th>
                    <th className="px-3 py-2 text-left  text-slate-600 ">Nome</th>
                    <th className="px-3 py-2 text-left  text-slate-600 ">Categoria</th>
                    <th className="px-3 py-2 text-left  text-slate-600 ">Marca</th>
                    <th className="px-3 py-2 text-left  text-slate-600 ">Modelo</th>
                    <th className="px-3 py-2 text-left  text-slate-600 ">SN</th>
                    <th className="px-3 py-2 text-left  text-slate-600 ">Processador</th>
                    <th className="px-3 py-2 text-left  text-slate-600 ">RAM</th>
                    <th className="px-3 py-2 text-left  text-slate-600 ">Armazenamento</th>
                    <th className="px-3 py-2 text-left  text-slate-600 ">Qtde</th>
                    <th className="px-3 py-2 text-left  text-slate-600 ">Departamento</th>
                    <th className="px-3 py-2 text-left  text-slate-600 ">Localização</th>
                    <th className="px-3 py-2 text-left  text-slate-600 ">Responsável</th>
                    <th className="px-3 py-2 text-left  text-slate-600 ">Data Aquisição</th>
                    <th className="px-3 py-2 text-left  text-slate-600 ">Valor (R$)</th>
                    <th className="px-3 py-2 text-left  text-slate-600 ">Status</th>
                    <th className="px-3 py-2 text-left  text-slate-600 ">Cdastrado por</th>
                    <th className="px-3 py-2 text-left  text-slate-600 ">Dt.Cadastro</th>
                  </tr>
                </thead>
                <tbody>
                  {bens.map((bem) => (
                    <tr key={bem.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => router.push(`/bens/${bem.id}`)}
                            className="p-1 hover:bg-blue-100 rounded text-blue-600 hover:text-blue-700"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setExpandedCard(bem.id)}
                            className="p-1 hover:bg-orange-100 rounded text-orange-600 hover:text-orange-700"
                            title="Ver Histórico"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-900">{bem.nome_item}</td>
                      <td className="px-3 py-2 text-slate-600">{bem.categoria}</td>
                      <td className="px-3 py-2 text-slate-600">{bem.marca || '—'}</td>
                      <td className="px-3 py-2 text-slate-600">{bem.codigo_modelo || '—'}</td>
                      <td className="px-3 py-2 text-slate-600 font-mono text-[10px]">{bem.numero_serie || '—'}</td>
                      <td className="px-3 py-2 text-slate-600">{bem.modelo_processador || '—'}</td>
                      <td className="px-3 py-2 text-slate-600">{bem.ram || '—'}</td>
                      <td className="px-3 py-2 text-slate-600">{bem.armazenamento || '—'}</td>
                      <td className="px-3 py-2 text-slate-600 text-center">{bem.qtde}</td>
                      <td className="px-3 py-2 text-slate-600">{bem.departamento}</td>
                      <td className="px-3 py-2 text-slate-600">{bem.localizacao}</td>
                      <td className="px-3 py-2 text-slate-600">{bem.responsavel || '—'}</td>
                      <td className="px-3 py-2 text-slate-600 text-[10px]">{bem.data_aquisicao}</td>
                      <td className="px-3 py-2 text-slate-600 text-right">R$ {bem.valor?.toFixed(2) || '0,00'}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold truncate ${getStatusColor(bem.status)}`}>
                          {bem.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600 text-[10px]">{bem.criado_por}</td>
                      <td className="px-3 py-2 text-slate-600 text-[10px]">{bem.criado_em?.substring(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tablet/Mobile: Cards Expandíveis */}
            <div className="lg:hidden space-y-3">
              {bens.map((bem) => (
                <div key={bem.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                  {/* Header do Card */}
                  <div className="p-4 bg-linear-to-r from-slate-50 to-slate-100 border-b border-slate-100">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900 text-sm">{bem.nome_item}</h3>
                        <p className="text-xs text-slate-500 mt-1">{bem.categoria} - {bem.marca || 'Sem marca'}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ml-2 ${getStatusColor(bem.status)}`}>
                        {bem.status}
                      </span>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex items-center gap-2 mt-3">
                      <button 
                        onClick={() => router.push(`/bens/${bem.id}`)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition"
                      >
                        <Edit className="w-4 h-4" />
                        Editar
                      </button>
                      <button 
                        onClick={() => setExpandedCard(expandedCard === bem.id ? null : bem.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-orange-600 text-white text-xs font-bold rounded-lg hover:bg-orange-700 transition"
                      >
                        <History className="w-4 h-4" />
                        Histórico
                      </button>
                    </div>
                  </div>

          
                  {expandedCard === bem.id && (
                    <div className="p-4 bg-slate-50 space-y-3 border-t border-slate-100">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-slate-500 font-bold">Modelo</p>
                          <p className="text-slate-900">{bem.codigo_modelo || '—'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 font-bold">Nº Série</p>
                          <p className="text-slate-900 font-mono text-[10px]">{bem.numero_serie || '—'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 font-bold">Processador</p>
                          <p className="text-slate-900">{bem.modelo_processador || '—'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 font-bold">Qtd. CPU</p>
                          <p className="text-slate-900">{bem.qtde_processadores || '—'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 font-bold">RAM</p>
                          <p className="text-slate-900">{bem.ram || '—'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 font-bold">Armazenamento</p>
                          <p className="text-slate-900">{bem.armazenamento || '—'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 font-bold">Quantidade</p>
                          <p className="text-slate-900">{bem.qtde}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 font-bold">Data Aquisição</p>
                          <p className="text-slate-900">{bem.data_aquisicao}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 font-bold">Valor (R$)</p>
                          <p className="text-slate-900 font-bold">{bem.valor?.toFixed(2) || '0,00'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 font-bold">Departamento</p>
                          <p className="text-slate-900">{bem.departamento}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 font-bold">Localização</p>
                          <p className="text-slate-900">{bem.localizacao}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 font-bold">Responsável</p>
                          <p className="text-slate-900">{bem.responsavel || '—'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 font-bold">Criado Por</p>
                          <p className="text-slate-900 text-[10px]">{bem.criado_por}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-slate-500 font-bold">Criado em</p>
                          <p className="text-slate-900 text-[10px]">{bem.criado_em}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-slate-500 font-bold">Atualizado em</p>
                          <p className="text-slate-900 text-[10px]">{bem.atualizado_em}</p>
                        </div>
                      </div>

                      {/* historico */}
                      {bem.historico && bem.historico.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <p className="text-slate-500 font-bold text-xs mb-3">Histórico ({bem.historico.length})</p>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {bem.historico.map((hist, idx) => (
                              <div key={idx} className="bg-white p-2 rounded border border-slate-200 text-[10px]">
                                <p className="font-bold text-slate-900">{hist.acao}</p>
                                <p className="text-slate-600">{hist.usuario} - {hist.data}</p>
                                {hist.detalhes && <p className="text-slate-500 mt-1">{hist.detalhes}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
