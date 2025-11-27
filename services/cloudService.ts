
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, Firestore } from 'firebase/firestore';

// Interface for the config saved in localStorage
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

// Initialize Firebase with user-provided config
export const initFirebase = (config: FirebaseConfig): boolean => {
  try {
    if (!config.apiKey || !config.projectId) return false;
    
    app = initializeApp(config);
    db = getFirestore(app);
    return true;
  } catch (e) {
    console.error("Failed to initialize Firebase", e);
    return false;
  }
};

// Get all local data packaged as a JSON object
const getAllLocalData = () => {
  const backupData: Record<string, any> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          backupData[key] = JSON.parse(value);
        } catch (e) {
          backupData[key] = value;
        }
      }
    }
  }
  return backupData;
};

// Sync Up: Push LocalStorage to Firebase
export const syncToCloud = async (config: FirebaseConfig): Promise<{success: boolean, message: string}> => {
  if (!db && !initFirebase(config)) {
    return { success: false, message: "Invalid Configuration" };
  }

  try {
    const data = getAllLocalData();
    // We store everything in a single document 'backup' inside a collection named after the company or a generic 'app_data'
    // Using a fixed ID 'latest' for simplicity in this demo context. 
    // In a real multi-tenant app, this would be auth-protected.
    await setDoc(doc(db!, "ok_boz_backups", "latest_sync"), {
      timestamp: new Date().toISOString(),
      data: JSON.stringify(data) // Stringify to avoid nested field limits/issues in Firestore
    });
    return { success: true, message: "Data successfully synced to Google Cloud!" };
  } catch (e: any) {
    console.error("Sync Error", e);
    return { success: false, message: `Sync Failed: ${e.message}` };
  }
};

// Sync Down: Pull from Firebase to LocalStorage
export const restoreFromCloud = async (config: FirebaseConfig): Promise<{success: boolean, message: string}> => {
  if (!db && !initFirebase(config)) {
    return { success: false, message: "Invalid Configuration" };
  }

  try {
    const docRef = doc(db!, "ok_boz_backups", "latest_sync");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const content = docSnap.data();
      const storedData = JSON.parse(content.data);

      // Clear and Restore
      localStorage.clear();
      Object.keys(storedData).forEach(key => {
        if (typeof storedData[key] === 'object') {
          localStorage.setItem(key, JSON.stringify(storedData[key]));
        } else {
          localStorage.setItem(key, String(storedData[key]));
        }
      });
      
      // Restore the config itself so we don't lose connection
      localStorage.setItem('firebase_config', JSON.stringify(config));

      return { success: true, message: "Data restored! Reloading..." };
    } else {
      return { success: false, message: "No backup found in cloud." };
    }
  } catch (e: any) {
    console.error("Restore Error", e);
    return { success: false, message: `Restore Failed: ${e.message}` };
  }
};
