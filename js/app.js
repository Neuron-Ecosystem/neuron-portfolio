import { initAuthListener, validateInvite, registerWithInvite, login, logout, getCurrentUser } from './auth.js';
import { getFeed, createAchievement, updateStatus, deleteAchievement, getAllUsers, toggleUserActive, getAchievementBySlug } from './db.js';
import { handleRoute, navigate } from './router.js';

// --- 1. ИНИЦИАЛИЗАЦИЯ И СЛУШАТЕЛИ ---
window.addEventListener('load', () => {
    initAuthListener((user) => {
        updateNavigation(user);
        handleRoute();
    });
    window.addEventListener('hashchange', handleRoute);
});

document.addEventListener('click', (e) => {
    if (e.target.closest('#logoutBtn')) {
        if (confirm('Выйти из системы?')) logout();
    }
});

const wrap = (content) => `<div class="page-transition">${content}</div>`;

// Функция копирования ссылки
async function shareAchievement(slug) {
    const fullUrl = `${window.location.origin}${window.location.pathname}#/${slug}`;
    try {
        await navigator.clipboard.writeText(fullUrl);
        alert("Ссылка скопирована в буфер обмена!");
    } catch (e) {
        alert("Ошибка при копировании");
    }
}

// Обновление меню
export function updateNavigation(user) {
    const mainNav = document.getElementById('mainNav');
    if (!user) {
        if (mainNav) mainNav.classList.add('hidden');
        return;
    }
    if (mainNav) mainNav.classList.remove('hidden');
    
    const adminLink = document.querySelector('a[href="#admin"]');
    const usersLink = document.querySelector('a[href="#users"]');
    
    if (adminLink) adminLink.style.display = (user.role === 'admin' || user.role === 'moder') ? 'inline-block' : 'none';
    if (usersLink) usersLink.style.display = (user.role === 'admin') ? 'inline-block' : 'none';
}

// --- 2. ЛЕНТА И ПРОФИЛИ ---

export async function renderFeed(container) {
    container.innerHTML = wrap(`<h1>Лента достижений</h1><div id="fG" class="grid"></div>`);
    const achs = await getFeed();
    const user = getCurrentUser();
    const grid = document.getElementById('fG');

    achs.forEach(ach => {
        // Показываем только одобренные, либо свои (даже если на проверке)
        if (ach.status !== 'approved' && ach.userId !== user?.uid && user?.role !== 'admin') return;

        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <div class="card-body">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px">
                    <div class="card-title">${ach.title}</div>
                    ${ach.slug ? `<button class="share-btn" data-slug="${ach.slug}"><span class="material-icons-round" style="font-size:16px">share</span></button>` : ''}
                </div>
                <p class="meta">${ach.userName} | ${ach.result}</p>
                <div class="card-desc">${ach.description || 'Нет описания'}</div>
                <div style="margin-top:10px"><span class="badge ${ach.status}">${ach.status}</span></div>
            </div>
        `;

        const sBtn = div.querySelector('.share-btn');
        if (sBtn) sBtn.onclick = (e) => { e.stopPropagation(); shareAchievement(ach.slug); };
        
        div.onclick = () => openDetailsModal(ach);
        grid.appendChild(div);
    });
}

export async function renderProfile(container, user) {
    container.innerHTML = wrap(`
        <div style="display:flex; justify-content:space-between; align-items:center">
            <h1>Мой кабинет</h1>
            <button id="addBtn" class="btn btn-primary">+ Добавить</button>
        </div>
        <div class="card" style="margin:20px 0; cursor:default; border-left:4px solid var(--primary)">
            <b>${user.firstName} ${user.lastName}</b>
            <p class="meta">${user.class.grade}${user.class.letter} класс</p>
        </div>
        <div id="myGrid" class="grid"></div>
    `);

    document.getElementById('addBtn').onclick = () => openAddModal(user);
    const all = await getFeed();
    const my = all.filter(a => a.userId === user.uid);
    const grid = document.getElementById('myGrid');

    my.forEach(ach => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <div class="card-body">
                <span class="badge ${ach.status}">${ach.status}</span>
                <div class="card-title" style="margin-top:10px">${ach.title}</div>
                <p class="meta">${ach.result}</p>
            </div>
        `;
        div.onclick = () => openDetailsModal(ach);
        grid.appendChild(div);
    });
}

// --- 3. ПУБЛИЧНАЯ СТРАНИЦА (ДЛЯ УЧИТЕЛЕЙ) ---

