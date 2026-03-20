import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
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

export async function GET(request: NextRequest, { params }: { params: Promise<{ colecao: string }> }) {
  try {
    // verificar autenticação
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const { colecao } = await params;
    const validColecao = colecao as CollectionType;

    if (!Object.keys(COLLECTIONS).includes(colecao)) {
      return NextResponse.json(
        { error: 'Coleção inválida' },
        { status: 400 }
      );
    }

    const q = query(
      collection(db, colecao),
      orderBy('criado_em', 'desc')
    );
    const snapshot = await getDocs(q);

    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(items);
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
    // verificar autenticação
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const { colecao } = await params;
    const validColecao = colecao as CollectionType;

    if (!Object.keys(COLLECTIONS).includes(colecao)) {
      return NextResponse.json(
        { error: 'Coleção inválida' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { nome } = body;

    if (!nome || typeof nome !== 'string' || !nome.trim()) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      );
    }

    // verificar duplicação
    const existingSnapshot = await getDocs(
      query(collection(db, colecao))
    );

    const exists = existingSnapshot.docs.some(
      (doc) => doc.data().nome.toLowerCase() === nome.toLowerCase()
    );

    if (exists) {
      return NextResponse.json(
        { error: 'Este item já foi cadastrado' },
        { status: 409 }
      );
    }

    const docRef = await addDoc(collection(db, colecao), {
      nome: nome.trim(),
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    });

    return NextResponse.json({
      id: docRef.id,
      nome: nome.trim(),
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Erro ao criar item:', error);
    return NextResponse.json(
      { error: 'Erro ao criar item' },
      { status: 500 }
    );
  }
}
