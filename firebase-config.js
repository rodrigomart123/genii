import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
const firebaseConfig = {
  apiKey: "AIzaSyBUUbcU2Th3nyxZ9HzGroPqZcPkTMWuTls",
  authDomain: "playgenii.firebaseapp.com",
  databaseURL: "https://playgenii-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "playgenii",
  storageBucket: "playgenii.firebasestorage.app",
  messagingSenderId: "194862659575",
  appId: "1:194862659575:web:df4ea25ec08df9d5d760f2",
  measurementId: "G-ZX626P2KRM"
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);