export function renderSingleAchievement(container, ach) {
    container.innerHTML = wrap(`
        <div style="max-width:800px; margin: 0 auto;">
            <button onclick="location.hash='home'" class="btn" style="margin-bottom:20px; background:#334155; color:white">← На главную</button>
            <div class="card" style="cursor:default">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; gap:20px">
                    <h1 style="color:var(--primary)">${ach.title}</h1>
                    <button class="share-btn" id="sBtnSingle" style="padding:10px 20px"><span class="material-icons-round">share</span> Поделиться</button>
                </div>
                <p class="meta">${ach.userName} | ${ach.userClass} класс</p>
                <div style="margin:20px 0; font-weight:700; color:var(--accent); font-size:1.2rem">${ach.result.toUpperCase()}</div>
                <p style="white-space:pre-wrap; background:rgba(255,255,255,0.03); padding:20px; border-radius:12px">${ach.description || 'Описание отсутствует'}</p>
                <div class="docs-grid" style="margin-top:20px">
                    ${ach.documents?.map(d => `<img src="${d.url}" class="modal-img" style="height:250px">`).join('')}
                </div>
            </div>
        </div>
    `);
    document.getElementById('sBtnSingle').onclick = () => shareAchievement(ach.slug);
    initLightbox();
}

// --- 4. МОДАЛЬНЫЕ ОКНА ---

function openDetailsModal(ach) {
    const modal = document.getElementById('modal');
    modal.classList.remove('hidden');

    // Меняем адресную строку без перезагрузки
    if (ach.slug) window.history.pushState(null, '', `/#/${ach.slug}`);

    document.getElementById('modalBody').innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; gap:10px">
            <h2 style="color:var(--primary); padding-right:40px">${ach.title}</h2>
            ${ach.slug ? `<button id="mShare" class="share-btn"><span class="material-icons-round">share</span></button>` : ''}
        </div>
        <p class="meta">${ach.userName} | ${ach.result}</p>
        <div style="margin:20px 0; white-space:pre-wrap">${ach.description || ''}</div>
        <div class="docs-grid">${ach.documents?.map(d => `<img src="${d.url}" class="modal-img">`).join('')}</div>
        ${getCurrentUser()?.role === 'admin' ? `<button id="delBtn" class="btn btn-danger" style="width:100%; margin-top:20px">Удалить</button>` : ''}
    `;

    if (ach.slug) document.getElementById('mShare').onclick = () => shareAchievement(ach.slug);
    
    initLightbox();

    if (document.getElementById('delBtn')) {
        document.getElementById('delBtn').onclick = async () => {
            if (confirm('Удалить?')) {
                await deleteAchievement(ach.id);
                modal.classList.add('hidden');
                handleRoute();
            }
        };
    }

    document.getElementById('closeModal').onclick = () => {
        modal.classList.add('hidden');
        window.history.pushState(null, '', `/#/home`);
    };
}

function openAddModal(user) {
    const modal = document.getElementById('modal');
    modal.classList.remove('hidden');
    document.getElementById('modalBody').innerHTML = `
        <h2>Новое достижение</h2>
        <input type="text" id="aTitle" class="input-field" placeholder="Название">
        <select id="aResult" class="input-field">
            <option>участник</option><option>призёр</option><option>победитель</option>
        </select>
        <select id="aLevel" class="input-field">
            <option>школьный</option><option>районный</option><option>региональный</option><option>всероссийский</option>
        </select>
        <textarea id="aDesc" class="input-field" placeholder="Описание" style="height:100px"></textarea>
        <input type="file" id="aFiles" multiple accept="image/*" class="input-field">
        <button id="sendBtn" class="btn btn-primary" style="width:100%">Отправить</button>
    `;

    document.getElementById('sendBtn').onclick = async () => {
        const title = document.getElementById('aTitle').value;
        const files = document.getElementById('aFiles').files;
        if (!title || files.length === 0) return alert('Заполните данные!');

        const btn = document.getElementById('sendBtn');
        btn.disabled = true; btn.innerText = 'Загрузка...';

        try {
            await createAchievement({
                title, result: document.getElementById('aResult').value,
                level: document.getElementById('aLevel').value,
                description: document.getElementById('aDesc').value,
                userId: user.uid,
                userName: `${user.firstName} ${user.lastName}`,
                userClass: `${user.class.grade}${user.class.letter}`,
                status: 'pending'
            }, files);
            modal.classList.add('hidden');
            handleRoute();
        } catch (e) { alert(e.message); btn.disabled = false; }
    };
    document.getElementById('closeModal').onclick = () => modal.classList.add('hidden');
}

