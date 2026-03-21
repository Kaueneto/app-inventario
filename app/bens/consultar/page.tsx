'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import Toast from '@/app/components/Toast';
import SearchableSelect from '@/app/components/SearchableSelect';
import { X, Edit, History, Loader2, Plus, Filter, RotateCcw, Box, DollarSign, ChevronDown } from 'lucide-react';
import { Bem } from '@/lib/types';
import { useGestaoData } from '@/lib/useGestaoData';
import Link from 'next/link';

export default function ConsultaBensPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { categorias, departamentos, status, marcas, loading: gestaoLoading } = useGestaoData();
  
  const [allBens, setAllBens] = useState<(Bem & { id: string })[]>([]);
  const [bens, setBens] = useState<(Bem & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(true);
  const [selectedBemHistory, setSelectedBemHistory] = useState<(Bem & { id: string }) | null>(null);
  const [selectedBemEdit, setSelectedBemEdit] = useState<(Bem & { id: string }) | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Bem>>({});
  const [isSaving, setIsSaving] = useState(false);

  const [filters, setFilters] = useState({
    nome_item: '', marca: '', categoria: '', departamento: '',
    responsavel: '', localizacao: '', status: '', numero_serie: '',
  });

  const stats = useMemo(() => {
    const totalItems = bens.reduce((acc, b) => acc + (Number(b.qtde) || 0), 0);
    const totalValue = bens.reduce((acc, b) => acc + (Number(b.valor) || 0), 0);
    return { totalItems, totalValue };
  }, [bens]);

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'bens'), (snapshot) => {
      const bensData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bem & { id: string }));
      setAllBens(bensData);
      setBens(bensData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSearch = () => {
    let filtered = allBens.filter(bem => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const bemValue = (bem as any)[key]?.toString().toLowerCase() || '';
        return bemValue.includes(value.toLowerCase());
      });
    });
    setBens(filtered);
  };

  const clearFilters = () => {
    setFilters({ nome_item: '', marca: '', categoria: '', departamento: '', responsavel: '', localizacao: '', status: '', numero_serie: '' });
    setBens(allBens);
  };

  const handleOpenHistory = (bem: Bem & { id: string }) => {
    setSelectedBemHistory(bem);
  };

  const handleCloseHistory = () => {
    setSelectedBemHistory(null);
  };

  const handleOpenEdit = (bem: Bem & { id: string }) => {
    setSelectedBemEdit(bem);
    setEditFormData({ ...bem });
  };

  const handleCloseEdit = () => {
    setSelectedBemEdit(null);
    setEditFormData({});
  };

  const handleSaveEdit = async () => {
    if (!selectedBemEdit) return;
    
    try {
      setIsSaving(true);
      const bemRef = doc(db, 'bens', selectedBemEdit.id);
      
      const updateData = {
        nome_item: editFormData.nome_item || selectedBemEdit.nome_item,
        categoria: editFormData.categoria || selectedBemEdit.categoria,
        marca: editFormData.marca || selectedBemEdit.marca,
        codigo_modelo: editFormData.codigo_modelo || selectedBemEdit.codigo_modelo,
        numero_serie: editFormData.numero_serie || selectedBemEdit.numero_serie,
        qtde: editFormData.qtde || selectedBemEdit.qtde,
        departamento: editFormData.departamento || selectedBemEdit.departamento,
        localizacao: editFormData.localizacao || selectedBemEdit.localizacao,
        responsavel: editFormData.responsavel || selectedBemEdit.responsavel,
        data_aquisicao: editFormData.data_aquisicao || selectedBemEdit.data_aquisicao,
        valor: editFormData.valor || selectedBemEdit.valor,
        status: editFormData.status || selectedBemEdit.status,
        modelo_processador: editFormData.modelo_processador || selectedBemEdit.modelo_processador,
        ram: editFormData.ram || selectedBemEdit.ram,
        armazenamento: editFormData.armazenamento || selectedBemEdit.armazenamento,
        atualizado_em: new Date().toISOString(),
      };

      await updateDoc(bemRef, updateData);
      
      setShowToast(true);
      handleCloseEdit();
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || loading || gestaoLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-black w-8 h-8" />
      </div>
    );
  }

  const labelStyle = "block text-xs font-semibold text-slate-700 mb-1";
  const inputStyle = "w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-black placeholder:text-slate-400 focus:border-amber-400 outline-none transition-all";
  const thStyle = "px-3 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-tight border-b border-slate-200 whitespace-nowrap bg-slate-50";

  return (
    <div className="min-h-screen bg-white text-black">
      {showToast && <Toast message="Ação realizada" type="success" onClose={() => setShowToast(false)} />}

      <nav className="border-b border-slate-200 px-6 h-14 flex items-center justify-between sticky top-0 bg-white z-40">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold tracking-tight">Consulta de bens</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsFilterVisible(!isFilterVisible)} className="text-sm  flex items-center gap-2 hover:text-slate-600">
            <Filter className="w-4 h-4" /> {isFilterVisible ? 'Ocultar filtros' : 'Mostrar filtros'}
          </button>
          <Link href="/bens/novo">
            <button className="bg-black text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 transition flex items-center gap-2">
              <Plus className="w-4 h-4" /> Novo bem
            </button>
          </Link>
        </div>
      </nav>

      <main className="p-6">
        {isFilterVisible && (
          <section className="bg-white border border-slate-200 rounded-xl p-6 mb-6 shadow-sm">
            {/* Primeira linha: inputs de digitação */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className={labelStyle}>Nome do item</label>
                <input className={inputStyle} placeholder="Ex: Servidor..." value={filters.nome_item} onChange={(e) => setFilters({...filters, nome_item: e.target.value})} />
              </div>
              <div>
                <label className={labelStyle}>Responsável</label>
                <input className={inputStyle} placeholder="Ex: João..." value={filters.responsavel} onChange={(e) => setFilters({...filters, responsavel: e.target.value})} />
              </div>
              <div>
                <label className={labelStyle}>Localização</label>
                <input className={inputStyle} placeholder="Ex: Sala 202..." value={filters.localizacao} onChange={(e) => setFilters({...filters, localizacao: e.target.value})} />
              </div>
              <div>
                <label className={labelStyle}>Número de série</label>
                <input className={inputStyle} placeholder="SN..." value={filters.numero_serie} onChange={(e) => setFilters({...filters, numero_serie: e.target.value})} />
              </div>
            </div>

            {/* Segunda linha: campos de seleção */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div>
                <SearchableSelect
                  label="Marca"
                  options={marcas}
                  value={marcas.find(m => m.nome === filters.marca)?.id || ''}
                  onChange={(id) => {
                    const marca = marcas.find(m => m.id === id);
                    setFilters({...filters, marca: marca?.nome || ''});
                  }}
                  placeholder="Todas"
                />
              </div>
              <div>
                <SearchableSelect
                  label="Categoria"
                  options={categorias}
                  value={categorias.find(c => c.nome === filters.categoria)?.id || ''}
                  onChange={(id) => {
                    const categoria = categorias.find(c => c.id === id);
                    setFilters({...filters, categoria: categoria?.nome || ''});
                  }}
                  placeholder="Todas"
                />
              </div>
              <div>
                <SearchableSelect
                  label="Departamento"
                  options={departamentos}
                  value={departamentos.find(d => d.nome === filters.departamento)?.id || ''}
                  onChange={(id) => {
                    const departamento = departamentos.find(d => d.id === id);
                    setFilters({...filters, departamento: departamento?.nome || ''});
                  }}
                  placeholder="Todos"
                />
              </div>
              <div>
                <SearchableSelect
                  label="Status"
                  options={status}
                  value={status.find(s => s.nome === filters.status)?.id || ''}
                  onChange={(id) => {
                    const st = status.find(s => s.id === id);
                    setFilters({...filters, status: st?.nome || ''});
                  }}
                  placeholder="Todos"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button onClick={clearFilters} className="text-xs font-bold text-slate-500 hover:text-black flex items-center gap-1">
                <RotateCcw className="w-3 h-3" /> Limpar campos
              </button>
              <button onClick={handleSearch} className="bg-black text-white px-6 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 transition">
                Pesquisar
              </button>
            </div>
          </section>
        )}

        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col max-h-[75vh]">
          <div className="overflow-x-auto overflow-y-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className={`${thStyle} sticky left-0 z-20 border-r`}>Ações</th>
                  <th className={thStyle}>Nome</th>
                  <th className={thStyle}>Categoria</th>
                  <th className={thStyle}>Marca</th>
                  <th className={thStyle}>Modelo</th>
                  <th className={thStyle}>Série (SN)</th>
                  <th className={thStyle}>Processador</th>
                  <th className={thStyle}>RAM</th>
                  <th className={thStyle}>Armazenamento</th>
                  <th className={thStyle}>Qtde</th>
                  <th className={thStyle}>Departamento</th>
                  <th className={thStyle}>Localização</th>
                  <th className={thStyle}>Responsável</th>
                  <th className={thStyle}>Data aquisição</th>
                  <th className={thStyle}>Valor (R$)</th>
                  <th className={thStyle}>Status</th>
                  <th className={thStyle}>Cadastrado por</th>
                  <th className={thStyle}>Dt. Cadastro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {bens.map((bem) => (
                  <tr key={bem.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-3 py-2 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-100">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleOpenEdit(bem)} className="p-1 hover:bg-black hover:text-white rounded transition text-slate-400">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleOpenHistory(bem)} className="p-1 hover:bg-black hover:text-white rounded transition text-slate-400">
                          <History className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 font-bold text-slate-900">{bem.nome_item}</td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{bem.categoria}</td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{bem.marca || '—'}</td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{bem.codigo_modelo || '—'}</td>
                    <td className="px-3 py-2 text-slate-500 font-mono text-[10px] uppercase">{bem.numero_serie || '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{bem.modelo_processador || '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{bem.ram || '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{bem.armazenamento || '—'}</td>
                    <td className="px-3 py-2 text-center font-bold text-slate-900">{bem.qtde}</td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{bem.departamento}</td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{bem.localizacao}</td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{bem.responsavel || '—'}</td>
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{bem.data_aquisicao}</td>
                    <td className="px-3 py-2 text-right font-bold text-black whitespace-nowrap">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bem.valor || 0)}
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 border bg-green-500 text-white rounded text-[10px] font-bold whitespace-nowrap">
                        {bem.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-500 text-[10px]">{bem.criado_por}</td>
                    <td className="px-3 py-2 text-slate-500 text-[10px]">{bem.criado_em?.substring(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="bg-black text-white px-6 py-4 flex flex-wrap items-center justify-between gap-6 mt-auto">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Box className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">Total de itens</p>
                  <p className="text-xl font-bold leading-none">{stats.totalItems}</p>
                </div>
              </div>

              <div className="w-px h-8 bg-white/20" />

              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <DollarSign className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">Valor total em bens</p>
                  <p className="text-xl font-bold leading-none">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalValue)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <span>Exibindo {bens.length} ativos</span>
            </div>
          </footer>
        </div>
      </main>

      {/* Modal de Histórico */}
      {selectedBemHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between p-6 border-b border-slate-200 bg-white">
              <h2 className="text-xl font-bold text-black">Histórico de Alterações</h2>
              <button onClick={handleCloseHistory} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <X className="w-5 h-5 text-black" />
              </button>
            </div>

            <div className="p-6">
              <h3 className="font-bold text-black mb-4">{selectedBemHistory.nome_item}</h3>
              
              {(!selectedBemHistory.historico || selectedBemHistory.historico.length === 0) ? (
                <p className="text-slate-500 text-center py-8">Nenhum histórico de alterações registrado</p>
              ) : (
                <div className="space-y-4">
                  {selectedBemHistory.historico.map((item, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-bold text-black">{item.acao}</span>
                        <span className="text-xs text-slate-500">{item.data}</span>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">Por: {item.usuario}</p>
                      {item.detalhes && <p className="text-sm text-slate-600">Detalhes: {item.detalhes}</p>}
                      {item.novo_departamento && <p className="text-xs text-slate-500">Departamento: {item.novo_departamento}</p>}
                      {item.novo_responsavel && <p className="text-xs text-slate-500">Responsável: {item.novo_responsavel}</p>}
                      {item.novo_status && <p className="text-xs text-slate-500">Status: {item.novo_status}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {selectedBemEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between p-6 border-b border-slate-200 bg-white">
              <h2 className="text-xl font-bold text-black">Editar Bem</h2>
              <button onClick={handleCloseEdit} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <X className="w-5 h-5 text-black" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-black mb-2">Nome do Item *</label>
                  <input
                    type="text"
                    value={editFormData.nome_item || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, nome_item: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-black focus:border-black outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-2">Categoria *</label>
                  <select
                    value={editFormData.categoria || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, categoria: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-black focus:border-black outline-none"
                  >
                    <option value="">Selecione...</option>
                    {categorias.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-2">Marca</label>
                  <select
                    value={editFormData.marca || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, marca: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-black focus:border-black outline-none"
                  >
                    <option value="">Selecione...</option>
                    {marcas.map(m => <option key={m.id} value={m.nome}>{m.nome}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-2">Código do Modelo</label>
                  <input
                    type="text"
                    value={editFormData.codigo_modelo || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, codigo_modelo: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-black focus:border-black outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-2">Número de Série</label>
                  <input
                    type="text"
                    value={editFormData.numero_serie || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, numero_serie: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-black focus:border-black outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-2">Quantidade *</label>
                  <input
                    type="number"
                    value={editFormData.qtde || 0}
                    onChange={(e) => setEditFormData({ ...editFormData, qtde: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-black focus:border-black outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-2">Departamento *</label>
                  <select
                    value={editFormData.departamento || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, departamento: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-black focus:border-black outline-none"
                  >
                    <option value="">Selecione...</option>
                    {departamentos.map(d => <option key={d.id} value={d.nome}>{d.nome}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-2">Localização</label>
                  <input
                    type="text"
                    value={editFormData.localizacao || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, localizacao: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-black focus:border-black outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-2">Responsável</label>
                  <input
                    type="text"
                    value={editFormData.responsavel || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, responsavel: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-black focus:border-black outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-2">Data de Aquisição</label>
                  <input
                    type="date"
                    value={editFormData.data_aquisicao || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, data_aquisicao: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-black focus:border-black outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-2">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.valor || 0}
                    onChange={(e) => setEditFormData({ ...editFormData, valor: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-black focus:border-black outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-2">Status *</label>
                  <select
                    value={editFormData.status || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-black focus:border-black outline-none"
                  >
                    <option value="">Selecione...</option>
                    {status.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-2">Processador</label>
                  <input
                    type="text"
                    value={editFormData.modelo_processador || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, modelo_processador: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-black focus:border-black outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-2">RAM</label>
                  <input
                    type="text"
                    value={editFormData.ram || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, ram: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-black focus:border-black outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-2">Armazenamento</label>
                  <input
                    type="text"
                    value={editFormData.armazenamento || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, armazenamento: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-black focus:border-black outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={handleCloseEdit}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-black transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="px-6 py-2 bg-black text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition disabled:bg-slate-400 flex items-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isSaving ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}