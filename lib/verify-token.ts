import { createClient } from '@supabase/supabase-js';

let supabaseAdmin: any = null;

export async function verifyIdToken(token: string) {
  try {
    // iniciar o supabase admin se ainda não tiver sido iniciado
    if (!supabaseAdmin) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      // se não tiver credenciais do admin, retorna true (execução em modo desenvolvimiento)
      if (!supabaseUrl || !supabaseServiceKey) {
        return { uid: 'dev-user', email: 'dev@local' };
      }

      supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }
//verificar o jwt token usando o supabase admin
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.admin.getUserById(
      token.split('.')[1] // extrai id do usuario no  JWT
    );

    if (error || !user) {
      const {
        data: { user: jwtUser },
      } = await supabaseAdmin.auth.getUser(token);

      if (!jwtUser) {
        throw new Error('Invalid token');
      }

      return {
        uid: jwtUser.id,
        email: jwtUser.email,
      };
    }

    return {
      uid: user.id,
      email: user.email,
    };
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    throw error;
  }
}