// --- 5. ПРОСМОТР ФОТО (LIGHTBOX) ---
function initLightbox() {
    document.querySelectorAll('.modal-img').forEach(img => {
        img.onclick = () => {
            const lb = document.createElement('div');
            lb.className = 'lightbox';
            lb.innerHTML = `<img src="${img.src}">`;
            lb.onclick = () => lb.remove();
            document.body.appendChild(lb);
        };
    });
}

// --- 6. МОДЕРАЦИЯ И АВТОРИЗАЦИЯ ---

export async function renderAdmin(container) {
    container.innerHTML = wrap(`<h1>Модерация</h1><div id="aQ" class="grid"></div>`);
    const achs = await getFeed();
    const pending = achs.filter(a => a.status === 'pending');

    pending.forEach(item => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <div class="card-body">
                <b>${item.userName} (${item.userClass})</b>
                <p>${item.title}</p>
                <button class="btn btn-primary ok-btn" style="margin-top:10px; width:100%">Одобрить и создать ссылку</button>
            </div>
        `;
        div.querySelector('.ok-btn').onclick = async (e) => {
            e.stopPropagation();
            const slug = prompt("Придумайте URL (только английские буквы и тире):", item.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
            if (!slug) return;
            await updateStatus(item.id, 'approved', getCurrentUser().lastName, slug);
            renderAdmin(container);
        };
        div.onclick = () => openDetailsModal(item);
        document.getElementById('aQ').appendChild(div);
    });
}

export function renderLogin(container) {
    container.innerHTML = wrap(`
        <div class="auth-container">
            <h2>Вход</h2>
            <input type="email" id="lE" class="input-field" placeholder="Email">
            <input type="password" id="lP" class="input-field" placeholder="Пароль">
            <button id="lBtn" class="btn btn-primary" style="width:100%">Войти</button>
            <p style="margin-top:15px; font-size:0.8rem">Нет аккаунта? <a href="#invite">Инвайт</a></p>
        </div>
    `);
    document.getElementById('lBtn').onclick = async () => {
        try { await login(document.getElementById('lE').value, document.getElementById('lP').value); } 
        catch(e) { alert("Ошибка входа"); }
    };
}

export function renderInvite(container) {
    container.innerHTML = wrap(`
        <div class="auth-container">
            <h2>Активация инвайта</h2>
            <input type="text" id="iC" class="input-field" placeholder="Код">
            <button id="iBtn" class="btn btn-primary" style="width:100%">Проверить</button>
            <div id="regF" class="hidden" style="margin-top:20px">
                <input type="email" id="rE" class="input-field" placeholder="Новый Email">
                <input type="password" id="rP" class="input-field" placeholder="Пароль">
                <button id="rBtn" class="btn btn-primary" style="width:100%">Создать профиль</button>
            </div>
        </div>
    `);
    const iBtn = document.getElementById('iBtn');
    iBtn.onclick = async () => {
        const code = document.getElementById('iC').value;
        try {
            const data = await validateInvite(code);
            document.getElementById('regF').classList.remove('hidden');
            iBtn.style.display = 'none';
            document.getElementById('rBtn').onclick = async () => {
                await registerWithInvite(document.getElementById('rE').value, document.getElementById('rP').value, code, data);
            };
        } catch(e) { alert(e.message); }
    };
}

export async function renderUsersAdmin(container) {
    container.innerHTML = wrap(`<h1>Пользователи</h1><div id="uL" class="grid"></div>`);
    const users = await getAllUsers();
    users.forEach(u => {
        if (u.uid === getCurrentUser().uid) return;
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <b>${u.firstName} ${u.lastName}</b>
            <p class="meta">${u.role}</p>
            <button class="btn t-btn" style="width:100%; margin-top:10px; background:${u.isActive ? 'var(--danger)' : 'var(--success)'}; color:white">
                ${u.isActive ? 'Блокировать' : 'Разблокировать'}
            </button>
        `;
        div.querySelector('.t-btn').onclick = async () => {
            await toggleUserActive(u.uid, u.isActive);
            renderUsersAdmin(container);
        };
        document.getElementById('uL').appendChild(div);
    });
}

export async function renderUserProfile(container, userId) {
    const all = await getFeed();
    const userAchs = all.filter(a => a.userId === userId && a.status === 'approved');
    container.innerHTML = wrap(`
        <button onclick="window.history.back()" class="btn" style="margin-bottom:20px">← Назад</button>
        <div id="uGrid" class="grid"></div>
    `);
    userAchs.forEach(ach => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `<div class="card-title">${ach.title}</div><p class="meta">${ach.result}</p>`;
        div.onclick = () => openDetailsModal(ach);
        document.getElementById('uGrid').appendChild(div);
    });
}
