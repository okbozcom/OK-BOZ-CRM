
import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, Firestore } from 'firebase/firestore';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// Robust initialization that handles config changes
const getDb = async (config: FirebaseConfig): Promise<Firestore> => {
  try {
    // If an app already exists, delete it to ensure we use the new config
    if (getApps().length > 0) {
      await deleteApp(getApps()[0]);
    }
    
    const app = initializeApp(config);
    return getFirestore(app);
  } catch (e: any) {
    console.error("Error initializing Firebase:", e);
    throw new Error(e.message || "Invalid Firebase Configuration");
  }
};

export const testConnection = async (config: FirebaseConfig): Promise<{success: boolean, message: string}> => {
    try {
        const db = await getDb(config);
        // Try to read a dummy doc to test connectivity and permission rules
        await getDoc(doc(db, "system_check", "connectivity_test"));
        return { success: true, message: "Connection successful! Firestore is reachable." };
    } catch (error: any) {
        console.error("Test Connection Error:", error);
        let msg = error.message;
        if (msg.includes("permission-denied")) msg = "Permission Denied. Go to Firebase Console > Firestore > Rules and set 'allow read, write: if true;' for testing.";
        if (msg.includes("configuration")) msg = "Invalid Configuration. Please check your API Key and Project ID.";
        return { success: false, message: "Connection Failed: " + msg };
    }
};

export const syncToCloud = async (config: FirebaseConfig): Promise<{success: boolean, message: string}> => {
  try {
    const database = await getDb(config);
    const data: Record<string, any> = {};
    
    // Define crucial keys to backup
    const specificKeys = [
        'app_settings', 'app_branding', 'corporate_accounts', 
        'staff_data', 'leads_data', 'vendor_data', 'tasks_data', 
        'office_expenses', 'reception_recent_transfers', 'leave_history',
        'admin_sidebar_order', 'smtp_config', 'global_enquiries_data'
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

    // 3. Save to Firestore
    await setDoc(doc(database, "ok_boz_system", "global_backup"), {
        timestamp: new Date().toISOString(),
        data: data
    });
    
    return { success: true, message: "Sync Successful! Data saved to Cloud." };
  } catch (error: any) {
    console.error("Sync Error:", error);
    let msg = error.message;
    if (msg.includes("permission-denied")) msg = "Permission Denied. Check Firestore Rules.";
    return { success: false, message: "Sync Failed: " + msg };
  }
};

export const restoreFromCloud = async (config: FirebaseConfig): Promise<{success: boolean, message: string}> => {
  try {
    const database = await getDb(config);
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
          return { success: true, message: "Restored Successfully! Reloading..." };
      }
      return { success: false, message: "Backup file is empty." };
    } else {
      return { success: false, message: "No backup found in Cloud Database." };
    }
  } catch (error: any) {
    console.error("Restore Error:", error);
    return { success: false, message: "Restore Failed: " + error.message };
  }
};
