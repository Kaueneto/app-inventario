import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let adminAuth: any = null;

export async function verifyIdToken(token: string) {
  try {
    // iniciar Firebase Admin se ainda não foi
    if (!adminAuth) {
      // usa as mesmas credenciais do Firebase web
      const serviceAccount = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
      };

      // se não tiver credenciais do admin, retorna true (execução em modo desenvolvimiento)
      if (!serviceAccount.privateKey || !serviceAccount.clientEmail) {
        return { uid: 'dev-user', email: 'dev@local' };
      }

      const app = initializeApp({
        credential: cert(serviceAccount as any),
      });
      adminAuth = getAuth(app);
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    throw error;
  }
}
