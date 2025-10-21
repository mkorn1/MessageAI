import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA2-sDot9LwWp1EBDpN4OuyzmVY5f5D4Sw",
  authDomain: "messageai-d518c.firebaseapp.com",
  projectId: "messageai-d518c",
  storageBucket: "messageai-d518c.firebasestorage.app",
  messagingSenderId: "924406206081",
  appId: "1:924406206081:web:d7362359b37a128a1ac780",
  databaseURL: "https://messageai-d518c-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const db = getFirestore(app);
const authService = getAuth(app);
const storageService = getStorage(app);

export { authService, db, storageService };
export default app;