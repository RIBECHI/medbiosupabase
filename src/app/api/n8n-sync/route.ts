import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert, type App, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: App;

// A mesma função de inicialização do outro webhook, mas com nome diferente
function initializeAdminApp(): App {
  const appName = 'firebase-admin-n8n-sync-handler';
  if (getApps().some(app => app.name === appName)) {
    return getApps().find(app => app.name === appName)!;
  }

  const base64Credentials = process.env.FIREBASE_ADMIN_CREDENTIALS_BASE64;
  if (!base64Credentials) {
    throw new Error('FIREBASE_ADMIN_CREDENTIALS_BASE64 environment variable is not set.');
  }

  try {
    const credentialsJson = Buffer.from(base64Credentials, 'base64').toString('utf8');
    const serviceAccount = JSON.parse(credentialsJson) as ServiceAccount;

    adminApp = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.projectId,
    }, appName);
    
    return adminApp;

  } catch (e: any) {
    console.error("Failed to parse or use Firebase Admin credentials.", e.message);
    throw new Error("Invalid Firebase Admin credentials format.");
  }
}

// POST handler para o webhook
export async function POST(request: Request) {
  try {
    const app = initializeAdminApp();
    const db = getFirestore(app);

    // 1. Obter os dados de treinamento do corpo da requisição
    const { trainingData } = await request.json();
    if (!trainingData || !Array.isArray(trainingData)) {
        return NextResponse.json({ success: false, error: 'Dados de treinamento inválidos.' }, { status: 400 });
    }

    // 2. Obter a URL do webhook do Firestore
    const settingsDoc = await db.collection('settings').doc('general').get();
    const settings = settingsDoc.data();
    const webhookUrl = settings?.n8nTrainingWebhookUrl;

    if (!webhookUrl) {
        return NextResponse.json({ success: false, error: 'A URL do webhook de treinamento do n8n não está configurada nas Configurações.' }, { status: 400 });
    }

    // 3. Enviar os dados para o webhook do n8n
    const n8nResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainingData }), // n8n espera um objeto JSON
    });

    if (!n8nResponse.ok) {
        const errorBody = await n8nResponse.text();
        console.error('Erro ao enviar para o n8n:', errorBody);
        throw new Error(`O n8n retornou um erro: ${n8nResponse.statusText}`);
    }
    
    return NextResponse.json({ success: true, message: 'Dados enviados para o n8n.' });

  } catch (error: any) {
    console.error('Error processing n8n-sync request:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Ocorreu um erro interno no servidor.' },
      { status: 500 }
    );
  }
}
