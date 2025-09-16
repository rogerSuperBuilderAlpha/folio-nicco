import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB05bWPL6KUzFeIknSTY8f49js7NlkcK9g",
  authDomain: "hour-college.firebaseapp.com",
  databaseURL: "https://hour-college-default-rtdb.firebaseio.com",
  projectId: "hour-college",
  storageBucket: "hour-college.firebasestorage.app",
  messagingSenderId: "347195886512",
  appId: "1:347195886512:web:528f453a6bdae685eca475",
  measurementId: "G-SM6CBXV8QE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services - ALWAYS use folio-nicco database
export const auth = getAuth(app);
export const db = getFirestore(app, 'folio-nicco');
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Initialize Analytics (only in browser)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Using production Firebase services

export default app;
