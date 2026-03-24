'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, RotateCw, Pencil } from 'lucide-react';
import Toast from './Toast';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

interface Item {
  id: string;
  nome: string;
  cor?: string;
  criado_em?: string;
  atualizado_em?: string;
}

interface GestaoFormProps {
  titulo: string;
  colecao: string;
  onFetch?: (items: Item[]) => void;
  loading?: boolean;
  externalItems?: Item[];
}

export default function GestaoForm({
  titulo,
  colecao,
  onFetch,
  loading: externalLoading = false,
  externalItems,
}: GestaoFormProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>(externalItems || []);
  const [novoItem, setNovoItem] = useState('');
  // pra edição inline de status
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editCor, setEditCor] = useState<string>('#fbbf24');
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  // agora para status: campo cor
  const [novaCor, setNovaCor] = useState<string>("#fbbf24");

  //pega o token de autenticação para as requisições à API
  const getAuthHeader = async (): Promise<Record<string, string>> => {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session?.access_token) {
      return {};
    }

    return {
      Authorization: `Bearer ${data.session.access_token}`,
    };
  };

  const fetchItems = async () => {
    if (externalItems) return;

    setLoading(true);
    try {
      const authHeader = await getAuthHeader();
      const response = await fetch(`/api/gestao/${colecao}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar itens');
      }

      const data = await response.json();
      setItems(data);
      onFetch?.(data);
      setToastMessage('Atualizado com sucesso!');
      setToastType('success');
    } catch (error: any) {
      setToastMessage(error.message || 'Erro ao buscar itens');
      setToastType('error');
    } finally {
      setLoading(false);
      setShowToast(true);
    }
  };

  useEffect(() => {
    if (!externalItems) {
      fetchItems();
    }
  }, [colecao]);

  const handleAdicionar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoItem.trim()) return;

    setLoading(true);
    try {
      const authHeader = await getAuthHeader();
      const body: any = { nome: novoItem };
      if (colecao === 'status') body.cor = novaCor;
      const response = await fetch(`/api/gestao/${colecao}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao adicionar');
      }

      const novoReg = await response.json();
      setItems([novoReg, ...items]);
      setNovoItem('');
      if (colecao === 'status') setNovaCor('#fbbf24');
      setToastMessage(`${titulo} adicionado com sucesso!`);
      setToastType('success');
    } catch (error: any) {
      setToastMessage(error.message || 'Erro ao adicionar');
      setToastType('error');
    } finally {
      setLoading(false);
      setShowToast(true);
    }
  };

  const handleDeletar = async (id: string, nome: string) => {
    if (!confirm(`Tem certeza que deseja deletar "${nome}"?`)) return;

    try {
      const authHeader = await getAuthHeader();
      const response = await fetch(`/api/gestao/${colecao}/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao deletar');
      }

      setItems(items.filter((item) => item.id !== id));
      setToastMessage('Deletado com sucesso!');
      setToastType('success');
    } catch (error: any) {
      setToastMessage(error.message || 'Erro ao deletar');
      setToastType('error');
    } finally {
      setShowToast(true);
    }
  };

  // função para salvar edição
  const handleSalvarEdicao = async (item: Item) => {
    setLoading(true);
    try {
      const authHeader = await getAuthHeader();
      const body: any = { nome: editNome };
      if (colecao === 'status') body.cor = editCor;
      const response = await fetch(`/api/gestao/${colecao}/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao editar');
      }
      // att localmente
      setItems(items.map(i => i.id === item.id ? { ...i, nome: editNome, cor: editCor } : i));
      setEditandoId(null);
      setToastMessage('Editado com sucesso!');
      setToastType('success');
    } catch (error: any) {
      setToastMessage(error.message || 'Erro ao editar');
      setToastType('error');
    } finally {
      setLoading(false);
      setShowToast(true);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          duration={3000}
          onClose={() => setShowToast(false)}
        />
      )}

      <div className="max-w-4xl mx-auto p-6 md:p-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{titulo}</h1>
        </div>

        {/* Formulário de add */}
        <form onSubmit={handleAdicionar} className="mb-12">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <input
              type="text"
              value={novoItem}
              onChange={(e) => setNovoItem(e.target.value)}
              placeholder={`Digite o nome do novo ${titulo.toLowerCase()}...`}
              className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm font-medium transition-all outline-none focus:ring-1 focus:ring-slate-950 placeholder:text-slate-400"
            />
            {colecao === 'status' && (
              <div className="flex items-center gap-2">
                <label htmlFor="cor" className="text-xs text-slate-700">Cor:</label>
                <input
                  id="cor"
                  type="color"
                  value={novaCor}
                  onChange={e => setNovaCor(e.target.value)}
                  className="w-8 h-8 p-0 border-0 bg-transparent cursor-pointer"
                  title="Escolher cor do status"
                />
              </div>
            )}
            <button
              type="submit"
              disabled={loading || externalLoading || !novoItem.trim()}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-950 text-white text-sm font-bold rounded-xl hover:shadow-lg transition disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Adicionar
            </button>
          </div>
        </form>

        {/* Seção de Itens */}
        <div className="bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden">
          {/* Header da Tabela */}
          <div className="px-6 py-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Total de registros: {items.length}
            </h2>
            <button
              onClick={() => {
                if (!externalItems) fetchItems();
              }}
              disabled={loading || externalLoading}
              className="p-2 hover:bg-slate-200 rounded-lg transition disabled:opacity-50"
              title="Atualizar"
            >
              <RotateCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Lista de Itens */}
          {items.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-500 text-sm">Nenhum item cadastrado ainda</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition"
                >
                  <div className="flex-1 flex items-center gap-3">
                    {colecao === 'status' && (
                      <span
                        className="inline-block w-5 h-5 rounded-full border border-slate-200 mr-2"
                        style={{ backgroundColor: item.cor || '#fbbf24' }}
                        title={item.cor}
                      />
                    )}
                    {editandoId === item.id ? (
                      <>
                        <input
                          type="text"
                          value={editNome}
                          onChange={e => setEditNome(e.target.value)}
                          className="px-2 py-1 text-gray-800 border rounded text-sm mr-2"
                        />
                        {colecao === 'status' && (
                          <input
                            type="color"
                            value={editCor}
                            onChange={e => setEditCor(e.target.value)}
                            className="w-8 h-8 p-0 border-0 bg-transparent cursor-pointer"
                            title="Editar cor do status"
                          />
                        )}
                        <button
                          className="ml-2 px-3 py-1 bg-emerald-500 text-white rounded text-xs font-bold hover:bg-emerald-600"
                          onClick={() => handleSalvarEdicao(item)}
                          disabled={loading || !editNome.trim()}
                          type="button"
                        >Salvar</button>
                        <button
                          className="ml-2 px-3 py-1 bg-slate-200 text-slate-700 rounded text-xs font-bold hover:bg-slate-300"
                          onClick={() => setEditandoId(null)}
                          type="button"
                        >Cancelar</button>
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-slate-900 inline-block mr-2">{item.nome}</p>
                        <button
                          className="p-1 text-slate-500 hover:text-amber-500"
                          title="Editar"
                          onClick={() => {
                            setEditandoId(item.id);
                            setEditNome(item.nome);
                            setEditCor(item.cor || '#fbbf24');
                          }}
                          type="button"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {item.criado_em && (
                      <p className="text-xs text-slate-500 mt-1 ml-4">
                        Criado em: {new Date(item.criado_em).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeletar(item.id, item.nome)}
                    disabled={loading}
                    className="p-2 hover:bg-red-100 rounded-lg transition text-red-600 hover:text-red-700 disabled:opacity-50"
                    title="Deletar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
