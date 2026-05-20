import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
let db: any = null;
try {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase Initialization Failure:", e);
}

export { db };

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
      userId: 'voice-asistente-user',
      email: 'usuario@orion.com',
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function saveLogToFirestore(clientId: string, noteText: string, date: string) {
  if (!db) return;
  const path = `clients/${clientId}/logs`;
  try {
    // Generate document reference and write record
    const collectionRef = collection(db, 'clients', clientId, 'logs');
    const docRef = doc(collectionRef);
    await setDoc(docRef, {
      text: noteText,
      date: date,
      createdAt: new Date().toISOString()
    });
    console.log(`Log successfully matched and saved to Firestore for client: ${clientId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `clients/${clientId}/logs`);
  }
}

export async function saveOfflineSaleToFirestore(clientId: string, amount: number, date: string) {
  if (!db) return;
  const path = `clients/${clientId}/offline_sales`;
  try {
    const collectionRef = collection(db, 'clients', clientId, 'offline_sales');
    const docRef = doc(collectionRef);
    await setDoc(docRef, {
      amount,
      date,
      note: "Venta fuera de línea registrada vía asistente de voz",
      createdAt: new Date().toISOString()
    });
    console.log(`Offline sale successfully matched and saved to Firestore for client: ${clientId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `clients/${clientId}/offline_sales`);
  }
}
