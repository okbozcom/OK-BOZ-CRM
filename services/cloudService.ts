
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

let db: any = null;

// Initialize Firebase Instance
const getDb = (config: FirebaseConfig) => {
  if (!db) {
    try {
      const app = initializeApp(config);
      db = getFirestore(app);
    } catch (e) {
      console.error("Error initializing Firebase:", e);
      throw new Error("Invalid Firebase Configuration");
    }
  }
  return db;
};

export const initFirebase = (config: FirebaseConfig): boolean => {
  try {
    getDb(config);
    return true;
  } catch (e) {
    return false;
  }
};

export const syncToCloud = async (config: FirebaseConfig): Promise<{success: boolean, message: string}> => {
  try {
    const database = getDb(config);
    const data: Record<string, any> = {};
    
    // Define crucial keys to backup
    const specificKeys = [
        'app_settings', 'app_branding', 'corporate_accounts', 
        'staff_data', 'leads_data', 'vendor_data', 'tasks_data', 
        'office_expenses', 'reception_recent_transfers', 'leave_history',
        'admin_sidebar_order', 'smtp_config'
    ];

    // 1. Capture Specific Keys
    specificKeys.forEach(key => {
        const val = localStorage.getItem(key);
        if (val) {
            try { data[key] = JSON.parse(val); } catch { data[key] = val; }
        }
    });

    // 2. Capture Dynamic Keys (Staff details, attendance, branches)
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
            key.startsWith('staff_data_') || 
            key.startsWith('attendance_') || 
            key.startsWith('branches_data') ||
            key.startsWith('office_expenses_')
        )) {
            const val = localStorage.getItem(key);
            if (val) {
                try { data[key] = JSON.parse(val); } catch { data[key] = val; }
            }
        }
    }

    // 3. Save to Firestore (Single Document "GlobalStore" for simplicity in this admin tool)
    // In a multi-tenant real app, this would be structured differently.
    await setDoc(doc(database, "ok_boz_system", "global_backup"), {
        timestamp: new Date().toISOString(),
        data: data
    });
    
    return { success: true, message: "Database successfully saved to Vercel/Firebase Cloud!" };
  } catch (error: any) {
    console.error("Sync Error:", error);
    return { success: false, message: error.message || "Failed to sync to cloud." };
  }
};

export const restoreFromCloud = async (config: FirebaseConfig): Promise<{success: boolean, message: string}> => {
  try {
    const database = getDb(config);
    const docRef = doc(database, "ok_boz_system", "global_backup");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const { data } = docSnap.data();
      
      if (data) {
          // Restore to LocalStorage
          Object.entries(data).forEach(([key, value]) => {
              if (typeof value === 'object') {
                  localStorage.setItem(key, JSON.stringify(value));
              } else {
                  localStorage.setItem(key, String(value));
              }
          });
          return { success: true, message: "Database restored successfully! Reloading..." };
      }
      return { success: false, message: "Backup file is empty." };
    } else {
      return { success: false, message: "No cloud backup found." };
    }
  } catch (error: any) {
    console.error("Restore Error:", error);
    return { success: false, message: error.message || "Failed to restore from cloud." };
  }
};
