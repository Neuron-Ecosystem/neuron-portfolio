import { auth, db } from './config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

let currentUserProfile = null;

// Проверка инвайта
export async function validateInvite(code) {
    const inviteRef = doc(db, "invite_codes", code);
    const snap = await getDoc(inviteRef);
    
    if (!snap.exists()) throw new Error("Инвайт-код не найден");
    const data = snap.data();
    if (data.isUsed) throw new Error("Этот код уже использован");
    
    return data;
}

// Регистрация с использованием данных инвайта
export async function registerWithInvite(email, password, inviteCode, inviteData) {
    // 1. Создаем Auth User
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // 2. Создаем профиль в Firestore
    const userProfile = {
        uid: uid,
        email: email,
        role: inviteData.role,
        firstName: inviteData.firstName,
        lastName: inviteData.lastName,
        class: inviteData.class,
        isActive: true,
        createdAt: serverTimestamp(),
        inviteCode: inviteCode
    };

    await setDoc(doc(db, "users", uid), userProfile);

    // 3. Помечаем инвайт как использованный
    await updateDoc(doc(db, "invite_codes", inviteCode), {
        isUsed: true,
        usedAt: serverTimestamp(),
        usedByUid: uid
    });

    return userProfile;
}

export async function login(email, password) {
    await signInWithEmailAndPassword(auth, email, password);
}

export async function logout() {
    await signOut(auth);
    window.location.reload();
}

// Слушатель состояния
export function initAuthListener(callback) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const snap = await getDoc(doc(db, "users", user.uid));
            if (snap.exists()) {
                currentUserProfile = snap.data();
                if (!currentUserProfile.isActive) {
                    alert("Ваш аккаунт заблокирован администратором");
                    await signOut(auth);
                    callback(null);
                    return;
                }
            }
        } else {
            currentUserProfile = null;
        }
        callback(currentUserProfile);
    });
}

export const getCurrentUser = () => currentUserProfile;
