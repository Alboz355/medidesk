import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAfT7JsehNwVLPo7VD46FXDo73CAj49cIY",
  authDomain: "gen-lang-client-0261101717.firebaseapp.com",
  projectId: "gen-lang-client-0261101717",
  storageBucket: "gen-lang-client-0261101717.firebasestorage.app",
  messagingSenderId: "792065204404",
  appId: "1:792065204404:web:1b02283e8a9189c11177e1"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();