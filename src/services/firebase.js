import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStoredConfig } from '../utils/helpers';

let app = null;
let auth = null;
let db = null;

const config = getStoredConfig();

if (config && config.apiKey && config.projectId) {
  try {
    app = initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    console.error("Firebase Initialization Error:", e);
    // If init fails (e.g. bad config), we leave auth/db as null
    // This triggers the "Welcome/Setup" screen in App.jsx
  }
} else {
  console.log("No Firebase Config found. App is in Setup Mode.");
}

export { app, auth, db };
