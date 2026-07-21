import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Enable Firestore offline persistence for faster loading and offline support
enableIndexedDbPersistence(db).catch((err) => {
  console.warn("Firestore offline persistence enablement failed:", err.code);
});


