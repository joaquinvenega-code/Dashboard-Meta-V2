import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import webConfig from '../firebase-applet-config.json';

// Initialize Firebase App
let db: any = null;
let portfolioAuth: ReturnType<typeof getAuth> | null = null;
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || webConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || webConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || webConfig.projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || webConfig.appId,
};
export const firebaseConfigured = Boolean(config.apiKey && config.projectId && !config.projectId.includes('fake-project'));
try {
  if (firebaseConfigured) {
    const app = getApps().length === 0 ? initializeApp(config) : getApp();
    db = getFirestore(app);
    portfolioAuth = getAuth(app);
  }
} catch (e) {
  console.error("Firebase Initialization Failure:", e);
}

export { db, portfolioAuth };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: portfolioAuth?.currentUser?.uid,
      email: portfolioAuth?.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function saveLogToFirestore(clientId: string, noteText: string, date: string) {
  const uid = portfolioAuth?.currentUser?.uid;
  if (!db || !uid) return;
  const path = `orionUsers/${uid}/clients/${clientId}/logs`;
  try {
    // Generate document reference and write record
    const collectionRef = collection(db, 'orionUsers', uid, 'clients', clientId, 'logs');
    const docRef = doc(collectionRef);
    await setDoc(docRef, {
      text: noteText,
      date: date,
      createdAt: new Date().toISOString()
    });
    console.log(`Log successfully matched and saved to Firestore for client: ${clientId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveOfflineSaleToFirestore(clientId: string, amount: number, date: string) {
  const uid = portfolioAuth?.currentUser?.uid;
  if (!db || !uid) return;
  const path = `orionUsers/${uid}/clients/${clientId}/offline_sales`;
  try {
    const collectionRef = collection(db, 'orionUsers', uid, 'clients', clientId, 'offline_sales');
    const docRef = doc(collectionRef);
    await setDoc(docRef, {
      amount,
      date,
      note: "Venta fuera de línea registrada vía asistente de voz",
      createdAt: new Date().toISOString()
    });
    console.log(`Offline sale successfully matched and saved to Firestore for client: ${clientId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
