
// Cloud service disabled for Vercel deployment without Firebase dependency.
// This file is kept as a stub to maintain project structure if needed later.

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export const initFirebase = (config: FirebaseConfig): boolean => {
  console.log("Firebase is disabled in this build.");
  return false;
};

export const syncToCloud = async (config: FirebaseConfig): Promise<{success: boolean, message: string}> => {
  return { success: false, message: "Cloud sync is disabled." };
};

export const restoreFromCloud = async (config: FirebaseConfig): Promise<{success: boolean, message: string}> => {
  return { success: false, message: "Cloud sync is disabled." };
};
