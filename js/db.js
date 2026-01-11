import { db } from './config.js';
import { 
    collection, addDoc, getDocs, query, orderBy, 
    updateDoc, deleteDoc, doc, serverTimestamp, getDoc 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const IMGBB_KEY = "8f79008cc1cf4284a58a0a54f2988f23";

export async function uploadFile(file) {
    if (!file.type.startsWith('image/')) {
        throw new Error(`Файл ${file.name} не является изображением.`);
    }
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
        method: "POST",
        body: formData
    });
    const result = await response.json();
    if (!result.success) throw new Error("Ошибка ImgBB");
    return { name: file.name, url: result.data.url };
}

export async function createAchievement(data, files) {
    const docRef = await addDoc(collection(db, "achievements"), {
        ...data,
        documents: [],
        createdAt: serverTimestamp()
    });
    const uploadedDocs = [];
    for (const file of files) {
        const docData = await uploadFile(file);
        uploadedDocs.push(docData);
    }
    await updateDoc(docRef, { documents: uploadedDocs });
}

export async function getFeed() {
    const q = query(collection(db, "achievements"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({id: d.id, ...d.data()}));
}

export async function updateStatus(id, status, adminName) {
    await updateDoc(doc(db, "achievements", id), {
        status: status,
        approvedBy: adminName
    });
}

export async function deleteAchievement(id) {
    await deleteDoc(doc(db, "achievements", id));
}

// --- НОВЫЕ ФУНКЦИИ ДЛЯ УПРАВЛЕНИЯ ПОЛЬЗОВАТЕЛЯМИ ---

export async function getAllUsers() {
    const snapshot = await getDocs(collection(db, "users"));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function toggleUserActive(uid, currentStatus) {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, { isActive: !currentStatus });
}
