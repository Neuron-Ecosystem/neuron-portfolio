import { db } from './config.js';
import { collection, addDoc, getDocs, query, orderBy, updateDoc, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// API Key ImgBB
const IMGBB_KEY = "8f79008cc1cf4284a58a0a54f2988f23";

/**
 * Загрузка файла на ImgBB
 * @param {File} file 
 */
export async function uploadFile(file) {
    // Валидация типа на клиенте (ImgBB не ест PDF)
    if (!file.type.startsWith('image/')) {
        throw new Error(`Файл ${file.name} не является изображением. ImgBB принимает только картинки.`);
    }

    const formData = new FormData();
    formData.append("image", file);

    try {
        // Выполняем POST запрос к API
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
            method: "POST",
            body: formData
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error("Ошибка загрузки на ImgBB: " + (result.error ? result.error.message : "Неизвестная ошибка"));
        }

        // Возвращаем структуру, совместимую с нашим приложением
        return {
            name: file.name, // Оригинальное имя
            url: result.data.url, // Прямая ссылка на картинку
            thumbUrl: result.data.thumb.url, // Превью (можно использовать в ленте)
            deleteUrl: result.data.delete_url, // Ссылка для удаления (сохраняем на будущее)
            type: file.type
        };

    } catch (error) {
        console.error("Upload failed:", error);
        throw error;
    }
}

// --- Остальные функции (Create, Read, Update, Delete) остаются без изменений, 
// так как они работают с Firestore, а не с файлами напрямую ---

export async function createAchievement(data, files) {
    const docRef = await addDoc(collection(db, "achievements"), {
        ...data,
        documents: [],
        createdAt: serverTimestamp()
    });

    const uploadedDocs = [];
    // Загружаем файлы последовательно
    for (const file of files) {
        try {
            const docData = await uploadFile(file);
            uploadedDocs.push(docData);
        } catch (e) {
            console.error(`Не удалось загрузить ${file.name}:`, e.message);
            alert(`Ошибка: ${e.message}`); // Уведомляем пользователя
        }
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
    // Примечание: Мы не можем автоматически удалить картинку с ImgBB через API без сложной логики парсинга delete_url.
    // Файлы останутся на хостинге ImgBB, но исчезнут из приложения.
}
