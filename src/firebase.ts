// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB4DlbCmB2a-pg_mNQPphx7pGRN3erZskM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "service-request-2e06e.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "service-request-2e06e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "service-request-2e06e.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1857073292",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1857073292:web:fa0d3fbfe5f533b4414ba9"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
// Initializes storage using default bucket settings from configuration
export const storage = getStorage(app);
