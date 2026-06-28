import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { auth, db } from "../../firebase-config.js";
import { saveUserToCache } from "./components.js";
import { updateStreak } from "./gamification.js";
import { progressMission } from "./daily-missions.js";
const GOOGLE_SVG = '<svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
const googleProvider = new GoogleAuthProvider();
const unsub = onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = "join.html";
    }
    unsub();
});
const form = document.getElementById('loginForm');
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btn = document.getElementById('btnLogin');
    try {
        btn.innerText = "A entrar...";
        btn.disabled = true;
        let email = input;
        if (!input.includes('@')) {
            try {
                const usernameDoc = await getDoc(doc(db, "usernames", input.toLowerCase()));
                if (!usernameDoc.exists()) {
                    window.showGeniiToast?.("Utilizador não encontrado.", "error");
                    btn.innerText = "Entrar";
                    btn.disabled = false;
                    return;
                }
                email = usernameDoc.data().email;
            } catch (e) {
                console.error("Erro ao resolver username:", e);
                window.showGeniiToast?.("Erro ao verificar utilizador.", "error");
                btn.innerText = "Entrar";
                btn.disabled = false;
                return;
            }
        }
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        try {
            const docSnap = await getDoc(doc(db, "users", user.uid));
            if (docSnap.exists()) {
                const userData = {
                    ...docSnap.data(),
                    displayName: docSnap.data().username || user.displayName || user.email.split('@')[0],
                    uid: user.uid,
                };
                saveUserToCache(userData);
            }
        } catch (e) { console.error("Cache pre-fetch error:", e); }
        try {
            const streakResult = await updateStreak(user.uid);
            if (streakResult.isNewDay) {
                await progressMission(user.uid, 'daily_login');
            }
        } catch (e) {
            console.error("Erro ao atualizar streak:", e);
        }
        window.location.href = "join.html";
    } catch (error) {
        console.error(error);
        if (window.showGeniiToast) {
            let msg = "Erro no login: Verifique o email e a senha.";
            if(error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
                msg = "Email ou palavra-passe incorretos. Se entrou com o Google, use esse botão.";
            }
            window.showGeniiToast(msg, "error");
        } else {
            alert("Erro no login: Verifique o email e a senha.");
        }
    }
    btn.innerText = "Entrar";
    btn.disabled = false;
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
            let name = user.displayName || user.email.split('@')[0];
            let attempts = 0;
            let baseName = name;
            while (attempts < 100) {
                const check = await getDoc(doc(db, "usernames", name.toLowerCase()));
                if (!check.exists()) break;
                attempts++;
                name = baseName + Math.floor(Math.random() * 9000 + 1000);
            }
            const userData = {
                username: name,
                email: user.email,
                createdAt: new Date(),
                xp: 0, totalXp: 0, level: 1,
                displayName: name,
                uid: user.uid,
                profileType: 'photo',
                customPhotoUrl: user.photoURL || 'static/img/default-genii.png',
                avatar: { skin: "001", face: "001", hat: "none" },
                stats: { gamesPlayed: 0, quizzesMastered: 0, currentStreak: 0, longestStreak: 0, activeDays: 0, lastActiveDate: '' },
                dailyMissions: { date: '', missions: {} },
                credits: { remaining: 100, maxDaily: 100, lastResetDate: new Date().toISOString().slice(0, 10) }
            };
            await setDoc(doc(db, "users", user.uid), userData);
            await setDoc(doc(db, "usernames", name.toLowerCase()), { email: user.email });
            saveUserToCache(userData);
        } else {
            const d = docSnap.data();
            const userData = {
                ...d,
                uid: user.uid,
                displayName: d.displayName || d.username || user.displayName || user.email.split('@')[0],
            };
            saveUserToCache(userData);
        }
        try {
            const streakResult = await updateStreak(user.uid);
            if (streakResult.isNewDay) await progressMission(user.uid, 'daily_login');
        } catch (e) { console.error("Erro streak:", e); }
        window.location.href = "join.html";
    } catch (error) {
        console.error(error);
        if (error.code !== 'auth/popup-closed-by-user') {
            window.showGeniiToast?.("Erro ao entrar com o Google.", "error");
        }
        btn.disabled = false;
        btn.innerHTML = GOOGLE_SVG + ' Continuar com o Google';
    }
};
