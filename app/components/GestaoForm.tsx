'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, RotateCw } from 'lucide-react';
import Toast from './Toast';
import { useGestaoFirebase } from '@/lib/useGestaoFirebase';

interface Item {
  id: string;
  nome: string;
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
  const [items, setItems] = useState<Item[]>(externalItems || []);
  const [novoItem, setNovoItem] = useState('');
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const { fetchItems: fetchFirebaseItems, addItem, deleteItem } = useGestaoFirebase(colecao);


  useEffect(() => {
    if (externalItems) {
      setItems(externalItems);
    }
  }, [externalItems]);

  
  const fetchItems = async () => {
    if (externalItems) return; 

    setLoading(true);
    try {
      const data = await fetchFirebaseItems();
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
      const novoReg = await addItem(novoItem);
      setItems([novoReg, ...items]);
      setNovoItem('');
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
      await deleteItem(id);
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
          <p className="text-sm text-slate-500">Gerencie os itens do seu catálogo</p>
        </div>

        {/* Formulário de add */}
        <form onSubmit={handleAdicionar} className="mb-12">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={novoItem}
              onChange={(e) => setNovoItem(e.target.value)}
              placeholder={`Digite o nome do novo ${titulo.toLowerCase()}...`}
              className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm font-medium transition-all outline-none focus:ring-1 focus:ring-slate-950 placeholder:text-slate-400"
            />
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
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{item.nome}</p>
                    {item.criado_em && (
                      <p className="text-xs text-slate-500 mt-1">
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
