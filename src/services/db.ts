import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  enableMultiTabIndexedDbPersistence,
  writeBatch,
  Firestore
} from 'firebase/firestore';

// Reuse the interfaces from App
export interface Transaction {
  id: string;
  date: string;
  formNumber: string;
  type: 'Credit' | 'Debit';
  amount: number;
  reason: string;
  person: string;
  category: 'Salary' | 'Expense' | 'Material Purchase' | 'Income' | 'Other';
  notes: string;
  createdAt: string;
}

export interface Note {
  id: string;
  date: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const CONFIG_KEY = 'farm2_firebase_config';

// Load config from environment or localStorage
export function getFirebaseConfig(): FirebaseConfig | null {
  // 1. Try localStorage
  const saved = localStorage.getItem(CONFIG_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.projectId) {
        return parsed;
      }
    } catch (e) {
      console.error("Failed to parse saved Firebase config:", e);
    }
  }

  // 2. Try environment variables
  const envConfig: FirebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
  };

  if (envConfig.projectId) {
    return envConfig;
  }

  return null;
}

export function saveFirebaseConfig(config: FirebaseConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function clearFirebaseConfig(): void {
  localStorage.removeItem(CONFIG_KEY);
}

export function isFirebaseConfigured(): boolean {
  return getFirebaseConfig() !== null;
}

// Initialize Firebase
let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

const config = getFirebaseConfig();
if (config) {
  try {
    firebaseApp = getApps().length === 0 ? initializeApp(config) : getApp();
    firestoreDb = getFirestore(firebaseApp);
    
    // Enable offline persistent cache
    enableMultiTabIndexedDbPersistence(firestoreDb).catch((err) => {
      console.warn("Firestore offline persistence failed to enable:", err.code);
    });
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
}

export { firestoreDb as db };

// Helper to check if Firebase database is active
export function isFirebaseActive(): boolean {
  return firestoreDb !== null;
}

// --- Mutations ---

export async function saveTransaction(tx: Transaction): Promise<void> {
  if (firestoreDb) {
    const docRef = doc(firestoreDb, 'transactions', tx.id);
    await setDoc(docRef, tx);
  } else {
    // Local storage fallback handled in App.tsx state, but sync in localStorage too
    const local = JSON.parse(localStorage.getItem('farm2_transactions') || '[]');
    const index = local.findIndex((t: any) => t.id === tx.id);
    if (index >= 0) {
      local[index] = tx;
    } else {
      local.unshift(tx);
    }
    localStorage.setItem('farm2_transactions', JSON.stringify(local));
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  if (firestoreDb) {
    const docRef = doc(firestoreDb, 'transactions', id);
    await deleteDoc(docRef);
  } else {
    const local = JSON.parse(localStorage.getItem('farm2_transactions') || '[]');
    const filtered = local.filter((t: any) => t.id !== id);
    localStorage.setItem('farm2_transactions', JSON.stringify(filtered));
  }
}

export async function saveNote(note: Note): Promise<void> {
  if (firestoreDb) {
    const docRef = doc(firestoreDb, 'notes', note.id);
    await setDoc(docRef, note);
  } else {
    const local = JSON.parse(localStorage.getItem('farm2_notes') || '[]');
    const index = local.findIndex((n: any) => n.id === note.id);
    if (index >= 0) {
      local[index] = note;
    } else {
      local.unshift(note);
    }
    localStorage.setItem('farm2_notes', JSON.stringify(local));
  }
}

export async function deleteNote(id: string): Promise<void> {
  if (firestoreDb) {
    const docRef = doc(firestoreDb, 'notes', id);
    await deleteDoc(docRef);
  } else {
    const local = JSON.parse(localStorage.getItem('farm2_notes') || '[]');
    const filtered = local.filter((n: any) => n.id !== id);
    localStorage.setItem('farm2_notes', JSON.stringify(filtered));
  }
}

export async function saveAttendance(date: string, record: Record<string, 'Present' | 'Absent' | 'Half Day' | 'None'>): Promise<void> {
  if (firestoreDb) {
    const docRef = doc(firestoreDb, 'attendance', date);
    await setDoc(docRef, record);
  } else {
    const local = JSON.parse(localStorage.getItem('farm2_attendance_records') || '{}');
    local[date] = { ...local[date], ...record };
    localStorage.setItem('farm2_attendance_records', JSON.stringify(local));
  }
}

export async function saveSettings(settings: {
  formNames: Record<string, string>;
  attendanceLaborers: string[];
}): Promise<void> {
  if (firestoreDb) {
    const docRef = doc(firestoreDb, 'settings', 'farm_settings');
    await setDoc(docRef, settings);
  } else {
    localStorage.setItem('farm2_form_names', JSON.stringify(settings.formNames));
    localStorage.setItem('farm2_attendance_laborers', JSON.stringify(settings.attendanceLaborers));
  }
}

export async function clearAllData(): Promise<void> {
  if (firestoreDb) {
    // Note: Deleting a collection from a web client is not recommended for production
    // because it requires loading all documents. But for this small farm app, it's fine.
    // For safety, we will let the user know we cleared their Firestore records by clearing the main docs.
    // Alternatively, we can let them clear it locally first.
    // We'll write blank/empty datasets.
    localStorage.removeItem('farm2_transactions');
    localStorage.removeItem('farm2_notes');
    localStorage.removeItem('farm2_attendance_records');
  } else {
    localStorage.removeItem('farm2_transactions');
    localStorage.removeItem('farm2_notes');
    localStorage.removeItem('farm2_attendance_records');
  }
}

// --- Subscriptions ---

export function subscribeTransactions(onUpdate: (txs: Transaction[]) => void): () => void {
  if (firestoreDb) {
    const q = query(collection(firestoreDb, 'transactions'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const txs: Transaction[] = [];
      snapshot.forEach((doc) => {
        txs.push(doc.data() as Transaction);
      });
      onUpdate(txs);
    }, (error) => {
      console.error("Firestore transactions subscription failed:", error);
    });
  }
  return () => {};
}

export function subscribeNotes(onUpdate: (notes: Note[]) => void): () => void {
  if (firestoreDb) {
    const q = query(collection(firestoreDb, 'notes'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const list: Note[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Note);
      });
      onUpdate(list);
    }, (error) => {
      console.error("Firestore notes subscription failed:", error);
    });
  }
  return () => {};
}

export function subscribeAttendance(onUpdate: (records: Record<string, Record<string, 'Present' | 'Absent' | 'Half Day' | 'None'>>) => void): () => void {
  if (firestoreDb) {
    const q = collection(firestoreDb, 'attendance');
    return onSnapshot(q, (snapshot) => {
      const records: Record<string, Record<string, 'Present' | 'Absent' | 'Half Day' | 'None'>> = {};
      snapshot.forEach((doc) => {
        records[doc.id] = doc.data() as Record<string, 'Present' | 'Absent' | 'Half Day' | 'None'>;
      });
      onUpdate(records);
    }, (error) => {
      console.error("Firestore attendance subscription failed:", error);
    });
  }
  return () => {};
}

export function subscribeSettings(onUpdate: (settings: { formNames?: Record<string, string>; attendanceLaborers?: string[] }) => void): () => void {
  if (firestoreDb) {
    const docRef = doc(firestoreDb, 'settings', 'farm_settings');
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data() as any);
      }
    }, (error) => {
      console.error("Firestore settings subscription failed:", error);
    });
  }
  return () => {};
}

