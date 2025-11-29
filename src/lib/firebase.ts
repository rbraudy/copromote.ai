import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAY3nxOS_ywE6cBT8qUW6E3EjJWG5bqLp0",
    authDomain: "copromote-6d6f5.firebaseapp.com",
    projectId: "copromote-6d6f5",
    storageBucket: "copromote-6d6f5.firebasestorage.app",
    messagingSenderId: "560076833642",
    appId: "1:560076833642:web:127c20f12ebb837a969b13",
    measurementId: "G-RQFRJ772Q7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
