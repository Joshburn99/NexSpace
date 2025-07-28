import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your Firebase config (from the Firebase Console)
const firebaseConfig = {
  apiKey: "",
  authDomain: "nexspace-59af7.firebaseapp.com",
  projectId: "nexspace-59af7",
  storageBucket: "nexspace-59af7.appspot.com",
  messagingSenderId: "748946115248",
  appId: "1:748946115248:web:4540557823e1681f9f8975",
  measurementId: "G-P5V43LLWWN",
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Export Auth and Firestore instances for use in your app
export const auth = getAuth(app);
export const db = getFirestore(app);
