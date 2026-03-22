'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, UserPlus, RefreshCcw, UserX, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

type Usuario = {
  id: string;
  nome: string;
  email: string;
  criado_em?: string;
};

export default function NovoUsuarioPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [selecionados, setSelecionados] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingTabela, setLoadingTabela] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [authLoading, user, router]);

  // buscar usuários
  const fetchUsuarios = async () => {
    setLoadingTabela(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('usuarios')
        .select('*')
        .order('nome');

      if (fetchError) {
        setError(`Erro ao carregar usuários: ${fetchError.message}`);
        return;
      }

      if (data) {
        setUsuarios(data);
      }
    } catch (err: any) {
      setError(`Erro ao carregar usuários: ${err.message}`);
    } finally {
      setLoadingTabela(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  // validar e cadastrar
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // validar campos
    if (!nome.trim()) {
      setError('Preencha o nome do usuário.');
      return;
    }

    if (!email.trim()) {
      setError('Preencha o email do usuário.');
      return;
    }

    if (!email.includes('@')) {
      setError('Email inválido.');
      return;
    }

    // verif se email já existe
    const emailJaExiste = usuarios.some(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (emailJaExiste) {
      setError('Este email já está cadastrado.');
      return;
    }

    setLoading(true);

    try {
      // crirar usuário no Supabase Auth com magic link
      const { error: signUpError } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase().trim(),
        options: {
          shouldCreateUser: true,
          data: {
            full_name: nome.trim(),
            must_set_password: true,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('Este email já está cadastrado.');
        } else {
          setError(`Erro ao criar usuário: ${signUpError.message}`);
        }
        return;
      }

      // inserir na tabela usuarios
      const { error: insertError } = await supabase.from('usuarios').insert({
        nome: nome.trim(),
        email: email.toLowerCase().trim(),
      });

      if (insertError) {
        if (insertError.code === '23505') {
          setError('Este email já está cadastrado na tabela.');
        } else {
          setError(`Erro ao registrar na tabela: ${insertError.message}`);
        }
        return;
      }

      setSuccess(`Usuário cadastrado! Link de confirmação enviado para ${email.toLowerCase().trim()}`);
      setNome('');
      setEmail('');
      
      // aguardar um pouco e depois atualizar a lista
      setTimeout(() => {
        fetchUsuarios();
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      setError(`Erro ao cadastrar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // selecionar checkbox
  const toggleSelecionado = (id: string) => {
    setSelecionados((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id]
    );
  };

  //desativar usuários
  const desativarUsuarios = async () => {
    if (selecionados.length === 0) {
      setError('Selecione pelo menos um usuário para desativar.');
      return;
    }

    if (!confirm(`Desativar ${selecionados.length} usuário(s)? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('usuarios')
        .delete()
        .in('id', selecionados);

      if (deleteError) {
        setError(`Erro ao desativar: ${deleteError.message}`);
        return;
      }

      setSuccess(`${selecionados.length} usuário(s) desativado(s) com sucesso!`);
      setSelecionados([]);
      
      setTimeout(() => {
        fetchUsuarios();
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      setError(`Erro ao desativar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-700" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      <h1 className="text-2xl text-gray-800 font-bold">Cadastrar usuário</h1>

      {/* msg de erro e sucesso */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm">{success}</span>
        </div>
      )}

      {/* form. */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4"
      >
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Nome *</label>
          <input
            type="text"
            placeholder="Nome do usuário"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            disabled={loading}
            className="w-full border border-gray-300 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-gray-800 px-3 py-2 rounded-md text-sm"
            required
          />
        </div>

        <div className="flex-1 min-w-48">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Email *</label>
          <input
            type="email"
            placeholder="usuario@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="w-full border border-gray-300 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-gray-800 px-3 py-2 rounded-md text-sm"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 bg-black text-white px-6 py-2 rounded-md text-sm font-semibold hover:bg-slate-800 transition disabled:bg-slate-400 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          Cadastrar
        </button>
      </form>

      {/* table de usuários */}
      <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <p className="text-sm font-semibold text-gray-700">
            Usuários cadastrados ({usuarios.length})
          </p>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-700 text-left border-b border-gray-200">
            <tr>
              <th className="p-3 w-10"></th>
              <th className="p-3">Nome</th>
              <th className="p-3">Email</th>
              <th className="p-3 text-right">Criado em</th>
            </tr>
          </thead>

          <tbody>
            {loadingTabela ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </td>
              </tr>
            ) : usuarios.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">
                  Nenhum usuário cadastrado ainda.
                </td>
              </tr>
            ) : (
              usuarios.map((u) => (
                <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50 transition">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selecionados.includes(u.id)}
                      onChange={() => toggleSelecionado(u.id)}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </td>
                  <td className="p-3 font-medium text-gray-900">{u.nome}</td>
                  <td className="p-3 text-gray-600">{u.email}</td>
                  <td className="p-3 text-gray-500 text-right text-xs">
                    {u.criado_em ? new Date(u.criado_em).toLocaleDateString('pt-BR') : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3">
        <button
          onClick={desativarUsuarios}
          disabled={selecionados.length === 0 || loading}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-red-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          <UserX className="h-4 w-4" />
          Desativar selecionados ({selecionados.length})
        </button>

        <button
          onClick={fetchUsuarios}
          disabled={loadingTabela}
          className="flex items-center gap-2 text-gray-700 border border-gray-300 px-4 py-2 rounded-md text-sm font-semibold hover:bg-gray-50 transition disabled:bg-slate-100 disabled:cursor-not-allowed"
        >
          <RefreshCcw className={`h-4 w-4 ${loadingTabela ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      <div>
        <Link href="/dashboard" className="text-sm text-slate-600 hover:text-amber-500 font-semibold">
          Voltar ao inicio
        </Link>
      </div>
    </div>
  );
}