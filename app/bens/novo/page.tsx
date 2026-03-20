'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Toast from '@/app/components/Toast';
import SearchableSelect from '@/app/components/SearchableSelect';
import { 
  ChevronLeft, Upload, Package, Cpu, 
  MapPin, Loader2, X, FileIcon, Info 
} from 'lucide-react';
import { CATEGORIAS, DEPARTAMENTOS, STATUS_OPTIONS, Bem, Historico } from '@/lib/types';
import { useGestaoData } from '@/lib/useGestaoData';

export default function NovoBemPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { categorias, departamentos, marcas, status, loading: gestaoLoading } = useGestaoData();
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [formData, setFormData] = useState<Partial<Bem>>({
    nome_item: '',
    categoria: '',
    marca: '',
    ram: '',
    armazenamento: '',
    codigo_modelo: '',
    numero_serie: '',
    qtde: 1,
    departamento: '',
    localizacao: '',
    responsavel: '',
    data_aquisicao: new Date().toISOString().split('T')[0],
    valor: 0,
    qtde_processadores: 0,
    modelo_processador: '',
    status: '',
    historico: [],
    nota_fiscal: '',
  });

  // iniciar com primeiro item de cada categoria se não estiverem carregando
  useEffect(() => {
    if (!gestaoLoading && categorias.length > 0) {
      setFormData(prev => ({
        ...prev,
        categoria: prev.categoria || categorias[0]?.nome || '',
      }));
    }
  }, [categorias, gestaoLoading]);

  useEffect(() => {
    if (!gestaoLoading && departamentos.length > 0) {
      setFormData(prev => ({
        ...prev,
        departamento: prev.departamento || departamentos[0]?.nome || '',
      }));
    }
  }, [departamentos, gestaoLoading]);

  useEffect(() => {
    if (!gestaoLoading && status.length > 0) {
      setFormData(prev => ({
        ...prev,
        status: prev.status || status[0]?.nome || '',
      }));
    }
  }, [status, gestaoLoading]);

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

  const handleSelectChange = (field: string, value: string | { nome: string; id?: string }) => {
    const fieldValue = typeof value === 'string' ? value : value?.nome || '';
    setFormData((prev) => ({
      ...prev,
      [field]: fieldValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let fileUrl = '';
      if (selectedFile) {
        const fileRef = ref(storage, `bens_arquivos/${Date.now()}_${selectedFile.name}`);
        await uploadBytes(fileRef, selectedFile);
        fileUrl = await getDownloadURL(fileRef);
      }

      const historicoInicial: Historico = {
        data: new Date().toISOString().split('T')[0],
        acao: "Equipamento cadastrado no sistema",
        usuario: user?.email || 'Sistema'
      };

      const bemData = {
        ...formData,
        nota_fiscal: fileUrl,
        historico: [historicoInicial],
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        criado_por: user?.email,
      };

      await addDoc(collection(db, 'bens'), bemData);
      
      setToastMessage(`Bem cadastrado com sucesso!`);
      setShowToast(true);
      
      setFormData({
        nome_item: '',
        categoria: categorias[0]?.nome || '',
        marca: marcas[0]?.nome || '',
        ram: '',
        armazenamento: '',
        codigo_modelo: '',
        numero_serie: '',
        qtde: 1,
        departamento: departamentos[0]?.nome || '',
        localizacao: '',
        responsavel: '',
        data_aquisicao: new Date().toISOString().split('T')[0],
        valor: 0,
        qtde_processadores: 0,
        modelo_processador: '',
        status: status[0]?.nome || '',
        historico: [],
        nota_fiscal: '',
      });
      setSelectedFile(null);
      
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
        
    
        <main className="flex-1 p-6 md:p-12 lg:border-r border-slate-100">
          <form id="bem-form" onSubmit={handleSubmit} className="max-w-4xl space-y-16">
            
            {/* Bloco 01: Identificação */}
            <section>
              <h2 className="text-[13px] font-bold text-slate-900 flex items-center gap-2 mb-6 pb-2 border-b border-slate-50">
                <Package className="w-4 h-4 text-slate-400"/> Identificação e Modelo
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-5">
                <div className="md:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5 ml-1">Nome do Item *</label>
                  <input
                    type="text"
                    name="nome_item"
                    value={formData.nome_item}
                    onChange={handleChange}
                    required
                    placeholder="Ex: Servidor SRVGC PowerEdge T360"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium transition-all outline-none focus:ring-1 focus:ring-slate-950 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
                <div className="md:col-span-2">
                  <SearchableSelect
                    label="Categoria"
                    options={categorias}
                    value={formData.categoria || ''}
                    onChange={(value) => handleSelectChange('categoria', value)}
                    placeholder="Selecione uma categoria"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <SearchableSelect
                    label="Marca"
                    options={marcas}
                    value={formData.marca || ''}
                    onChange={(value) => handleSelectChange('marca', value)}
                    placeholder="Selecione uma marca"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5 ml-1">Código do Modelo</label>
                  <input
                    type="text"
                    name="codigo_modelo"
                    value={formData.codigo_modelo}
                    onChange={handleChange}
                    placeholder="Se disponível"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium transition-all outline-none focus:ring-1 focus:ring-slate-950 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5 ml-1">Número de Série</label>
                  <input
                    type="text"
                    name="numero_serie"
                    value={formData.numero_serie}
                    onChange={handleChange}
                    placeholder="SN / Service Tag"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium transition-all outline-none focus:ring-1 focus:ring-slate-950 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
              </div>
            </section>

            {/* Bloco 02: Hardware */}
            <section className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
              <h2 className="text-[13px] font-bold text-slate-900 flex items-center gap-2 mb-6 pb-2 border-b border-slate-50">
                <Cpu className="w-4 h-4 text-slate-400"/> Especificações Técnicas
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5 ml-1">Modelo do Processador</label>
                  <input
                    type="text"
                    name="modelo_processador"
                    value={formData.modelo_processador}
                    onChange={handleChange}
                    placeholder="Intel Xeon, i7..."
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium transition-all outline-none focus:ring-1 focus:ring-slate-950 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5 ml-1">Qtd. CPUs</label>
                  <input
                    type="number"
                    name="qtde_processadores"
                    value={formData.qtde_processadores}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium transition-all outline-none focus:ring-1 focus:ring-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5 ml-1">Memória RAM</label>
                  <input
                    type="text"
                    name="ram"
                    value={formData.ram}
                    onChange={handleChange}
                    placeholder="Ex: 16GB"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium transition-all outline-none focus:ring-1 focus:ring-slate-950 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5 ml-1">Armazenamento</label>
                  <input
                    type="text"
                    name="armazenamento"
                    value={formData.armazenamento}
                    onChange={handleChange}
                    placeholder="Ex: 512GB SSD"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium transition-all outline-none focus:ring-1 focus:ring-slate-950 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
              </div>
            </section>

            {/* Bloco 03: Logística e Financeiro */}
            <section>
              <h2 className="text-[13px] font-bold text-slate-900 flex items-center gap-2 mb-6 pb-2 border-b border-slate-50">
                <MapPin className="w-4 h-4 text-slate-400"/> Localização e Financeiro
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <SearchableSelect
                    label="Departamento"
                    options={departamentos}
                    value={formData.departamento || ''}
                    onChange={(value) => handleSelectChange('departamento', value)}
                    placeholder="Selecione um departamento"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5 ml-1">Localização</label>
                  <input
                    type="text"
                    name="localizacao"
                    value={formData.localizacao}
                    onChange={handleChange}
                    required
                    placeholder="Sala / Setor"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium transition-all outline-none focus:ring-1 focus:ring-slate-950 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5 ml-1">Responsável</label>
                  <input
                    type="text"
                    name="responsavel"
                    value={formData.responsavel}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium transition-all outline-none focus:ring-1 focus:ring-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5 ml-1">Data de Aquisição</label>
                  <input
                    type="date"
                    name="data_aquisicao"
                    value={formData.data_aquisicao}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium transition-all outline-none focus:ring-1 focus:ring-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5 ml-1">Valor Unitário</label>
                  <input
                    type="number"
                    step="0.01"
                    name="valor"
                    value={formData.valor}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium transition-all outline-none focus:ring-1 focus:ring-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5 ml-1">Quantidade</label>
                  <input
                    type="number"
                    name="qtde"
                    min="1"
                    value={formData.qtde}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium transition-all outline-none focus:ring-1 focus:ring-slate-950"
                  />
                </div>
                <div className="md:col-span-3">
                  <SearchableSelect
                    label="Status Atual"
                    options={status}
                    value={formData.status || ''}
                    onChange={(value) => handleSelectChange('status', value)}
                    placeholder="Selecione um status"
                    required
                  />
                </div>
              </div>
            </section>


            <div className="pt-12 flex items-center gap-4">
              <button type="button" onClick={() => window.location.reload()} className="px-8 py-3 bg-slate-100 text-slate-600 text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition">
                Limpar Campos
              </button>
              <button type="submit" disabled={saving} className="flex-1 px-8 py-3 bg-slate-950 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:shadow-2xl hover:shadow-slate-200 transition active:scale-[0.98] disabled:bg-slate-300">
                {saving ? 'Processando...' : 'Cadastrar Ativo'}
              </button>
            </div>
          </form>
        </main>
        <aside className="w-full lg:w-96 bg-[#FBFCFD] p-6 md:p-10">
          <div className="sticky top-24 space-y-8">
            <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Anexos Digitais</h2>
            
            {!selectedFile ? (
              <label className="group cursor-pointer border-2 border-dashed border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center gap-4 hover:border-slate-900 hover:bg-white transition-all duration-300">
                <input type="file" hidden onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                <Upload className="w-6 h-6 text-slate-400 group-hover:text-slate-950 transition-colors" />
                <span className="block text-sm font-bold text-slate-900">Upload de Arquivo</span>
              </label>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-950 rounded-xl flex items-center justify-center"><FileIcon className="w-5 h-5 text-white" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{selectedFile.name}</p>
                </div>
                <button onClick={() => setSelectedFile(null)} className="p-2 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition"><X className="w-5 h-5" /></button>
              </div>
            )} 
          </div>
        </aside>

      </div>
    </div>
  );
}