import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your actual Firebase config from Google Cloud Console
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // Get this from Firebase Console Web App
  authDomain: "lexguard-8db81.firebaseapp.com",
  projectId: "lexguard-8db81",
  storageBucket: "lexguard-8db81.appspot.com",
  messagingSenderId: "1027295870533",
  appId: "YOUR_APP_ID" // Get this from Firebase Console Web App
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
export const db = getFirestore(app);
