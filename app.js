import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBIkhWk34e7LZS7EqfmeK31bahBm8if28c",
    authDomain: "neuron-portfolio-2026.firebaseapp.com",
    projectId: "neuron-portfolio-2026",
    storageBucket: "neuron-portfolio-2026.firebasestorage.app",
    messagingSenderId: "688199450932",
    appId: "1:688199450932:web:f69ffc4bf901d67e392561",
    measurementId: "G-C52KLDJRXP"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.getElementById('checkBtn').onclick = async () => {
    const code = document.getElementById('inviteInput').value.trim();
    if (!code) return;

    try {
        const docRef = doc(db, "invites", code);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('inviteInput').style.display = 'none';
            document.getElementById('checkBtn').style.display = 'none';
            const msg = document.getElementById('msg');
            msg.style.display = 'block';
            msg.innerHTML = `ДОСТУП РАЗРЕШЕН<br>ПРИВЕТ, ${data.name.toUpperCase()}<br>СТАТУС: ELITE USER`;
        } else {
            alert("ОШИБКА: КОД НЕ ВЕРЕН");
        }
    } catch (e) {
        console.error(e);
        alert("Ошибка доступа");
    }

};

msg.style.display = 'block';
msg.style.opacity = '0';
setTimeout(() => { msg.style.transition = 'opacity 2s'; msg.style.opacity = '1'; }, 10);
