import { db, storage } from './config.js';
import { collection, addDoc, getDocs, query, where, orderBy, updateDoc, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

// Загрузка файла в Storage
export async function uploadFile(file, achievementId) {
    // Структура: achievements/{id}/documents/filename
    const storageRef = ref(storage, `achievements/${achievementId}/documents/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    return {
        name: file.name,
        url: url,
        type: file.type
    };
}

// Создание достижения
export async function createAchievement(data, files) {
    // Сначала создаем документ, чтобы получить ID
    const docRef = await addDoc(collection(db, "achievements"), {
        ...data,
        documents: [], // пока пусто
        createdAt: serverTimestamp()
    });

    // Загружаем файлы, если есть
    const uploadedDocs = [];
    for (const file of files) {
        try {
            const docData = await uploadFile(file, docRef.id);
            uploadedDocs.push(docData);
        } catch (e) {
            console.error("Ошибка загрузки файла", e);
        }
    }

    // Обновляем документ ссылками
    await updateDoc(docRef, { documents: uploadedDocs });
}

// Получение ленты
export async function getFeed() {
    const q = query(collection(db, "achievements"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({id: d.id, ...d.data()}));
}

// Изменение статуса (Moder/Admin)
export async function updateStatus(id, status, adminName) {
    await updateDoc(doc(db, "achievements", id), {
        status: status,
        approvedBy: adminName
    });
}

// Удаление (Admin)
export async function deleteAchievement(id) {
    await deleteDoc(doc(db, "achievements", id));
    // Примечание: Файлы удаляются через Cloud Function (см. ниже)
}
