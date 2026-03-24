import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

type CollectionType = 'categorias' | 'status' | 'departamentos' | 'marcas' | 'tipos_bem';

const COLLECTIONS: Record<CollectionType, string> = {
  categorias: 'categorias',
  status: 'status',
  departamentos: 'departamentos',
  marcas: 'marcas',
  tipos_bem: 'tipos_bem',
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ colecao: string }> }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const supabase = getSupabaseServerClient(token || undefined);
    const { colecao } = await params;
    const validColecao = colecao as CollectionType;

    if (!Object.keys(COLLECTIONS).includes(colecao)) {
      return NextResponse.json(
        { error: 'Coleção inválida' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from(colecao)
      .select('*')
      .order('criado_em', { ascending: false });

    if (error) {
      console.error('Erro ao buscar itens:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar itens' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erro ao buscar itens:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar itens' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ colecao: string }> }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const supabase = getSupabaseServerClient(token || undefined);
    const { colecao } = await params;
    const validColecao = colecao as CollectionType;

    if (!Object.keys(COLLECTIONS).includes(colecao)) {
      return NextResponse.json(
        { error: 'Coleção inválida' },
        { status: 400 }
      );
    }


    const body = await request.json();
    const { nome, cor } = body;

    if (!nome || typeof nome !== 'string' || !nome.trim()) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      );
    }

    // verificar duplicação
    const { data: existing, error: existingError } = await supabase
      .from(colecao)
      .select('id')
      .ilike('nome', nome.trim());

    if (existingError) {
      console.error('Erro ao verificar duplicação:', existingError);
      return NextResponse.json(
        { error: 'Erro ao verificar duplicação' },
        { status: 500 }
      );
    }

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'Este item já foi cadastrado' },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const insertObj: any = {
      nome: nome.trim(),
      criado_em: now,
      atualizado_em: now,
    };
    if (colecao === 'status' && cor) {
      insertObj.cor = cor;
    }
    const { data, error } = await supabase
      .from(colecao)
      .insert(insertObj)
      .select();

    if (error) {
      console.error('Erro ao criar item:', error);
      console.error('Detalhes do erro:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return NextResponse.json(
        { 
          error: `Erro ao criar item: ${error.message}`,
          details: error.details,
          code: error.code,
        },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum dado retornado após inserção' },
        { status: 500 }
      );
    }

    return NextResponse.json(data[0]);
  } catch (error: any) {
    console.error('Erro ao criar item:', error);
    if (error?.message?.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY')) {
      return NextResponse.json(
        { error: 'Configuracao ausente: defina NEXT_PUBLIC_SUPABASE_ANON_KEY no .env' },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'Erro ao criar item' },
      { status: 500 }
    );
  }
}
