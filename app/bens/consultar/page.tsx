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
  status_cor?: string;
  criado_por_nome?: string;
  _checked?: boolean;
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
  const [selectedBemEdit, setSelectedBemEdit] = useState<BemDisplay | BemDisplay[] | null>(null);
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

  // estados para sorting e lazy loading
  const [sortBy, setSortBy] = useState<string>('criado_em');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [hasSearched, setHasSearched] = useState(false);

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
      // corrige bug de timezone: força parse local para datas vindas do banco no formato YYYY-MM-DD
      const date = new Date(dateString.length === 10 ? dateString + 'T00:00:00' : dateString);
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

      // buscar nomes dos usuários em lote
      const criadoresIds = Array.from(new Set(allRows.map((b) => b.criado_por).filter(Boolean)));
      let usuariosMap: Record<string, string> = {};
      if (criadoresIds.length > 0) {
        const { data: usuariosData } = await supabase
          .from('usuarios')
          .select('id, nome, email');
        if (usuariosData) {
          usuariosMap = {};
          for (const u of usuariosData) {
            usuariosMap[u.id] = u.nome;
            usuariosMap[u.email] = u.nome;
          }
        }
      }

      const bemsComNomes = allRows.map((bem) => {
        const statusObj = status.find(s => s.id === bem.status_id);
        return {
          ...bem,
          categoria_nome: getCategoryName(bem.categoria_id),
          tipo_bem_nome: getTipoBemName(bem.tipo_bem_id),
          marca_nome: getBrandName(bem.marca_id),
          departamento_nome: getDepartmentName(bem.departamento_id),
          status_nome: statusObj?.nome || getStatusName(bem.status_id),
          status_cor: statusObj?.cor,
          criado_por_nome: usuariosMap[bem.criado_por] || bem.criado_por || '—',
        };
      }) as BemDisplay[];

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

    // aplicar ordenação
    filtered = filtered.sort((a, b) => {
      let aVal = (a as any)[sortBy];
      let bVal = (b as any)[sortBy];

      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as any).toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    setBens(filtered);
    setHasSearched(true);
  };

  const clearFilters = () => {
    setFilters({ nome_item: '', marca_nome: '', categoria_nome: '', tipo_bem_nome: '', departamento_nome: '', responsavel: '', localizacao: '', status_nome: '', numero_serie: '' });
    setBens([]);
    setHasSearched(false);
  };

  const handleColumnSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    handleSearch();
  };

  const handleOpenHistory = (bem: BemDisplay) => {
    setSelectedBemHistory(bem);
  };

  const handleCloseHistory = () => {
    setSelectedBemHistory(null);
  };

  const handleOpenEdit = (bensParaEditar: BemDisplay | BemDisplay[]) => {
    if (Array.isArray(bensParaEditar)) {
      // edição múltipla: não preencher campos
      setSelectedBemEdit(bensParaEditar);
      setEditFormData({});
      setNewAnexos([]);
      setAttachmentError(null);
    } else {
      // edição única: preencher normalmente
      setSelectedBemEdit(bensParaEditar);
      setEditFormData({ ...bensParaEditar });
      setNewAnexos([]);
      setAttachmentError(null);
      loadAnexos(bensParaEditar.id);
    }
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
      // se for edição múltipla
      if (Array.isArray(selectedBemEdit)) {
        // so envia campos preenchidos
        const updateData: any = {};
        if (editFormData.nome_item) updateData.nome_item = String(editFormData.nome_item).trim();
        if (editFormData.categoria_id) updateData.categoria_id = String(editFormData.categoria_id).trim();
        if (editFormData.tipo_bem_id) updateData.tipo_bem_id = normalizeTextValue(editFormData.tipo_bem_id);
        if (editFormData.marca_id) updateData.marca_id = normalizeTextValue(editFormData.marca_id);
        if (editFormData.codigo_modelo) updateData.codigo_modelo = normalizeTextValue(editFormData.codigo_modelo);
        if (editFormData.numero_serie) updateData.numero_serie = normalizeTextValue(editFormData.numero_serie);
        if (editFormData.qtde !== undefined) updateData.qtde = Number(editFormData.qtde);
        if (editFormData.departamento_id) updateData.departamento_id = String(editFormData.departamento_id).trim();
        if (editFormData.localizacao) updateData.localizacao = normalizeTextValue(editFormData.localizacao);
        if (editFormData.responsavel) updateData.responsavel = normalizeTextValue(editFormData.responsavel);
        if (editFormData.data_aquisicao) updateData.data_aquisicao = normalizeTextValue(editFormData.data_aquisicao);
        if (editFormData.data_expiracao_garantia) updateData.data_expiracao_garantia = normalizeTextValue(editFormData.data_expiracao_garantia);
        if (editFormData.valor !== undefined) updateData.valor = Number(editFormData.valor);
        if (editFormData.status_id) updateData.status_id = String(editFormData.status_id).trim();
        if (editFormData.modelo_processador) updateData.modelo_processador = normalizeTextValue(editFormData.modelo_processador);
        if (editFormData.ram) updateData.ram = normalizeTextValue(editFormData.ram);
        if (editFormData.armazenamento) updateData.armazenamento = normalizeTextValue(editFormData.armazenamento);
        updateData.atualizado_em = new Date().toISOString();

        if (Object.keys(updateData).length === 1) throw new Error('Preencha ao menos um campo para atualizar.');

        const ids = selectedBemEdit.map(b => b.id);
        const { error } = await supabase
          .from('bens')
          .update(updateData)
          .in('id', ids);
        if (error) throw error;
        await fetchBens();
        setShowToast(true);
        handleCloseEdit();
        setTimeout(() => setShowToast(false), 3000);
      } else {
        // edição única (mantém validação obrigatória)
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
      }
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


  
return (
  <div className="min-h-screen bg-white text-black">
    {showToast && <Toast message="Ação realizada" type="success" onClose={() => setShowToast(false)} />}

    <nav className="border-b border-slate-200 px-6 h-14 flex items-center justify-between sticky top-0 bg-white z-40">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold tracking-tight">Consulta de bens</h1>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={() => setIsFilterVisible(!isFilterVisible)} className="text-sm flex items-center gap-2 hover:text-slate-600">
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
          {/* Inputs de digitação */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-base text-slate-700 mb-1">Nome do item</label>
              <input className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-base text-black placeholder:text-slate-400 focus:border-amber-400 outline-none transition-all" placeholder="Ex: Servidor..." value={filters.nome_item} onChange={(e) => setFilters({...filters, nome_item: e.target.value})} />
            </div>
            <div>
              <label className="block text-base text-slate-700 mb-1">Responsável</label>
              <input className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-base text-black placeholder:text-slate-400 focus:border-amber-400 outline-none transition-all" placeholder="Ex: João..." value={filters.responsavel} onChange={(e) => setFilters({...filters, responsavel: e.target.value})} />
            </div>
            <div>
              <label className="block text-base text-slate-700 mb-1">Localização</label>
              <input className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-base text-black placeholder:text-slate-400 focus:border-amber-400 outline-none transition-all" placeholder="Ex: Sala 202..." value={filters.localizacao} onChange={(e) => setFilters({...filters, localizacao: e.target.value})} />
            </div>
            <div>
              <label className="block text-base text-slate-700 mb-1">Número de série</label>
              <input className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-base text-black placeholder:text-slate-400 focus:border-amber-400 outline-none transition-all" placeholder="SN..." value={filters.numero_serie} onChange={(e) => setFilters({...filters, numero_serie: e.target.value})} />
            </div>
          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <SearchableSelect label="Marca" options={marcas} value={marcas.find(m => m.nome === filters.marca_nome)?.id || ''} onChange={(id) => {
              const marca = marcas.find(m => m.id === id);
              setFilters({...filters, marca_nome: marca?.nome || ''});
            }} placeholder="Todas" />
            <SearchableSelect label="Categoria" options={categorias} value={categorias.find(c => c.nome === filters.categoria_nome)?.id || ''} onChange={(id) => {
              const categoria = categorias.find(c => c.id === id);
              setFilters({...filters, categoria_nome: categoria?.nome || ''});
            }} placeholder="Todas" />
            <SearchableSelect label="Tipo de bem" options={tiposBem} value={tiposBem.find(t => t.nome === filters.tipo_bem_nome)?.id || ''} onChange={(id) => {
              const tipo = tiposBem.find(t => t.id === id);
              setFilters({...filters, tipo_bem_nome: tipo?.nome || ''});
            }} placeholder="Todos" />
            <SearchableSelect label="Departamento" options={departamentos} value={departamentos.find(d => d.nome === filters.departamento_nome)?.id || ''} onChange={(id) => {
              const departamento = departamentos.find(d => d.id === id);
              setFilters({...filters, departamento_nome: departamento?.nome || ''});
            }} placeholder="Todos" />
            <SearchableSelect label="Status" options={status} value={status.find(s => s.nome === filters.status_nome)?.id || ''} onChange={(id) => {
              const st = status.find(s => s.id === id);
              setFilters({...filters, status_nome: st?.nome || ''});
            }} placeholder="Todos" />
          </div>

          {/* Botões */}
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

    
      <div className="mb-4 flex items-center justify-between bg-black text-white px-6 py-4 rounded-xl">
        <div className="flex items-center gap-8">
          <div>
            <p className="text-[10px] text-slate-400 uppercase">Total de itens</p>
            <p className="text-xl font-bold">{stats.totalItems}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase">Valor total</p>
            <p className="text-xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalValue)}
            </p>
          </div>
        </div>
        <span className="text-xs text-slate-400">Exibindo {bens.length} ativos</span>
      </div>

 
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_40px_rgba(15,23,42,0.06)] overflow-hidden flex flex-col max-h-[75vh]">

        <div className="flex gap-2 p-4 border-b border-slate-100 bg-slate-50">
          <button
           className="px-4 py-2 border border-amber-500 text-amber-500 rounded-lg font-medium hover:bg-amber-500 hover:text-white transition-colors duration-200 active:scale-95 active: disabled:opacity-50"
            disabled={bens.filter(b => b._checked).length === 0}
            onClick={() => {
              const selecionados = bens.filter(b => b._checked);
              if (selecionados.length === 1) {
                handleOpenEdit(selecionados[0]);
              } else if (selecionados.length > 1) {
                handleOpenEdit(selecionados);
              }
            }}
          >
            Editar selecionado
          </button>
          <button
            className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded font-semibold disabled:opacity-50"
            disabled={bens.filter(b => b._checked).length === 0}
            onClick={async () => {
              const ids = bens.filter(b => b._checked).map(b => b.id);
              if (ids.length === 0) return;
              if (!window.confirm(`Excluir ${ids.length} registro(s)?`)) return;
              await supabase.from('bens').delete().in('id', ids);
              setBens(bens.filter(b => !ids.includes(b.id)));
              setAllBens(allBens.filter(b => !ids.includes(b.id)));
            }}
          >
            Excluir selecionados
          </button>
        </div>
        <div className="overflow-x-auto overflow-y-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur">
              <tr>
                <th className="px-3 py-2 text-left text-sm font-normal text-slate-500 border-slate-200 whitespace-nowrap bg-slate-50 sticky left-0 z-50 border-r shadow-xl">
                  <input
                    type="checkbox"
                    className="checkbox-custom"
                    checked={bens.length > 0 && bens.every(b => b._checked)}
                    ref={el => {
                      if (el) {
                        el.indeterminate = bens.some(b => b._checked) && !bens.every(b => b._checked);
                      }
                    }}
                    onChange={e => {
                      const checked = e.target.checked;
                      setBens(bens.map(bem => ({ ...bem, _checked: checked })));
                    }}
                  />
                </th>
                <th className="px-3 py-2 text-left text-sm font-normal text-slate-500 border-slate-200 whitespace-nowrap bg-slate-50 cursor-pointer select-none" onClick={() => handleColumnSort('nome_item')}>
                  Nome {sortBy === 'nome_item' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-3 py-2 text-left text-sm font-normal text-slate-500 border-slate-200 whitespace-nowrap bg-slate-50 cursor-pointer select-none" onClick={() => handleColumnSort('categoria_nome')}>
                  Categoria {sortBy === 'categoria_nome' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-3 py-2 text-left text-sm font-normal text-slate-500 border-slate-200 whitespace-nowrap bg-slate-50 cursor-pointer select-none" onClick={() => handleColumnSort('tipo_bem_nome')}>
                  Tipo de bem {sortBy === 'tipo_bem_nome' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-3 py-2 text-left text-sm font-normal text-slate-500 border-slate-200 whitespace-nowrap bg-slate-50">Modelo</th>
                <th className="px-3 py-2 text-left text-sm font-normal text-slate-500 border-slate-200 whitespace-nowrap bg-slate-50 cursor-pointer select-none" onClick={() => handleColumnSort('numero_serie')}>
                  Série (SN) {sortBy === 'numero_serie' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-3 py-2 text-left text-sm font-normal text-slate-500 border-slate-200 whitespace-nowrap bg-slate-50">Processador</th>
                <th className="px-3 py-2 text-left text-sm font-normal text-slate-500 border-slate-200 whitespace-nowrap bg-slate-50">RAM</th>
                <th className="px-3 py-2 text-left text-sm font-normal text-slate-500 border-slate-200 whitespace-nowrap bg-slate-50">Armazenamento</th>
                <th className="px-3 py-2 text-left text-sm font-normal text-slate-500 border-slate-200 whitespace-nowrap bg-slate-50 cursor-pointer select-none" onClick={() => handleColumnSort('qtde')}>
                  Qtde {sortBy === 'qtde' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-3 py-2 text-left text-sm font-normal text-slate-500 border-slate-200 whitespace-nowrap bg-slate-50 cursor-pointer select-none" onClick={() => handleColumnSort('departamento_nome')}>
                  Departamento {sortBy === 'departamento_nome' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-3 py-2 text-left text-sm font-normal text-slate-500 border-slate-200 whitespace-nowrap bg-slate-50">Localização</th>
                <th className="px-3 py-2 text-left text-sm font-normal text-slate-500 border-slate-200 whitespace-nowrap bg-slate-50">Responsável</th>
                <th className="px-3 py-2 text-left text-sm font-normal text-slate-500 border-slate-200 whitespace-nowrap bg-slate-50 cursor-pointer select-none" onClick={() => handleColumnSort('data_aquisicao')}>
                  Data aquisição {sortBy === 'data_aquisicao' && (sortOrder === 'asc' ? '^' : '˅')}
                </th>
                <th className="px-3 py-2 text-left text-sm font-normal text-slate-500 border-slate-200 whitespace-nowrap bg-slate-50 cursor-pointer select-none" onClick={() => handleColumnSort('data_expiracao_garantia')}>
                  Data Exp. Garantia {sortBy === 'data_expiracao_garantia' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-3 py-2 text-left text-sm font-normal text-slate-500 border-slate-200 whitespace-nowrap bg-slate-50 cursor-pointer select-none" onClick={() => handleColumnSort('valor')}>
                  Valor (R$) {sortBy === 'valor' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-3 py-2 text-left text-sm font-normal text-slate-500 border-slate-200 whitespace-nowrap bg-slate-50 cursor-pointer select-none" onClick={() => handleColumnSort('status_nome')}>
                  Status {sortBy === 'status_nome' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-3 py-2 text-left text-sm font-normal text-slate-500 border-slate-200 whitespace-nowrap bg-slate-50 cursor-pointer select-none" onClick={() => handleColumnSort('criado_por_nome')}>
                  Cadastrado por {sortBy === 'criado_por_nome' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-3 py-2 text-left text-sm font-normal text-slate-500 border-slate-200 whitespace-nowrap bg-slate-50 cursor-pointer select-none" onClick={() => handleColumnSort('criado_em')}>
                  Dt. Cadastro {sortBy === 'criado_em' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-3 py-2 text-left text-sm font-normal text-slate-500 border-slate-200 whitespace-nowrap bg-slate-50">Histórico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {bens.map((bem: BemDisplay, idx) => (
                <tr key={bem.id} className="group even:bg-slate-50/40 hover:bg-amber-50/40 transition-colors">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      className="checkbox-custom "
                      checked={!!bem._checked}
                      onChange={e => {
                        const checked = e.target.checked;
                        setBens(bens.map((b, i) => i === idx ? { ...b, _checked: checked } : b));
                      }}
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="font-bold text-slate-900">{bem.nome_item}</div>
                    <div className="text-sm text-slate-500">{bem.marca_nome || '—'}</div>
                  </td>
                  <td className="px-3 py-2 text-sm text-slate-600 whitespace-nowrap">{bem.categoria_nome || '—'}</td>
                  <td className="px-3 py-2 text-sm text-slate-600 whitespace-nowrap">{bem.tipo_bem_nome || '—'}</td>
                  <td className="px-3 py-2 text-sm text-slate-600 whitespace-nowrap">{bem.codigo_modelo || '—'}</td>
                  <td className="px-3 py-2 text-sm text-slate-500 font-mono uppercase">{bem.numero_serie || '—'}</td>
                  <td className="px-3 py-2 text-sm text-slate-600">{bem.modelo_processador || '—'}</td>
                  <td className="px-3 py-2 text-sm text-slate-600">{bem.ram || '—'}</td>
                  <td className="px-3 py-2 text-sm text-slate-600">{bem.armazenamento || '—'}</td>
                  <td className="px-3 py-2 text-center font-bold text-slate-900">{bem.qtde}</td>
                  <td className="px-3 py-2 text-sm text-slate-600 whitespace-nowrap">{bem.departamento_nome || '—'}</td>
                  <td className="px-3 py-2 text-sm text-slate-600 whitespace-nowrap">{bem.localizacao || '—'}</td>
                  <td className="px-3 py-2 text-sm text-slate-600 whitespace-nowrap">{bem.responsavel || '—'}</td>
                  <td className="px-3 py-2 text-sm text-slate-500 whitespace-nowrap">{formatDate(bem.data_aquisicao)}</td>
                  <td className="px-3 py-2 text-sm text-slate-500 whitespace-nowrap">{formatDate(bem.data_expiracao_garantia)}</td>
                  <td className="px-3 py-2 text-right font-bold text-black whitespace-nowrap">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bem.valor || 0)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-0.5 border rounded text-sm whitespace-nowrap`}
                      style={bem.status_cor ? { backgroundColor: bem.status_cor, color: 'white', borderColor: bem.status_cor } : {}}
                    >
                      {bem.status_nome || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-500 text-sm">{bem.criado_por_nome || '—'}</td>
                  <td className="px-3 py-2 text-slate-500 text-sm">{formatDate(bem.criado_em)}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => handleOpenHistory(bem)} className="p-1 hover:bg-black hover:text-white rounded transition text-slate-400" title="Histórico">
                      <History className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* modal de historico */}
      </main>
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
    

      {/* Modal de Edição =======================================================================*/}
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

            <div className=" grid grid-cols-1 xl:grid-cols-[1fr_340px] h-[calc(92vh-88px)] min-h-0 overflow-hidden">
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
                  <label className="block text-base font-semibold text-slate-700 mb-2">Departamento *</label>
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