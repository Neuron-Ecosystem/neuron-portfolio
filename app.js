import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// === CONFIGURATION ===
const firebaseConfig = {
    apiKey: "AIzaSyBIkhWk34e7LZS7EqfmeK31bahBm8if28c",
    authDomain: "neuron-portfolio-2026.firebaseapp.com",
    projectId: "neuron-portfolio-2026",
    storageBucket: "neuron-portfolio-2026.firebasestorage.app",
    messagingSenderId: "688199450932",
    appId: "1:688199450932:web:f69ffc4bf901d67e392561",
    measurementId: "G-C52KLDJRXP"
};

// ImgBB Config
const IMGBB_API_KEY = "8f79008cc1cf4284a58a0a54f2988f23";

// === INIT ===
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentUser = null; // Global state for the session

// === DOM ELEMENTS ===
const loginCard = document.getElementById('login-card');
const dashboard = document.getElementById('dashboard');
const checkBtn = document.getElementById('checkBtn');
const inviteInput = document.getElementById('inviteInput');
const loginMsg = document.getElementById('loginMsg');

// === CORE FUNCTIONS ===

// 1. Auth & Data Fetching
checkBtn.onclick = async () => {
    const code = inviteInput.value.trim();
    if (!code) return;

    checkBtn.innerText = "VERIFYING...";
    
    try {
        const docRef = doc(db, "invites", code);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            currentUser = { id: code, ...docSnap.data() };
            initDashboard(currentUser);
        } else {
            showError("ACCESS DENIED: INVALID CODE");
        }
    } catch (e) {
        console.error(e);
        showError("CONNECTION ERROR");
    } finally {
        checkBtn.innerText = "CONNECT";
    }
};

function showError(msg) {
    loginMsg.style.display = 'block';
    loginMsg.innerText = msg;
    // Shake animation
    loginCard.style.transform = "translate(-52%, -50%)";
    setTimeout(() => loginCard.style.transform = "translate(-50%, -50%)", 100);
}

// 2. UI Rendering
function initDashboard(user) {
    // Hide Login, Show Dashboard
    loginCard.style.opacity = '0';
    setTimeout(() => {
        loginCard.style.display = 'none';
        dashboard.style.display = 'grid'; // Grid layout
    }, 500);

    // Populate Data
    document.getElementById('u-name').innerText = user.name.toUpperCase();
    document.getElementById('u-status').innerText = (user.status || 'ACTIVE STUDENT').toUpperCase();
    document.getElementById('p-id').innerText = user.id;
    document.getElementById('p-access').innerText = user.accessLevel || 'STUDENT';
    document.getElementById('p-xp').innerText = user.xp || 0;
    
    // Simple Rank Logic
    const xp = user.xp || 0;
    let rank = "NOVICE";
    if (xp > 100) rank = "APPRENTICE";
    if (xp > 500) rank = "EXPERT";
    if (xp > 1000) rank = "ELITE";
    document.getElementById('p-rank').innerText = rank;

    renderFeed(user.achievements || []);
}

function renderFeed(achievements) {
    const container = document.getElementById('achievementFeed');
    container.innerHTML = '';

    if (achievements.length === 0) {
        container.innerHTML = '<div style="opacity:0.5; text-align:center; margin-top:20px;">NO RECORDS FOUND</div>';
        return;
    }

    // Sort by date (assuming date field exists, otherwise keep order)
    achievements.forEach(ach => {
        const div = document.createElement('div');
        div.className = 'achievement-item';
        div.innerHTML = `
            <div>
                <div style="font-weight:bold; color:white;">${ach.title || 'Unknown Achievement'}</div>
                <div style="font-size:0.8rem; color:#aaa;">${ach.date || 'Unknown Date'}</div>
            </div>
            <div style="color:var(--neon-green); font-weight:bold;">+${ach.xp || 0} XP</div>
        `;
        container.appendChild(div);
    });
}

// 3. Image Upload (ImgBB Integration)
document.getElementById('uploadInput').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const statusDiv = document.getElementById('uploadStatus');
    statusDiv.innerText = "UPLOADING TO SECURE STORAGE...";
    statusDiv.style.color = "yellow";

    const formData = new FormData();
    formData.append("image", file);

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: "POST",
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            statusDiv.innerText = "UPLOAD COMPLETE. UPDATING PROFILE...";
            statusDiv.style.color = "#00ff95";
            
            // Save to Firestore (Simulated Achievement)
            const newAchievement = {
                title: "Proof Uploaded: " + file.name,
                date: new Date().toISOString().split('T')[0],
                xp: 10,
                imageUrl: result.data.url
            };

            const userRef = doc(db, "invites", currentUser.id);
            await updateDoc(userRef, {
                xp: (currentUser.xp || 0) + 10,
                achievements: arrayUnion(newAchievement)
            });

            // Update Local UI
            currentUser.xp = (currentUser.xp || 0) + 10;
            if(!currentUser.achievements) currentUser.achievements = [];
            currentUser.achievements.push(newAchievement);
            
            initDashboard(currentUser); // Re-render

        } else {
            throw new Error("ImgBB Failed");
        }
    } catch (err) {
        console.error(err);
        statusDiv.innerText = "UPLOAD FAILED";
        statusDiv.style.color = "red";
    }
};

// 4. Resume Generator (Stub)
document.getElementById('resumeBtn').onclick = () => {
    alert("SYSTEM: Resume generation functionality is initializing...\n(Printing View Mode)");
    window.print();
};
