'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import Toast from '@/app/components/Toast';
import SearchableSelect from '@/app/components/SearchableSelect';
import { 
  Package, Cpu,
  MapPin, Loader2, Paperclip, FileText, FileImage, XCircle
} from 'lucide-react';
import { useGestaoData } from '@/lib/useGestaoData';

const ATTACHMENTS_BUCKET = 'bens-anexos';
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

type TipoAnexo = 'nota_fiscal' | 'foto' | 'documento' | 'outro';

export default function NovoBemPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { categorias, departamentos, marcas, status, tiposBem, loading: gestaoLoading } = useGestaoData();
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [tipoAnexoPadrao, setTipoAnexoPadrao] = useState<TipoAnexo>('documento');
  const [anexos, setAnexos] = useState<File[]>([]);

  const [formData, setFormData] = useState({
    nome_item: '',
    categoria_id: '',
    tipo_bem_id: '',
    marca_id: '',
    ram: '',
    armazenamento: '',
    codigo_modelo: '',
    numero_serie: '',
    qtde: 1,
    departamento_id: '',
    localizacao: '',
    responsavel: '',
    data_aquisicao: new Date().toISOString().split('T')[0],
    data_expiracao_garantia: '',
    valor: 0,
    qtde_processadores: 0,
    modelo_processador: '',
    status_id: '',
  });

  // iniciar com primeiro item de cada categoria se não estiverem carregando
  useEffect(() => {
    if (!gestaoLoading && categorias.length > 0) {
      setFormData(prev => ({
        ...prev,
        categoria_id: prev.categoria_id || categorias[0]?.id || '',
      }));
    }
  }, [categorias, gestaoLoading]);

  useEffect(() => {
    if (!gestaoLoading && departamentos.length > 0) {
      setFormData(prev => ({
        ...prev,
        departamento_id: prev.departamento_id || departamentos[0]?.id || '',
      }));
    }
  }, [departamentos, gestaoLoading]);

  useEffect(() => {
    if (!gestaoLoading && status.length > 0) {
      setFormData(prev => ({
        ...prev,
        status_id: prev.status_id || status[0]?.id || '',
      }));
    }
  }, [status, gestaoLoading]);

  useEffect(() => {
    if (!gestaoLoading && tiposBem.length > 0) {
      setFormData(prev => ({
        ...prev,
        tipo_bem_id: prev.tipo_bem_id || tiposBem[0]?.id || '',
      }));
    }
  }, [tiposBem, gestaoLoading]);

  useEffect(() => {
    if (!loading && !user) router.push('/auth');
  }, [user, loading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const sanitizeFileName = (fileName: string) => {
    return fileName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_');
  };

  const getAttachmentTypeFromFile = (file: File): TipoAnexo => {
    const lower = file.name.toLowerCase();
    if (file.type.startsWith('image/')) return 'foto';
    if (lower.includes('nota') || lower.includes('nf')) return 'nota_fiscal';
    if (lower.endsWith('.pdf') || lower.endsWith('.doc') || lower.endsWith('.docx')) return 'documento';
    return tipoAnexoPadrao;
  };

  const handleAnexosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter((file) => file.size <= MAX_FILE_SIZE_BYTES);
    const invalidFiles = files.filter((file) => file.size > MAX_FILE_SIZE_BYTES);

    if (invalidFiles.length > 0) {
      setError(`Alguns arquivos excedem 10MB e foram ignorados: ${invalidFiles.map((f) => f.name).join(', ')}`);
    }

    setAnexos((prev) => [...prev, ...validFiles]);
    e.target.value = '';
  };

  const removeAnexo = (index: number) => {
    setAnexos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const bemData = {
        nome_item: formData.nome_item,
        categoria_id: formData.categoria_id,
        tipo_bem_id: formData.tipo_bem_id || null,
        marca_id: formData.marca_id || null,
        codigo_modelo: formData.codigo_modelo || null,
        numero_serie: formData.numero_serie || null,
        ram: formData.ram || null,
        armazenamento: formData.armazenamento || null,
        qtde: formData.qtde,
        departamento_id: formData.departamento_id,
        localizacao: formData.localizacao || null,
        responsavel: formData.responsavel || null,
        data_aquisicao: formData.data_aquisicao || null,
        data_expiracao_garantia: formData.data_expiracao_garantia || null,
        valor: formData.valor,
        qtde_processadores: formData.qtde_processadores || null,
        modelo_processador: formData.modelo_processador || null,
        status_id: formData.status_id,
        criado_por: user?.email,
      };

      const { data, error: insertError } = await supabase
        .from('bens')
        .insert([bemData])
        .select();

      if (insertError) throw insertError;

      // add histórico inicial
      if (data && data[0]) {
        const bemId = data[0].id;

        const historicoData = {
          bem_id: bemId,
          acao: 'Equipamento cadastrado no sistema',
          usuario: user?.email || 'Sistema',
          data: new Date().toISOString(),
        };

        await supabase.from('historico').insert([historicoData]);

        if (anexos.length > 0) {
          const anexosRows: {
            bem_id: string;
            nome_original: string;
            storage_path: string;
            mime_type: string | null;
            tamanho_bytes: number;
            tipo_anexo: TipoAnexo;
            enviado_por: string | null;
          }[] = [];

          const uploadErrors: string[] = [];

          for (const file of anexos) {
            const safeName = sanitizeFileName(file.name);
            const filePath = `${bemId}/${Date.now()}-${safeName}`;
            const tipoAnexo = getAttachmentTypeFromFile(file);

            const { error: uploadError } = await supabase.storage
              .from(ATTACHMENTS_BUCKET)
              .upload(filePath, file, {
                upsert: false,
                contentType: file.type || undefined,
              });

            if (uploadError) {
              uploadErrors.push(`${file.name}: ${uploadError.message}`);
              continue;
            }

            anexosRows.push({
              bem_id: bemId,
              nome_original: file.name,
              storage_path: filePath,
              mime_type: file.type || null,
              tamanho_bytes: file.size,
              tipo_anexo: tipoAnexo,
              enviado_por: user?.email || null,
            });
          }

          if (anexosRows.length > 0) {
            const { error: anexosInsertError } = await supabase
              .from('anexos_bem')
              .insert(anexosRows);

            if (anexosInsertError) {
              throw new Error(`Bem cadastrado, mas falhou ao registrar anexos: ${anexosInsertError.message}`);
            }
          }

          if (uploadErrors.length > 0) {
            throw new Error(`Bem cadastrado, mas alguns anexos falharam: ${uploadErrors.join(' | ')}`);
          }
        }
      }
      
      setToastMessage(`Bem cadastrado com sucesso!`);
      setShowToast(true);
      
      // reset formulário
      setFormData({
        nome_item: '',
        categoria_id: categorias[0]?.id || '',
        tipo_bem_id: tiposBem[0]?.id || '',
        marca_id: marcas[0]?.id || '',
        ram: '',
        armazenamento: '',
        codigo_modelo: '',
        numero_serie: '',
        qtde: 1,
        departamento_id: departamentos[0]?.id || '',
        localizacao: '',
        responsavel: '',
        data_aquisicao: new Date().toISOString().split('T')[0],
        data_expiracao_garantia: '',
        valor: 0,
        qtde_processadores: 0,
        modelo_processador: '',
        status_id: status[0]?.id || '',
      });
      setAnexos([]);
      setTipoAnexoPadrao('documento');

      setTimeout(() => {
        router.push('/bens/consultar');
      }, 1500);
      
    } catch (err: any) {
      setError("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || gestaoLoading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-slate-300" /></div>;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {showToast && (
        <Toast message={toastMessage} type="success" duration={3000} onClose={() => setShowToast(false)} />
      )}
      
      <div className="flex flex-col lg:flex-row">
        
    
        <main className="flex-1 p-6 md:p-12 border-r border-slate-100">
          <div className="max-w-4xl mb-10">
            <h1 className="text-3xl font-bold text-slate-900">Cadastro de Bens</h1>
            <p className="text-slate-500 text-sm mt-2">Registre um novo ativo no sistema</p>
            {error && (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}
          </div>
          <form id="bem-form" onSubmit={handleSubmit} className="max-w-4xl space-y-16">
            
            {/* Bloco 01: Identificação */}
            <section>
              <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-8">
                <Package className="w-4 h-4 text-slate-400"/> Identificação e Modelo
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="lg:col-span-2">
                  <label className="block text-base font-semibold text-slate-700 mb-2">Nome do Item *</label>
                  <input
                    type="text"
                    name="nome_item"
                    value={formData.nome_item}
                    onChange={handleChange}
                    required
                    placeholder="Ex: Computador intell Core i7"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium transition-all outline-none focus:border-amber-500 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <SearchableSelect
                    label="Categoria"
                    options={categorias}
                    value={formData.categoria_id || ''}
                    onChange={(value) => handleSelectChange('categoria_id', value)}
                    placeholder="Selecione uma categoria"
                    required
                  />
                </div>
                <div>
                  <SearchableSelect
                    label="Marca"
                    options={marcas}
                    value={formData.marca_id || ''}
                    onChange={(value) => handleSelectChange('marca_id', value)}
                    placeholder="Selecione uma marca"
                  />
                </div>
                <div>
                  <SearchableSelect
                    label="Tipo de Bem"
                    options={tiposBem}
                    value={formData.tipo_bem_id || ''}
                    onChange={(value) => handleSelectChange('tipo_bem_id', value)}
                    placeholder="Selecione um tipo"
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold text-slate-700 mb-2">Código do Modelo</label>
                  <input
                    type="text"
                    name="codigo_modelo"
                    value={formData.codigo_modelo}
                    onChange={handleChange}
                    placeholder="Se disponível"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium transition-all outline-none focus:border-amber-500 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold text-slate-700 mb-2">Número de Série</label>
                  <input
                    type="text"
                    name="numero_serie"
                    value={formData.numero_serie}
                    onChange={handleChange}
                    placeholder="SN / Service Tag"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium transition-all outline-none focus:border-amber-500 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
              </div>
            </section>

            {/* Bloco 02: Hardware */}
            <section>
              <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-8">
                <Cpu className="w-4 h-4 text-slate-400"/> Especificações Técnicas
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="lg:col-span-2">
                  <label className="block text-base font-semibold text-slate-700 mb-2">Modelo do Processador</label>
                  <input
                    type="text"
                    name="modelo_processador"
                    value={formData.modelo_processador}
                    onChange={handleChange}
                    placeholder="Intel Xeon, i7..."
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium transition-all outline-none focus:border-amber-500 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold text-slate-700 mb-2">Qtd. CPUs</label>
                  <input
                    type="number"
                    name="qtde_processadores"
                    value={formData.qtde_processadores}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium transition-all outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold text-slate-700 mb-2">Memória RAM</label>
                  <input
                    type="text"
                    name="ram"
                    value={formData.ram}
                    onChange={handleChange}
                    placeholder="Ex: 16GB"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium transition-all outline-none focus:border-amber-500 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
                <div className="lg:col-span-4">
                  <label className="block text-base font-semibold text-slate-700 mb-2">Armazenamento</label>
                  <input
                    type="text"
                    name="armazenamento"
                    value={formData.armazenamento}
                    onChange={handleChange}
                    placeholder="Ex: 512GB SSD"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium transition-all outline-none focus:border-amber-500 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
              </div>
            </section>

            {/* Bloco 03: Logística e Financeiro */}
            <section>
              <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-8">
                <MapPin className="w-4 h-4 text-slate-400"/> Localização e Financeiro
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div>
                  <SearchableSelect
                    label="Departamento"
                    options={departamentos}
                    value={formData.departamento_id || ''}
                    onChange={(value) => handleSelectChange('departamento_id', value)}
                    placeholder="Selecione"
                    required
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold text-slate-700 mb-2">Localização</label>
                  <input
                    type="text"
                    name="localizacao"
                    value={formData.localizacao}
                    onChange={handleChange}
                    required
                    placeholder="Sala / Setor"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium transition-all outline-none focus:border-amber-500 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold text-slate-700 mb-2">Responsável</label>
                  <input
                    type="text"
                    name="responsavel"
                    value={formData.responsavel}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium transition-all outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold text-slate-700 mb-2">Data de Aquisição</label>
                  <input
                    type="date"
                    name="data_aquisicao"
                    value={formData.data_aquisicao}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium transition-all outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold text-slate-700 mb-2">Data de Expiração da Garantia</label>
                  <input
                    type="date"
                    name="data_expiracao_garantia"
                    value={formData.data_expiracao_garantia}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium transition-all outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold text-slate-700 mb-2">Valor Unitário</label>
                  <input
                    type="number"
                    step="0.01"
                    name="valor"
                    value={formData.valor}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium transition-all outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold text-slate-700 mb-2">Quantidade</label>
                  <input
                    type="number"
                    name="qtde"
                    min="1"
                    value={formData.qtde}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium transition-all outline-none focus:border-amber-500"
                  />
                </div>
                <div className="lg:col-span-2">
                  <SearchableSelect
                    label="Status Atual"
                    options={status}
                    value={formData.status_id || ''}
                    onChange={(value) => handleSelectChange('status_id', value)}
                    placeholder="Selecione um status"
                    required
                  />
                </div>
              </div>
            </section>


            <div className="pt-12 flex items-center gap-4">
              <button type="button" onClick={() => window.location.reload()} className="px-6 py-2 bg-slate-100 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-200 transition">
                Limpar
              </button>
              <button type="submit" disabled={saving} className="px-8 py-2 bg-slate-950 text-white text-sm font-semibold rounded-lg hover:shadow-lg hover:shadow-slate-200 transition active:scale-[0.98] disabled:bg-slate-300">
                {saving ? 'Processando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </main>
        <aside className="w-full lg:w-96 bg-[#FBFCFD] p-6 md:p-10">
          <div className="sticky top-24 space-y-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Paperclip className="w-4 h-4 text-slate-600" />
                <h3 className="text-sm font-bold text-slate-800">Anexos do Bem</h3>
              </div>

              <p className="text-xs text-slate-500 mb-4">
                Envie nota fiscal, fotos, termos ou outros documentos (max. 10MB por arquivo).
              </p>

              <label className="block text-xs font-semibold text-slate-700 mb-2">Tipo padrão do anexo</label>
              <select
                value={tipoAnexoPadrao}
                onChange={(e) => setTipoAnexoPadrao(e.target.value as TipoAnexo)}
                className="w-full mb-4 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 outline-none focus:border-amber-500"
              >
                <option value="documento">Documento</option>
                <option value="nota_fiscal">Nota fiscal</option>
                <option value="foto">Foto</option>
                <option value="outro">Outro</option>
              </select>

              <label className="block text-xs font-semibold text-slate-700 mb-2">Selecionar arquivos</label>
              <input
                type="file"
                multiple
                onChange={handleAnexosChange}
                className="w-full text-xs text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-slate-800"
              />

              <div className="mt-4 space-y-2 max-h-72 overflow-y-auto">
                {anexos.length === 0 ? (
                  <p className="text-xs text-slate-500">Nenhum anexo selecionado.</p>
                ) : (
                  anexos.map((file, index) => {
                    const isImage = file.type.startsWith('image/');
                    const Icon = isImage ? FileImage : FileText;
                    return (
                      <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className="w-4 h-4 text-slate-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-800 truncate">{file.name}</p>
                            <p className="text-[11px] text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAnexo(index)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition"
                          title="Remover anexo"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}