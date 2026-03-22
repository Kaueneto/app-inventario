'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import Toast from '@/app/components/Toast';
import SearchableSelect from '@/app/components/SearchableSelect';
import { X, Edit, History, Loader2, Plus, Filter, RotateCcw, Box, DollarSign, Paperclip, FileText, ImageIcon, Upload, Trash2 } from 'lucide-react';
import { useGestaoData } from '@/lib/useGestaoData';
import Link from 'next/link';
import type { BemSupabase } from '@/lib/supabase';

interface BemDisplay extends BemSupabase {
  categoria_nome?: string;
  tipo_bem_nome?: string;
  marca_nome?: string;
  departamento_nome?: string;
  status_nome?: string;
}

interface AnexoBem {
  id: string;
  bem_id: string;
  nome_original: string;
  storage_path: string;
  mime_type?: string;
  tamanho_bytes: number;
  tipo_anexo: string;
  criado_em?: string;
}

interface AnexoBemView extends AnexoBem {
  previewUrl?: string;
  downloadUrl?: string;
}

const ATTACHMENTS_BUCKET = 'bens-anexos';
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export default function ConsultaBensPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { categorias, departamentos, status, marcas, tiposBem, loading: gestaoLoading } = useGestaoData();
  
  const [allBens, setAllBens] = useState<BemDisplay[]>([]);
  const [bens, setBens] = useState<BemDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(true);
  const [selectedBemHistory, setSelectedBemHistory] = useState<BemDisplay | null>(null);
  const [selectedBemEdit, setSelectedBemEdit] = useState<BemDisplay | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<BemDisplay>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [editAnexos, setEditAnexos] = useState<AnexoBemView[]>([]);
  const [newAnexos, setNewAnexos] = useState<File[]>([]);
  const [loadingAnexos, setLoadingAnexos] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    nome_item: '', marca_nome: '', categoria_nome: '', tipo_bem_nome: '', departamento_nome: '',
    responsavel: '', localizacao: '', status_nome: '', numero_serie: '',
  });

  const stats = useMemo(() => {
    const totalItems = bens.reduce((acc, b) => acc + (Number(b.qtde) || 0), 0);
    const totalValue = bens.reduce((acc, b) => acc + (Number(b.valor) || 0), 0);
    return { totalItems, totalValue };
  }, [bens]);
  // funcoes pra pegar os noems a partir dos IDs
  const getCategoryName = (value: string | undefined) => {
    if (!value) return '—';
    const category = categorias.find(c => c.id === value);
    return category?.nome || '—';
  };

  const getBrandName = (value: string | undefined) => {
    if (!value) return '—';
    const brand = marcas.find(m => m.id === value);
    return brand?.nome || '—';
  };

  const getTipoBemName = (value: string | undefined) => {
    if (!value) return '—';
    const tipo = tiposBem.find(t => t.id === value);
    return tipo?.nome || '—';
  };

  const getDepartmentName = (value: string | undefined) => {
    if (!value) return '—';
    const dept = departamentos.find(d => d.id === value);
    return dept?.nome || '—';
  };

  const getStatusName = (value: string | undefined) => {
    if (!value) return '—';
    const stat = status.find(s => s.id === value);
    return stat?.nome || '—';
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  const normalizeTextValue = (value: unknown) => {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text ? text : null;
  };

  const getStatusBadgeClass = (statusNome?: string) => {
    if (!statusNome) return 'bg-slate-100 text-slate-700 border-slate-200';
    const lower = statusNome.toLowerCase();
    if (lower.includes('ativo')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (lower.includes('manuten')) return 'bg-amber-100 text-amber-700 border-amber-200';
    if (lower.includes('inativo') || lower.includes('descart')) return 'bg-rose-100 text-rose-700 border-rose-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** idx).toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
  };

  const sanitizeFileName = (fileName: string) => {
    return fileName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_');
  };

  const loadAnexos = useCallback(async (bemId: string) => {
    setLoadingAnexos(true);
    setAttachmentError(null);
    try {
      const { data, error } = await supabase
        .from('anexos_bem')
        .select('*')
        .eq('bem_id', bemId)
        .order('criado_em', { ascending: false });

      if (error) throw error;

      const withUrls = await Promise.all((data || []).map(async (anexo: AnexoBem) => {
        const { data: signed } = await supabase.storage
          .from(ATTACHMENTS_BUCKET)
          .createSignedUrl(anexo.storage_path, 60 * 60);

        const signedUrl = signed?.signedUrl;
        const isImage = (anexo.mime_type || '').startsWith('image/');

        return {
          ...anexo,
          previewUrl: isImage ? signedUrl : undefined,
          downloadUrl: signedUrl,
        } as AnexoBemView;
      }));

      setEditAnexos(withUrls);
    } catch (err: any) {
      setAttachmentError(err.message || 'Erro ao carregar anexos');
      setEditAnexos([]);
    } finally {
      setLoadingAnexos(false);
    }
  }, []);

  const handlePendingAnexosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter((file) => file.size <= MAX_FILE_SIZE_BYTES);
    const tooLargeFiles = files.filter((file) => file.size > MAX_FILE_SIZE_BYTES);

    if (tooLargeFiles.length > 0) {
      setAttachmentError(`Arquivos acima de 10MB foram ignorados: ${tooLargeFiles.map((f) => f.name).join(', ')}`);
    }

    setNewAnexos((prev) => [...prev, ...validFiles]);
    e.target.value = '';
  };

  const removePendingAnexo = (index: number) => {
    setNewAnexos((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingAnexo = async (anexo: AnexoBemView) => {
    if (!confirm(`Remover anexo "${anexo.nome_original}"?`)) return;

    setAttachmentError(null);
    try {
      const { error: storageError } = await supabase.storage
        .from(ATTACHMENTS_BUCKET)
        .remove([anexo.storage_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('anexos_bem')
        .delete()
        .eq('id', anexo.id);

      if (dbError) throw dbError;

      setEditAnexos((prev) => prev.filter((item) => item.id !== anexo.id));
    } catch (err: any) {
      setAttachmentError(err.message || 'Erro ao remover anexo');
    }
  };

  const uploadPendingAnexos = async (bemId: string) => {
    if (newAnexos.length === 0) return;

    const rows: any[] = [];
    for (const file of newAnexos) {
      const safeName = sanitizeFileName(file.name);
      const filePath = `${bemId}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(ATTACHMENTS_BUCKET)
        .upload(filePath, file, {
          upsert: false,
          contentType: file.type || undefined,
        });

      if (uploadError) {
        throw new Error(`Falha no upload (${file.name}): ${uploadError.message}`);
      }

      rows.push({
        bem_id: bemId,
        nome_original: file.name,
        storage_path: filePath,
        mime_type: file.type || null,
        tamanho_bytes: file.size,
        tipo_anexo: file.type.startsWith('image/') ? 'foto' : 'documento',
        enviado_por: user?.email || null,
      });
    }

    const { error: insertError } = await supabase.from('anexos_bem').insert(rows);
    if (insertError) throw insertError;
  };

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth');
  }, [user, authLoading, router]);

  const fetchBens = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // supabase pode limitar retornos por chamada; paginamos para garantir lista completa.
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;
      const allRows: any[] = [];

      while (hasMore) {
        const { data, error } = await supabase
          .from('bens')
          .select('*')
          .order('criado_em', { ascending: false })
          .range(from, from + pageSize - 1);

        if (error) throw error;

        const chunk = data || [];
        allRows.push(...chunk);
        hasMore = chunk.length === pageSize;
        from += pageSize;
      }

      const bemsComNomes = allRows.map((bem) => ({
        ...bem,
        categoria_nome: getCategoryName(bem.categoria_id),
        tipo_bem_nome: getTipoBemName(bem.tipo_bem_id),
        marca_nome: getBrandName(bem.marca_id),
        departamento_nome: getDepartmentName(bem.departamento_id),
        status_nome: getStatusName(bem.status_id),
      })) as BemDisplay[];

      setAllBens(bemsComNomes);
      setBens(bemsComNomes);
    } catch (error) {
      console.error('Erro ao buscar bens:', error);
    } finally {
      setLoading(false);
    }
  }, [
    user,
    categorias,
    tiposBem,
    marcas,
    departamentos,
    status,
  ]);

  // buscar bens do Supabase
  useEffect(() => {
    if (!user) return;

    fetchBens();

    const channel = supabase
      .channel('bens-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bens' },
        () => {
          fetchBens();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchBens]);

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
    setFilters({ nome_item: '', marca_nome: '', categoria_nome: '', tipo_bem_nome: '', departamento_nome: '', responsavel: '', localizacao: '', status_nome: '', numero_serie: '' });
    setBens(allBens);
  };

  const handleOpenHistory = (bem: BemDisplay) => {
    setSelectedBemHistory(bem);
  };

  const handleCloseHistory = () => {
    setSelectedBemHistory(null);
  };

  const handleOpenEdit = (bem: BemDisplay) => {
    setSelectedBemEdit(bem);
    setEditFormData({ ...bem });
    setNewAnexos([]);
    setAttachmentError(null);
    loadAnexos(bem.id);
  };

  const handleCloseEdit = () => {
    setSelectedBemEdit(null);
    setEditFormData({});
    setEditAnexos([]);
    setNewAnexos([]);
    setAttachmentError(null);
  };

  const handleSaveEdit = async () => {
    if (!selectedBemEdit) return;
    
    try {
      setIsSaving(true);
      const nomeItem = String(editFormData.nome_item || '').trim();
      const categoriaId = String(editFormData.categoria_id || '').trim();
      const departamentoId = String(editFormData.departamento_id || '').trim();
      const statusId = String(editFormData.status_id || '').trim();
      const quantidade = Number(editFormData.qtde ?? 0);

      if (!nomeItem || !categoriaId || !departamentoId || !statusId || quantidade <= 0) {
        throw new Error('Preencha os campos obrigatorios e defina quantidade maior que zero');
      }

      const updateData = {
        nome_item: nomeItem,
        categoria_id: categoriaId,
        tipo_bem_id: normalizeTextValue(editFormData.tipo_bem_id),
        marca_id: normalizeTextValue(editFormData.marca_id),
        codigo_modelo: normalizeTextValue(editFormData.codigo_modelo),
        numero_serie: normalizeTextValue(editFormData.numero_serie),
        qtde: quantidade,
        departamento_id: departamentoId,
        localizacao: normalizeTextValue(editFormData.localizacao),
        responsavel: normalizeTextValue(editFormData.responsavel),
        data_aquisicao: normalizeTextValue(editFormData.data_aquisicao),
        data_expiracao_garantia: normalizeTextValue(editFormData.data_expiracao_garantia),
        valor: Number(editFormData.valor ?? 0),
        status_id: statusId,
        modelo_processador: normalizeTextValue(editFormData.modelo_processador),
        ram: normalizeTextValue(editFormData.ram),
        armazenamento: normalizeTextValue(editFormData.armazenamento),
        atualizado_em: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('bens')
        .update(updateData)
        .eq('id', selectedBemEdit.id);

      if (error) throw error;

      await uploadPendingAnexos(selectedBemEdit.id);
      await loadAnexos(selectedBemEdit.id);
      setNewAnexos([]);
      
      await fetchBens();
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <div>
                <SearchableSelect
                  label="Marca"
                  options={marcas}
                  value={marcas.find(m => m.nome === filters.marca_nome)?.id || ''}
                  onChange={(id) => {
                    const marca = marcas.find(m => m.id === id);
                    setFilters({...filters, marca_nome: marca?.nome || ''});
                  }}
                  placeholder="Todas"
                />
              </div>
              <div>
                <SearchableSelect
                  label="Categoria"
                  options={categorias}
                  value={categorias.find(c => c.nome === filters.categoria_nome)?.id || ''}
                  onChange={(id) => {
                    const categoria = categorias.find(c => c.id === id);
                    setFilters({...filters, categoria_nome: categoria?.nome || ''});
                  }}
                  placeholder="Todas"
                />
              </div>
              <div>
                <SearchableSelect
                  label="Tipo de bem"
                  options={tiposBem}
                  value={tiposBem.find(t => t.nome === filters.tipo_bem_nome)?.id || ''}
                  onChange={(id) => {
                    const tipo = tiposBem.find(t => t.id === id);
                    setFilters({...filters, tipo_bem_nome: tipo?.nome || ''});
                  }}
                  placeholder="Todos"
                />
              </div>
              <div>
                <SearchableSelect
                  label="Departamento"
                  options={departamentos}
                  value={departamentos.find(d => d.nome === filters.departamento_nome)?.id || ''}
                  onChange={(id) => {
                    const departamento = departamentos.find(d => d.id === id);
                    setFilters({...filters, departamento_nome: departamento?.nome || ''});
                  }}
                  placeholder="Todos"
                />
              </div>
              <div>
                <SearchableSelect
                  label="Status"
                  options={status}
                  value={status.find(s => s.nome === filters.status_nome)?.id || ''}
                  onChange={(id) => {
                    const st = status.find(s => s.id === id);
                    setFilters({...filters, status_nome: st?.nome || ''});
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

        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_40px_rgba(15,23,42,0.06)] overflow-hidden flex flex-col max-h-[75vh]">
          <div className="overflow-x-auto overflow-y-auto">
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur">
                <tr>
                  <th className={`${thStyle} sticky left-0 z-40 border-r bg-slate-50/95`}>Ações</th>
                  <th className={thStyle}>Nome</th>
                  <th className={thStyle}>Categoria</th>
                  <th className={thStyle}>Tipo de bem</th>
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
                  <th className={thStyle}>Data de Expiração da Garantia</th>
                  <th className={thStyle}>Valor (R$)</th>
                  <th className={thStyle}>Status</th>
                  <th className={thStyle}>Cadastrado por</th>
                  <th className={thStyle}>Dt. Cadastro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {bens.map((bem) => (
                  <tr key={bem.id} className="group even:bg-slate-50/40 hover:bg-amber-50/40 transition-colors">
                    <td className="px-3 py-2 sticky left-0 bg-inherit z-10 border-r border-slate-100">
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
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{bem.categoria_nome || '—'}</td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{bem.tipo_bem_nome || '—'}</td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{bem.marca_nome || '—'}</td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{bem.codigo_modelo || '—'}</td>
                    <td className="px-3 py-2 text-slate-500 font-mono text-[10px] uppercase">{bem.numero_serie || '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{bem.modelo_processador || '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{bem.ram || '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{bem.armazenamento || '—'}</td>
                      <td className="px-3 py-2 text-center font-bold text-slate-900">{bem.qtde}</td>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{bem.departamento_nome || '—'}</td>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{bem.localizacao || '—'}</td>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{bem.responsavel || '—'}</td>
                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{formatDate(bem.data_aquisicao)}</td>
                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{formatDate(bem.data_expiracao_garantia)}</td>
                      <td className="px-3 py-2 text-right font-bold text-black whitespace-nowrap">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bem.valor || 0)}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 border rounded text-[10px] font-bold whitespace-nowrap ${getStatusBadgeClass(bem.status_nome)}`}>
                          {bem.status_nome || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-500 text-[10px]">{bem.criado_por || '—'}</td>
                      <td className="px-3 py-2 text-slate-500 text-[10px]">{formatDate(bem.criado_em)}</td>
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
                          <span className="text-xs text-slate-500">{new Date(item.data).toLocaleString('pt-BR')}</span>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">Por: {item.usuario}</p>
                        {item.detalhes && <p className="text-sm text-slate-600">Detalhes: {item.detalhes}</p>}
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
        <div className="fixed inset-0 bg-slate-950/55 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-[0_25px_60px_rgba(15,23,42,0.35)] max-w-6xl w-full max-h-[92vh] overflow-hidden border border-slate-200">
            <div className="sticky top-0 z-30 flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Editar Bem</h2>
                <p className="text-sm text-slate-500 mt-1">Atualize dados gerais e gerencie os anexos vinculados</p>
              </div>
              <button onClick={handleCloseEdit} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <X className="w-5 h-5 text-slate-700" />
              </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] h-[calc(92vh-88px)] min-h-0 overflow-hidden">
              <div className="overflow-y-auto min-h-0 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Nome do Item *</label>
                  <input
                    type="text"
                    value={editFormData.nome_item || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, nome_item: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Categoria *</label>
                  <select
                    value={editFormData.categoria_id || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, categoria_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none"
                  >
                    <option value="">Selecione...</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Marca</label>
                  <select
                    value={editFormData.marca_id || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, marca_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none"
                  >
                    <option value="">Selecione...</option>
                    {marcas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Tipo de Bem</label>
                  <select
                    value={editFormData.tipo_bem_id || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, tipo_bem_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none"
                  >
                    <option value="">Selecione...</option>
                    {tiposBem.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Código do Modelo</label>
                  <input
                    type="text"
                    value={editFormData.codigo_modelo || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, codigo_modelo: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Número de Série</label>
                  <input
                    type="text"
                    value={editFormData.numero_serie || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, numero_serie: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Quantidade *</label>
                  <input
                    type="number"
                    value={editFormData.qtde || 0}
                    onChange={(e) => setEditFormData({ ...editFormData, qtde: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Departamento *</label>
                  <select
                    value={editFormData.departamento_id || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, departamento_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none"
                  >
                    <option value="">Selecione...</option>
                    {departamentos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Localização</label>
                  <input
                    type="text"
                    value={editFormData.localizacao || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, localizacao: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Responsável</label>
                  <input
                    type="text"
                    value={editFormData.responsavel || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, responsavel: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Data de Aquisição</label>
                  <input
                    type="date"
                    value={editFormData.data_aquisicao || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, data_aquisicao: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Data de Expiração da Garantia</label>
                  <input
                    type="date"
                    value={editFormData.data_expiracao_garantia || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, data_expiracao_garantia: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.valor || 0}
                    onChange={(e) => setEditFormData({ ...editFormData, valor: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Status *</label>
                  <select
                    value={editFormData.status_id || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, status_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none"
                  >
                    <option value="">Selecione...</option>
                    {status.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Processador</label>
                  <input
                    type="text"
                    value={editFormData.modelo_processador || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, modelo_processador: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">RAM</label>
                  <input
                    type="text"
                    value={editFormData.ram || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, ram: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Armazenamento</label>
                  <input
                    type="text"
                    value={editFormData.armazenamento || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, armazenamento: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none"
                  />
                </div>
              </div>

                {attachmentError && (
                  <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {attachmentError}
                  </div>
                )}

                <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
                  <button
                    onClick={handleCloseEdit}
                    className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition disabled:bg-slate-400 flex items-center gap-2"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {isSaving ? 'Salvando...' : 'Salvar alterações'}
                  </button>
                </div>
              </div>

              <aside className="border-l border-slate-200 bg-slate-50/70 p-5 overflow-y-auto min-h-0">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Paperclip className="w-4 h-4 text-slate-600" />
                    <h3 className="text-sm font-semibold text-slate-900">Anexos vinculados</h3>
                  </div>

                  {loadingAnexos ? (
                    <div className="py-8 flex justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                    </div>
                  ) : editAnexos.length === 0 ? (
                    <p className="text-xs text-slate-500">Nenhum anexo existente.</p>
                  ) : (
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {editAnexos.map((anexo) => {
                        const isImage = (anexo.mime_type || '').startsWith('image/');
                        return (
                          <div key={anexo.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                            <div className="flex items-start gap-2">
                              <div className="w-14 h-14 rounded-md border border-slate-200 bg-white overflow-hidden flex items-center justify-center shrink-0">
                                {isImage && anexo.previewUrl ? (
                                  <img src={anexo.previewUrl} alt={anexo.nome_original} className="w-full h-full object-cover" />
                                ) : (
                                  <FileText className="w-5 h-5 text-slate-400" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-slate-800 truncate">{anexo.nome_original}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">{formatBytes(anexo.tamanho_bytes)}</p>
                                {anexo.downloadUrl && (
                                  <a
                                    href={anexo.downloadUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] font-medium text-blue-600 hover:underline"
                                  >
                                    Abrir
                                  </a>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeExistingAnexo(anexo)}
                                className="p-1 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition"
                                title="Remover anexo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 mt-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Upload className="w-4 h-4 text-slate-600" />
                    <h3 className="text-sm font-semibold text-slate-900">Adicionar novos anexos</h3>
                  </div>

                  <label className="block w-full cursor-pointer rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center hover:border-slate-400 transition">
                    <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                      <ImageIcon className="w-4 h-4" /> Selecionar arquivos
                    </span>
                    <input type="file" multiple className="hidden" onChange={handlePendingAnexosChange} />
                  </label>

                  <p className="text-[11px] text-slate-500 mt-2">PNG, JPG, PDF, DOC, DOCX. Max 10MB por arquivo.</p>

                  {newAnexos.length > 0 && (
                    <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                      {newAnexos.map((file, index) => {
                        const isImage = file.type.startsWith('image/');
                        return (
                          <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {isImage ? <ImageIcon className="w-4 h-4 text-slate-500" /> : <FileText className="w-4 h-4 text-slate-500" />}
                              <div className="min-w-0">
                                <p className="text-xs text-slate-800 truncate">{file.name}</p>
                                <p className="text-[11px] text-slate-500">{formatBytes(file.size)}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removePendingAnexo(index)}
                              className="p-1 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}