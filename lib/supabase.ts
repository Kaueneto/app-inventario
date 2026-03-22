import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis de ambiente do Supabase não configuradas');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipos para as tabelas do Supabase
export interface Categoria {
  id: string;
  nome: string;
  descricao?: string;
  criado_em: string;
  atualizado_em: string;
}

export interface Marca {
  id: string;
  nome: string;
  descricao?: string;
  criado_em: string;
  atualizado_em: string;
}

export interface Departamento {
  id: string;
  nome: string;
  descricao?: string;
  criado_em: string;
  atualizado_em: string;
}

export interface StatusItem {
  id: string;
  nome: string;
  cor?: string;
  descricao?: string;
  criado_em: string;
  atualizado_em: string;
}

export interface HistoricoItem {
  id: string;
  bem_id: string;
  data: string;
  acao: string;
  usuario?: string;
  detalhes?: string;
  novo_departamento_id?: string;
  novo_responsavel?: string;
  novo_status_id?: string;
}

export interface BemSupabase {
  id: string;
  nome_item: string;
  categoria_id: string;
  tipo_bem_id?: string;
  marca_id?: string;
  codigo_modelo?: string;
  numero_serie?: string;
  ram?: string;
  armazenamento?: string;
  qtde: number;
  departamento_id: string;
  localizacao?: string;
  responsavel?: string;
  data_aquisicao?: string;
  data_expiracao_garantia?: string;
  valor: number;
  qtde_processadores?: number;
  modelo_processador?: string;
  status_id: string;
  nota_fiscal?: string;
  criado_em: string;
  atualizado_em: string;
  criado_por?: string;
  // Campos com join
  categorias?: Categoria;
  marcas?: Marca;
  departamentos?: Departamento;
  status?: StatusItem;
  historico?: HistoricoItem[];
}
