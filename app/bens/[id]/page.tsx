'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc, arrayUnion } from 'firebase/firestore';
import { Bem, Historico, STATUS_OPTIONS } from '@/lib/types';
import Link from 'next/link';

export default function BemDetailPage() {
  const router = useRouter();
  const params = useParams();
  const bemId = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const [bem, setBem] = useState<Bem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showMovimentacao, setShowMovimentacao] = useState(false);

  // dados da movimentação
  const [movimentacao, setMovimentacao] = useState({
    acao: '',
    detalhes: '',
    novo_departamento: bem?.departamento || '',
    novo_responsavel: bem?.responsavel || '',
    novo_status: bem?.status || 'Em uso',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !bemId) return;

    const fetchBem = async () => {
      try {
        const docRef = doc(db, 'bens', bemId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setBem({
            id: docSnap.id,
            ...docSnap.data(),
          } as Bem);
          setMovimentacao((prev) => ({
            ...prev,
            novo_departamento: docSnap.data().departamento || '',
            novo_responsavel: docSnap.data().responsavel || '',
            novo_status: docSnap.data().status || 'Em uso',
          }));
        } else {
          setError('Bem não encontrado');
        }
      } catch (err) {
        console.error('erro ao buscar bem:', err);
        setError('erro ao carregar bem');
      } finally {
        setLoading(false);
      }
    };

    fetchBem();
  }, [user, bemId]);

  const handleRegistrarMovimentacao = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const novoHistorico: Historico = {
        data: new Date().toISOString(),
        acao: movimentacao.acao,
        usuario: user?.email || 'Sistema',
        detalhes: movimentacao.detalhes,
        novo_departamento: movimentacao.novo_departamento,
        novo_responsavel: movimentacao.novo_responsavel,
        novo_status: movimentacao.novo_status,
      };

      const docRef = doc(db, 'bens', bemId);

      // atualizar o bem com novo histórico e novos valores se mudaram
      const updateData: any = {
        historico: arrayUnion(novoHistorico),
        atualizado_em: new Date().toISOString(),
      };

      if (movimentacao.novo_departamento !== bem?.departamento) {
        updateData.departamento = movimentacao.novo_departamento;
      }
      if (movimentacao.novo_responsavel !== bem?.responsavel) {
        updateData.responsavel = movimentacao.novo_responsavel;
      }
      if (movimentacao.novo_status !== bem?.status) {
        updateData.status = movimentacao.novo_status;
      }

      await updateDoc(docRef, updateData);

      // recarreagr dados
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setBem({
          id: docSnap.id,
          ...docSnap.data(),
        } as Bem);
      }

      setShowMovimentacao(false);
      setMovimentacao((prev) => ({
        ...prev,
        acao: '',
        detalhes: '',
      }));
    } catch (err: any) {
      console.error('erro ao registrar movimentação:', err);
      setError('erro ao registrar movimentação');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja deletar este bem? Esta ação não pode ser desfeita.')) {
      return;
    }

    setSaving(true);
    try {
      await deleteDoc(doc(db, 'bens', bemId));
      router.push('/bens');
    } catch (err) {
      console.error('erro ao deletar bem:', err);
      setError('erro ao deletar bem');
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">...</div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || !bem) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">{error || 'Bem não encontrado'}</p>
          <Link href="/bens">
            <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">
              Voltar para Inventário
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-2"
          >
            ← Voltar
          </button>
          <h1 className="text-2xl font-bold text-gray-800">{bem.nome_item}</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informações Básicas */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Informações Básicas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Categoria</p>
                  <p className="text-lg font-medium text-gray-800">{bem.categoria}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Marca</p>
                  <p className="text-lg font-medium text-gray-800">{bem.marca || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Código do Modelo</p>
                  <p className="text-lg font-medium text-gray-800">{bem.codigo_modelo || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Número de Série</p>
                  <p className="text-lg font-medium text-gray-800">{bem.numero_serie || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Quantidade</p>
                  <p className="text-lg font-medium text-gray-800">{bem.qtde}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      bem.status === 'Em uso'
                        ? 'bg-green-100 text-green-800'
                        : bem.status === 'Conserto'
                        ? 'bg-yellow-100 text-yellow-800'
                        : bem.status === 'Sucata'
                        ? 'bg-red-100 text-red-800'
                        : bem.status === 'Emprestado'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {bem.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Especificações Técnicas */}
            {(bem.ram || bem.armazenamento || bem.qtde_processadores || bem.modelo_processador) && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Especificações Técnicas</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bem.ram && (
                    <div>
                      <p className="text-sm text-gray-600">Memória RAM</p>
                      <p className="text-lg font-medium text-gray-800">{bem.ram}</p>
                    </div>
                  )}
                  {bem.armazenamento && (
                    <div>
                      <p className="text-sm text-gray-600">Armazenamento</p>
                      <p className="text-lg font-medium text-gray-800">{bem.armazenamento}</p>
                    </div>
                  )}
                  {bem.qtde_processadores !== undefined && bem.qtde_processadores > 0 && (
                    <div>
                      <p className="text-sm text-gray-600">Quantidade de Processadores</p>
                      <p className="text-lg font-medium text-gray-800">{bem.qtde_processadores}</p>
                    </div>
                  )}
                  {bem.modelo_processador && (
                    <div>
                      <p className="text-sm text-gray-600">Modelo do Processador</p>
                      <p className="text-lg font-medium text-gray-800">{bem.modelo_processador}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Histórico */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Histórico de Movimentações</h2>
                <button
                  onClick={() => setShowMovimentacao(!showMovimentacao)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
                >
                  {showMovimentacao ? 'Cancelar' : 'Registrar Movimentação'}
                </button>
              </div>

              {showMovimentacao && (
                <form onSubmit={handleRegistrarMovimentacao} className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ação *
                      </label>
                      <textarea
                        value={movimentacao.acao}
                        onChange={(e) =>
                          setMovimentacao((prev) => ({ ...prev, acao: e.target.value }))
                        }
                        placeholder="Ex: Enviado para conserto, Transferido para TI, Emprestado"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm"
                        rows={2}
                        disabled={saving}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Detalhes
                      </label>
                      <textarea
                        value={movimentacao.detalhes}
                        onChange={(e) =>
                          setMovimentacao((prev) => ({ ...prev, detalhes: e.target.value }))
                        }
                        placeholder="Informações adicionais..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm"
                        rows={2}
                        disabled={saving}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Novo Status
                        </label>
                        <select
                          value={movimentacao.novo_status}
                          onChange={(e) =>
                            setMovimentacao((prev) => ({
                              ...prev,
                              novo_status: e.target.value as typeof movimentacao.novo_status,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm"
                          disabled={saving}
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Novo Departamento
                        </label>
                        <input
                          type="text"
                          value={movimentacao.novo_departamento}
                          onChange={(e) =>
                            setMovimentacao((prev) => ({
                              ...prev,
                              novo_departamento: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm"
                          disabled={saving}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Novo Responsável
                        </label>
                        <input
                          type="text"
                          value={movimentacao.novo_responsavel}
                          onChange={(e) =>
                            setMovimentacao((prev) => ({
                              ...prev,
                              novo_responsavel: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm"
                          disabled={saving}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={saving || !movimentacao.acao.trim()}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {saving ? 'Salvando...' : 'Registrar Movimentação'}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {bem.historico && bem.historico.length > 0 ? (
                  bem.historico
                    .slice()
                    .reverse()
                    .map((h, idx) => (
                      <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                        <p className="font-medium text-gray-800">{h.acao}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(h.data).toLocaleString('pt-BR')} • por {h.usuario}
                        </p>
                        {h.detalhes && <p className="text-sm text-gray-700 mt-1">{h.detalhes}</p>}
                        {(h.novo_status || h.novo_departamento || h.novo_responsavel) && (
                          <div className="text-sm text-gray-600 mt-1 space-y-1">
                            {h.novo_status && (
                              <p>Status alterado para: <span className="font-medium">{h.novo_status}</span></p>
                            )}
                            {h.novo_departamento && (
                              <p>Departamento alterado para: <span className="font-medium">{h.novo_departamento}</span></p>
                            )}
                            {h.novo_responsavel && (
                              <p>Responsável alterado para: <span className="font-medium">{h.novo_responsavel}</span></p>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                ) : (
                  <p className="text-gray-600 text-sm">Sem movimentações registradas</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Localização e Responsabilidade */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Localização</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Departamento</p>
                  <p className="text-lg font-medium text-gray-800">{bem.departamento}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Localização</p>
                  <p className="text-lg font-medium text-gray-800">{bem.localizacao}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Responsável</p>
                  <p className="text-lg font-medium text-gray-800">{bem.responsavel}</p>
                </div>
              </div>
            </div>

            {/* Dados Financeiros */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Dados Financeiros</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Data de Aquisição</p>
                  <p className="text-lg font-medium text-gray-800">
                    {new Date(bem.data_aquisicao + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Valor</p>
                  <p className="text-lg font-medium text-gray-800">
                    R$ {bem.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Valor Total (Qtde × Valor)</p>
                  <p className="text-lg font-medium text-gray-800">
                    R$ {(bem.valor * bem.qtde).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            {/* Documentos */}
            {bem.nota_fiscal && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Documentos</h2>
                <a
                  href={bem.nota_fiscal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                >
                  <span>Nota Fiscal</span>
                </a>
              </div>
            )}

            {/* Ações */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Ações</h2>
              <div className="space-y-2">
                <button
                  onClick={() => setEditMode(true)}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:bg-gray-400"
                  disabled={saving}
                >
                  Editar Bem
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:bg-gray-400"
                  disabled={saving}
                >
                  Deletar Bem
                </button>
              </div>
            </div>

            {/* Metadados */}
            <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-600">
              <p>Criado em: {new Date(bem.criado_em).toLocaleString('pt-BR')}</p>
              <p>Atualizado em: {new Date(bem.atualizado_em).toLocaleString('pt-BR')}</p>
              <p>Criado por: {bem.criado_por}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
