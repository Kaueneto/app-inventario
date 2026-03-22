// Tipos para o sistema de inventário

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  role?: 'admin' | 'user';
  mustSetPassword?: boolean;
}

export interface Bem {
  id?: string;
  nome_item: string;
  categoria: string; // dinâmico - carregado de Firestore
  marca: string;
  ram?: string; // Ex: "16GB DDR4"
  armazenamento?: string; // Ex: "512GB SSD"
  codigo_modelo?: string;
  numero_serie?: string;
  qtde: number;
  departamento: string;
  localizacao: string;
  responsavel: string;
  data_aquisicao: string; // ISO format: YYYY-MM-DD
  data_expiracao_garantia?: string; // ISO format: YYYY-MM-DD
  valor: number;
  qtde_processadores?: number;
  modelo_processador?: string;
  status: string; // dinâmico - carregado de Firestore
  historico: Historico[];
  nota_fiscal?: string;
  criado_em: string;
  atualizado_em: string;
  criado_por: string;
  fotos?: string[]; // URLs das imagens
}

export interface Historico {
  data: string; // formato ISO: YYYY-MM-DD HH:mm:ss //mudar depois pra br
  acao: string; // Ex: "Enviado para conserto"
  usuario: string; // email/nome de quem fez a ação
  detalhes?: string;
  novo_departamento?: string;
  novo_responsavel?: string;
  novo_status?: string;
}

export interface MovimentacaoForm {
  acao: string;
  detalhes?: string;
  novo_departamento?: string;
  novo_responsavel?: string;
  novo_status?: string;
}

export interface Categoria {
  id?: string;
  nome: string;
  criado_em?: string;
  atualizado_em?: string;
}

export interface Status {
  id?: string;
  nome: string;
  criado_em?: string;
  atualizado_em?: string;
}

export interface Departamento {
  id?: string;
  nome: string;
  criado_em?: string;
  atualizado_em?: string;
}

export interface Marca {
  id?: string;
  nome: string;
  criado_em?: string;
  atualizado_em?: string;
}

export const CATEGORIAS = [
  'Computador',
  'Servidor',
  'TV',
  'Periférico',
  'Pendrive',
  'Sucata',
  'Outro',
];

export const STATUS_OPTIONS = [
  'Em uso',
  'Sucata',
  'Conserto',
  'Emprestado',
  'Descartado',
];

export const DEPARTAMENTOS = [
  'TI',
  'Marketing',
  'Financeiro',
  'Vendas',
  'RH',
  'Operações',
  'Diretoria',
  'Outro',
];
