export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ colecao: string; id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const supabase = getSupabaseServerClient(token || undefined);
    const { colecao, id } = await params;
    const validColecao = colecao as CollectionType;

    if (!Object.keys(COLLECTIONS).includes(colecao)) {
      return NextResponse.json(
        { error: 'Coleção inválida' },
        { status: 400 }
      );
    }
    if (!id) {
      return NextResponse.json(
        { error: 'ID é obrigatório' },
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
    const updateObj: any = {
      nome: nome.trim(),
      atualizado_em: new Date().toISOString(),
    };
    if (colecao === 'status' && cor) {
      updateObj.cor = cor;
    }
    const { data, error } = await supabase
      .from(colecao)
      .update(updateObj)
      .eq('id', id)
      .select();
    if (error) {
      console.error('Erro ao editar item:', error);
      return NextResponse.json(
        { error: 'Erro ao editar item' },
        { status: 500 }
      );
    }
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum dado retornado após edição' },
        { status: 500 }
      );
    }
    return NextResponse.json(data[0]);
  } catch (error: any) {
    console.error('Erro ao editar item:', error);
    if (error?.message?.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY')) {
      return NextResponse.json(
        { error: 'Configuracao ausente: defina NEXT_PUBLIC_SUPABASE_ANON_KEY no .env' },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'Erro ao editar item' },
      { status: 500 }
    );
  }
}
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ colecao: string; id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const supabase = getSupabaseServerClient(token || undefined);
    const { colecao, id } = await params;
    const validColecao = colecao as CollectionType;

    if (!Object.keys(COLLECTIONS).includes(colecao)) {
      return NextResponse.json(
        { error: 'Coleção inválida' },
        { status: 400 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: 'ID é obrigatório' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from(colecao)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar item:', error);
      return NextResponse.json(
        { error: 'Erro ao deletar item' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao deletar item:', error);
    if (error?.message?.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY')) {
      return NextResponse.json(
        { error: 'Configuracao ausente: defina NEXT_PUBLIC_SUPABASE_ANON_KEY no .env' },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'Erro ao deletar item' },
      { status: 500 }
    );
  }
}
