import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { auth } from "../firebase-config.js";
const btn = document.getElementById('btnRegistar');
btn.addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        showGeniiToast("Sucesso! Utilizador criado com ID: " + user.uid, "success");
    } catch (error) {
        const errorCode = error.code;
        const errorMessage = error.message;
        showGeniiToast("Erro: " + errorMessage, "error");
    }
});
