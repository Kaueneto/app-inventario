import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { deleteDoc, doc } from 'firebase/firestore';
import { verifyIdToken } from '@/lib/verify-token';

type CollectionType = 'categorias' | 'status' | 'departamentos' | 'marcas';

const COLLECTIONS: Record<CollectionType, string> = {
  categorias: 'categorias',
  status: 'status',
  departamentos: 'departamentos',
  marcas: 'marcas',
};

// verificar autenticação
async function verifyAuth(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return null;
  }
  
  try {
    const decoded = await verifyIdToken(token);
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ colecao: string; id: string }> }
) {
  try {
    // verificar autenticação
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

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

    await deleteDoc(doc(db, colecao, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao deletar item:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar item' },
      { status: 500 }
    );
  }
}