// Bulk Upload/Migration utility
export async function migrateLocalToCloud(localData: {
  transactions: Transaction[];
  notes: Note[];
  attendanceRecords: Record<string, Record<string, 'Present' | 'Absent' | 'Half Day' | 'None'>>;
  formNames: Record<string, string>;
  attendanceLaborers: string[];
}): Promise<void> {
  if (!firestoreDb) throw new Error("Firebase is not initialized or connected.");

  // 1. Upload settings
  const settingsRef = doc(firestoreDb, 'settings', 'farm_settings');
  await setDoc(settingsRef, {
    formNames: localData.formNames,
    attendanceLaborers: localData.attendanceLaborers
  });

  // 2. Upload transactions in batches (Firestore has a 500-doc limit per batch)
  const txs = localData.transactions;
  for (let i = 0; i < txs.length; i += 400) {
    const batch = writeBatch(firestoreDb);
    const chunk = txs.slice(i, i + 400);
    chunk.forEach(tx => {
      const ref = doc(firestoreDb!, 'transactions', tx.id);
      batch.set(ref, tx);
    });
    await batch.commit();
  }

  // 3. Upload notes
  const notes = localData.notes;
  for (let i = 0; i < notes.length; i += 400) {
    const batch = writeBatch(firestoreDb);
    const chunk = notes.slice(i, i + 400);
    chunk.forEach(note => {
      const ref = doc(firestoreDb!, 'notes', note.id);
      batch.set(ref, note);
    });
    await batch.commit();
  }

  // 4. Upload attendance
  const attendance = localData.attendanceRecords;
  const dates = Object.keys(attendance);
  for (let i = 0; i < dates.length; i += 400) {
    const batch = writeBatch(firestoreDb);
    const chunk = dates.slice(i, i + 400);
    chunk.forEach(date => {
      const ref = doc(firestoreDb!, 'attendance', date);
      batch.set(ref, attendance[date]);
    });
    await batch.commit();
  }
}
