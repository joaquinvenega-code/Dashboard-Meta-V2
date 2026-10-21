import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDocFromServer, runTransaction } from 'firebase/firestore';
import { db, portfolioAuth } from './firebaseService';
import { validatePortfolio, type Portfolio } from '../lib/weeklyReports';

export const watchPortfolioUser = (callback: (uid: string | null) => void) => portfolioAuth
  ? onAuthStateChanged(portfolioAuth, user => callback(user?.uid || null)) : () => {};
export const connectPortfolio = () => {
  if (!portfolioAuth) throw new Error('Falta configurar Firebase para este despliegue.');
  return signInWithPopup(portfolioAuth, new GoogleAuthProvider());
};
export const disconnectPortfolio = () => portfolioAuth ? signOut(portfolioAuth) : Promise.resolve();
const ref = (uid: string) => doc(db, 'orionUsers', uid, 'portfolio', 'current');
export async function readPortfolio(uid: string) {
  const snapshot = await getDocFromServer(ref(uid));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  if (!Number.isInteger(data.revision)) throw new Error('Revisión de cartera inválida.');
  return { portfolio: validatePortfolio(data.portfolio), revision: data.revision as number };
}
export async function writePortfolio(uid: string, portfolio: Portfolio, expectedRevision: number) {
  validatePortfolio(portfolio);
  return runTransaction(db, async tx => {
    const snapshot = await tx.get(ref(uid));
    const revision = snapshot.exists() ? snapshot.data().revision : 0;
    if (revision !== expectedRevision) throw new Error('La cartera cambió en otro dispositivo. Cargá la versión guardada antes de continuar.');
    tx.set(ref(uid), { portfolio: JSON.parse(JSON.stringify(portfolio)), revision: revision + 1, updatedAt: new Date().toISOString() });
    return revision + 1;
  });
}
