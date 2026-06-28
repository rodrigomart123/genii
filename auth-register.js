import { createUserWithEmailAndPassword, updateProfile, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";
import { saveUserToCache } from "./static/js/components.js";
const GOOGLE_SVG = '<svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
const googleProvider = new GoogleAuthProvider();
const unsub = onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = "join.html";
    }
    unsub();
});
const form = document.getElementById('registerForm');
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('btnRegistar');
    try {
        btn.innerText = "A criar conta...";
        btn.disabled = true;
        const usernameDoc = await getDoc(doc(db, "usernames", username.toLowerCase()));
        if (usernameDoc.exists()) {
            showGeniiToast("Esse nome de utilizador já está em uso.", "error");
            btn.innerText = "Começar Agora";
            btn.disabled = false;
            return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await updateProfile(user, { displayName: username });
        const userData = {
            username: username,
            email: email,
            createdAt: new Date(),
            xp: 0,
            totalXp: 0,
            level: 1,
            displayName: username,
            uid: user.uid,
            profileType: 'photo',
            customPhotoUrl: 'static/img/default-genii.png',
            avatar: { skin: "001", face: "001", hat: "none" },
            stats: {
                gamesPlayed: 0,
                quizzesMastered: 0,
                currentStreak: 0,
                longestStreak: 0,
                activeDays: 0,
                lastActiveDate: ''
            },
            dailyMissions: {
                date: '',
                missions: {}
            },
            credits: {
                remaining: 100,
                maxDaily: 100,
                lastResetDate: new Date().toISOString().slice(0, 10)
            }
        };
        await setDoc(doc(db, "users", user.uid), userData);
        await setDoc(doc(db, "usernames", username.toLowerCase()), { email: email });
        saveUserToCache(userData);
        showGeniiToast("Conta criada com sucesso! A entrar...", "success");
        setTimeout(() => window.location.href = "join.html", 1500);
    } catch (error) {
        console.error(error);
        let msg = "Erro ao criar conta.";
        if(error.code === 'auth/email-already-in-use') msg = "Este email já está a ser usado.";
        if(error.code === 'auth/weak-password') msg = "A senha é muito fraca (mínimo 6 caracteres).";
        showGeniiToast(msg, "error");
        btn.innerText = "Criar conta";
        btn.disabled = false;
    }
});
window.handleGoogleLogin = async function () {
    const btn = document.getElementById('btnGoogle');
    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A entrar...';
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (!docSnap.exists()) {
            let username = user.displayName || user.email.split('@')[0];
            let attempts = 0;
            let baseUsername = username;
            while (attempts < 100) {
                const check = await getDoc(doc(db, "usernames", username.toLowerCase()));
                if (!check.exists()) break;
                attempts++;
                username = baseUsername + Math.floor(Math.random() * 9000 + 1000);
            }
            const userData = {
                username: username,
                email: user.email,
                createdAt: new Date(),
                xp: 0, totalXp: 0, level: 1,
                displayName: username,
                uid: user.uid,
                profileType: 'photo',
                customPhotoUrl: user.photoURL || 'static/img/default-genii.png',
                avatar: { skin: "001", face: "001", hat: "none" },
                stats: { gamesPlayed: 0, quizzesMastered: 0, currentStreak: 0, longestStreak: 0, activeDays: 0, lastActiveDate: '' },
                dailyMissions: { date: '', missions: {} },
                credits: { remaining: 100, maxDaily: 100, lastResetDate: new Date().toISOString().slice(0, 10) }
            };
            await setDoc(doc(db, "users", user.uid), userData);
            await setDoc(doc(db, "usernames", username.toLowerCase()), { email: user.email });
            saveUserToCache(userData);
            showGeniiToast("Conta criada com sucesso! A entrar...", "success");
        } else {
            const d = docSnap.data();
            const userData = {
                ...d,
                uid: user.uid,
                displayName: d.displayName || d.username || user.displayName || user.email.split('@')[0],
            };
            saveUserToCache(userData);
        }
        setTimeout(() => window.location.href = "join.html", docSnap.exists() ? 0 : 1500);
    } catch (error) {
        console.error(error);
        if (error.code !== 'auth/popup-closed-by-user') {
            showGeniiToast("Erro ao entrar com o Google.", "error");
        }
        btn.disabled = false;
        btn.innerHTML = GOOGLE_SVG + ' Continuar com o Google';
    }
};