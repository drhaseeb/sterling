import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStoredConfig } from '../utils/helpers';

// Initialize with Stored Config (User's Repo) or Fallback (Demo/Dev)
const config = getStoredConfig() || {
  // Optional: You can put a hardcoded fallback config here for local dev if you want
  apiKey: "PLACEHOLDER", 
  authDomain: "placeholder.firebaseapp.com", 
  projectId: "placeholder"
};

// Initialize Firebase only if config exists to prevent crashes on first load
let app, auth, db;

try {
  app = initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.warn("Firebase not initialized yet. Please configure in Settings.");
}

export { auth, db };
