import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer,
  collection,
  doc as firestoreDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';

// Configuration provided explicitly by the user
const firebaseConfig = {
  apiKey: "AIzaSyC1F3gvVAkP5naRatmQBLvgzB3g6-jQUCs",
  authDomain: "sagatix.firebaseapp.com",
  projectId: "sagatix",
  storageBucket: "sagatix.firebasestorage.app",
  messagingSenderId: "756688568443",
  appId: "1:756688568443:web:bd43538bee3afad10b62de",
  measurementId: "G-PEKXL1TV0Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Firestore Error Handler as specified in SKILL.md
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
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection Validation on startup as mandated by SKILL.md
async function testConnection() {
  try {
    // Attempting background connection test
    await getDocFromServer(doc(db, 'test-connection-sagatix', 'connection-check'));
    console.log("Firebase connection test performed successfully.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration: Firestore client is offline.");
    } else {
      console.log("Firebase connection test completed.");
    }
  }
}
testConnection();

// Auth helper functions
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) return null as T;
  if (data === null || typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item)) as T;
  }
  
  const obj = { ...data } as Record<string, any>;
  for (const key of Object.keys(obj)) {
    if (obj[key] === undefined) {
      delete obj[key];
    } else {
      obj[key] = sanitizeForFirestore(obj[key]);
    }
  }
  return obj as T;
}

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Google login failed:", error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout failed:", error);
    throw error;
  }
};
