// 1. Vai a https://console.firebase.google.com/
// 2. Cria um projeto (ou usa um existente)
// 3. Ativa Authentication (Email/Password + Google)
// 4. Ativa Firestore Database
// 5. Ativa Realtime Database
// 6. Regista uma app Web
// 7. Copia o objeto firebaseConfig que aparece
// 8. Cola aqui, substituindo os placeholders

const firebaseConfig = {
  apiKey: "AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  authDomain: "teu-projeto.firebaseapp.com",
  databaseURL: "https://teu-projeto-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "teu-projeto",
  storageBucket: "teu-projeto.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890abcdef",
  measurementId: "G-XXXXXXXXXX"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
