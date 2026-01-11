import { db } from './config.js';
import { 
    collection, addDoc, getDocs, query, orderBy, 
    updateDoc, deleteDoc, doc, serverTimestamp, getDoc, where 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const IMGBB_KEY = "8f79008cc1cf4284a58a0a54f2988f23";

export async function uploadFile(file) {
    if (!file.type.startsWith('image/')) throw new Error(`Файл ${file.name} не изображение.`);
    const formData = new FormData();
    formData.append("image", file);
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: "POST", body: formData });
    const result = await response.json();
    if (!result.success) throw new Error("Ошибка ImgBB");
    return { name: file.name, url: result.data.url };
}

export async function createAchievement(data, files) {
    const docRef = await addDoc(collection(db, "achievements"), { ...data, documents: [], createdAt: serverTimestamp() });
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

// Поиск по slug для публичных ссылок
export async function getAchievementBySlug(slug) {
    const q = query(collection(db, "achievements"), where("slug", "==", slug));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
}

export async function updateStatus(id, status, adminName, slug = null) {
    const data = { status, approvedBy: adminName };
    if (slug) data.slug = slug;
    await updateDoc(doc(db, "achievements", id), data);
}

export async function deleteAchievement(id) {
    await deleteDoc(doc(db, "achievements", id));
}

export async function getAllUsers() {
    const snapshot = await getDocs(collection(db, "users"));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function toggleUserActive(uid, currentStatus) {
    await updateDoc(doc(db, "users", uid), { isActive: !currentStatus });
}
