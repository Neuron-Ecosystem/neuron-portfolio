import { initAuthListener, validateInvite, registerWithInvite, login, logout, getCurrentUser } from './auth.js';
import { getFeed, createAchievement, updateStatus, deleteAchievement, getAllUsers, toggleUserActive, getAchievementBySlug } from './db.js';
import { handleRoute, navigate } from './router.js';

// --- ИНИЦИАЛИЗАЦИЯ ---
window.addEventListener('load', () => {
    initAuthListener((user) => {
        updateNavigation(user);
        handleRoute();
    });
    window.addEventListener('hashchange', handleRoute);
});

// Глобальный слушатель для кнопки выхода
document.addEventListener('click', (e) => {
    if (e.target.closest('#logoutBtn')) {
        if (confirm('Выйти из системы?')) logout();
    }
});

const wrap = (content) => `<div class="page-transition">${content}</div>`;

// Управление навигацией
export function updateNavigation(user) {
    const mainNav = document.getElementById('mainNav');
    const adminLink = document.querySelector('a[href="#admin"]');
    const usersLink = document.querySelector('a[href="#users"]');

    if (!user) {
        if (mainNav) mainNav.classList.add('hidden');
        return;
    }

    if (mainNav) mainNav.classList.remove('hidden');
    if (adminLink) adminLink.style.display = (user.role === 'admin' || user.role === 'moder') ? 'inline-block' : 'none';
    if (usersLink) usersLink.style.display = (user.role === 'admin') ? 'inline-block' : 'none';
}

// --- СТРАНИЦЫ АВТОРИЗАЦИИ ---

export function renderLogin(container) {
    container.innerHTML = wrap(`
        <div class="auth-container">
            <h2>Вход</h2>
            <div class="input-group">
                <label>Email</label>
                <input type="email" id="lEmail" class="input-field">
            </div>
            <div class="input-group">
                <label>Пароль</label>
                <input type="password" id="lPass" class="input-field">
            </div>
            <button id="loginBtn" class="btn btn-primary" style="width:100%">Войти</button>
            <p style="text-align:center; margin-top:15px; font-size:0.8rem">
                Нет аккаунта? <a href="#invite" style="color:var(--primary)">Активировать инвайт</a>
            </p>
        </div>
    `);
    document.getElementById('loginBtn').onclick = async () => {
        try { await login(document.getElementById('lEmail').value, document.getElementById('lPass').value); }
        catch (e) { alert("Ошибка входа: проверьте данные"); }
    };
}

export function renderInvite(container) {
    container.innerHTML = wrap(`
        <div class="auth-container">
            <h2>Активация доступа</h2>
            <div id="inviteStep">
                <div class="input-group">
                    <label>Инвайт-код</label>
                    <input type="text" id="inviteCode" class="input-field" placeholder="Напр: neuron-xxx">
                </div>
                <button id="checkBtn" class="btn btn-primary" style="width:100%">Проверить код</button>
            </div>
            <div id="regForm" class="hidden" style="margin-top:20px; border-top:1px solid #334155; padding-top:20px">
                <p>Привет, <b id="regName" style="color:var(--primary)"></b>!</p>
                <div class="input-group">
                    <label>Email</label>
                    <input type="email" id="regEmail" class="input-field">
                </div>
                <div class="input-group">
                    <label>Пароль</label>
                    <input type="password" id="regPass" class="input-field">
                </div>
                <button id="regBtn" class="btn btn-primary" style="width:100%">Создать аккаунт</button>
            </div>
        </div>
    `);

    document.getElementById('checkBtn').onclick = async () => {
        const code = document.getElementById('inviteCode').value.trim();
        try {
            const data = await validateInvite(code);
            document.getElementById('regName').innerText = data.firstName;
            document.getElementById('inviteStep').style.display = 'none';
            document.getElementById('regForm').classList.remove('hidden');
            document.getElementById('regBtn').onclick = async () => {
                await registerWithInvite(document.getElementById('regEmail').value, document.getElementById('regPass').value, code, data);
            };
        } catch (e) { alert(e.message); }
    };
}

// --- ОСНОВНЫЕ СТРАНИЦЫ КОНТЕНТА ---

export async function renderFeed(container) {
    container.innerHTML = wrap(`<h1>Лента достижений</h1><div id="feedGrid" class="grid"></div>`);
    const achievements = await getFeed();
    const grid = document.getElementById('feedGrid');
    const user = getCurrentUser();

    achievements.forEach(ach => {
        const canSee = ach.status === 'approved' || (user && (user.uid === ach.userId || user.role !== 'people'));
        if (!canSee) return;

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-body">
                <div class="card-header-top">
                    <b class="profile-link" data-uid="${ach.userId}">${ach.userName.toUpperCase()}</b>
                    <span class="meta">${ach.userClass}</span>
                </div>
                <div class="card-title">${ach.title}</div>
                <div class="meta" style="color:var(--primary); font-weight:600; margin-bottom:10px">
                    ${ach.result.toUpperCase()} — ${ach.level}
                </div>
                <div class="card-desc">${ach.description || ''}</div>
                <div style="margin-top:10px"><span class="badge ${ach.status}">${ach.status}</span></div>
            </div>
        `;
        card.querySelector('.profile-link').onclick = (e) => {
            e.stopPropagation();
            navigate(`user/${e.target.dataset.uid}`);
        };
        card.onclick = () => openDetailsModal(ach);
        grid.appendChild(card);
    });
}

export async function renderProfile(container, user) {
    container.innerHTML = wrap(`
        <div style="display:flex; justify-content:space-between; align-items:center">
            <h1>Мой кабинет</h1>
            <button id="addBtn" class="btn btn-primary">+ Добавить</button>
        </div>
        <div class="card" style="margin:20px 0; border-left:4px solid var(--primary)">
            <div class="card-body">
                <b>${user.firstName} ${user.lastName}</b>
                <p class="meta">${user.class.grade}${user.class.letter} | Роль: ${user.role}</p>
            </div>
        </div>
        <div id="myGrid" class="grid"></div>
    `);

    document.getElementById('addBtn').onclick = () => openAddModal(user);
    const all = await getFeed();
    const my = all.filter(a => a.userId === user.uid);
    const grid = document.getElementById('myGrid');

    my.forEach(ach => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<div class="card-body"><span class="badge ${ach.status}">${ach.status}</span><div class="card-title">${ach.title}</div><p class="meta">${ach.result}</p></div>`;
        card.onclick = () => openDetailsModal(ach);
        grid.appendChild(card);
    });
}

// --- ПУБЛИЧНЫЙ ПРОСМОТР (ДЛЯ УЧИТЕЛЕЙ) ---
export function renderSingleAchievement(container, ach) {
    container.innerHTML = wrap(`
        <div style="max-width:800px; margin: 0 auto;">
            <button onclick="location.hash='home'" class="btn" style="margin-bottom:20px">← На главную</button>
            <div class="card" style="cursor:default">
                <div class="card-body">
                    <h1 style="color:var(--primary); word-break:break-word;">${ach.title}</h1>
                    <p class="meta">${ach.userName} | ${ach.userClass}</p>
                    <div style="margin:20px 0; font-weight:700; color:var(--accent)">${ach.result.toUpperCase()} (${ach.level})</div>
                    <p style="white-space:pre-wrap; word-break:break-word; background:rgba(255,255,255,0.03); padding:20px; border-radius:15px;">${ach.description || 'Описание отсутствует'}</p>
                    <div class="docs-grid" style="margin-top:20px">
                        ${ach.documents?.map(d => `<img src="${d.url}" class="modal-img">`).join('')}
                    </div>
                    <div style="margin-top:40px; border-top:1px solid #334155; padding-top:20px">
                        <small>Постоянная ссылка для портфолио:</small><br>
                        <code style="color:var(--primary); font-size:0.8rem">neuron-ecosystem.github.io/neuron-potfolio/#${ach.slug}</code>
                    </div>
                </div>
            </div>
        </div>
    `);
    initLightbox();
}

// --- АДМИН-ПАНЕЛИ ---

export async function renderAdmin(container) {
    container.innerHTML = wrap(`<h1>Ожидают проверки</h1><div id="adminQueue" class="grid"></div>`);
    const all = await getFeed();
    const pending = all.filter(a => a.status === 'pending');
    const queue = document.getElementById('adminQueue');

    pending.forEach(item => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <div class="card-body">
                <b>${item.userName} (${item.userClass})</b>
                <div class="card-title">${item.title}</div>
                <div style="display:flex; gap:10px; margin-top:15px">
                    <button class="btn btn-primary ok-btn">Одобрить</button>
                    <button class="btn btn-danger no-btn">Отклонить</button>
                </div>
            </div>
        `;
        div.querySelector('.ok-btn').onclick = async (e) => {
            e.stopPropagation();
            const slug = prompt("Введите URL-код для ссылки (напр: ivanov-math-2026):", item.title.toLowerCase().replace(/\s+/g, '-'));
            if (!slug) return alert("URL обязателен!");
            await updateStatus(item.id, 'approved', getCurrentUser().lastName, slug);
            renderAdmin(container);
        };
        div.querySelector('.no-btn').onclick = async (e) => {
            e.stopPropagation();
            if(confirm('Отклонить достижение?')) {
                await updateStatus(item.id, 'rejected', getCurrentUser().lastName);
                renderAdmin(container);
            }
        };
        div.onclick = () => openDetailsModal(item);
        queue.appendChild(div);
    });
}

export async function renderUsersAdmin(container) {
    container.innerHTML = wrap(`<h1>Управление пользователями</h1><div id="usersList" class="grid"></div>`);
    const users = await getAllUsers();
    const list = document.getElementById('usersList');

    users.forEach(u => {
        if (u.uid === getCurrentUser().uid) return;
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-body">
                <b>${u.firstName} ${u.lastName}</b>
                <span class="badge ${u.isActive ? 'approved' : 'rejected'}">${u.isActive ? 'Активен' : 'Бан'}</span>
                <p class="meta">Роль: ${u.role}</p>
                <button class="btn toggle-btn" style="width:100%; margin-top:10px">${u.isActive ? 'Заблокировать' : 'Разблокировать'}</button>
            </div>
        `;
        card.querySelector('.toggle-btn').onclick = async () => {
            await toggleUserActive(u.uid, u.isActive);
            renderUsersAdmin(container);
        };
        list.appendChild(card);
    });
}

export async function renderUserProfile(container, userId) {
    const all = await getFeed();
    const info = all.find(a => a.userId === userId);
    container.innerHTML = wrap(`
        <button onclick="window.history.back()" class="btn">← Назад</button>
        <div class="card" style="margin:20px 0"><div class="card-body"><h1>${info?.userName || 'Профиль'}</h1><p class="meta">${info?.userClass || ''}</p></div></div>
        <div class="grid" id="userGrid"></div>
    `);
    const grid = document.getElementById('userGrid');
    all.filter(a => a.userId === userId && a.status === 'approved').forEach(ach => {
        const item = document.createElement('div');
        item.className = 'card';
        item.innerHTML = `<div class="card-body"><div class="card-title">${ach.title}</div><p class="meta">${ach.result}</p></div>`;
        item.onclick = () => openDetailsModal(ach);
        grid.appendChild(item);
    });
}

// --- МОДАЛЬНЫЕ ОКНА И ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

function openDetailsModal(ach) {
    const modal = document.getElementById('modal');
    modal.classList.remove('hidden');
    document.getElementById('modalBody').innerHTML = `
        <h2 style="word-break: break-word; color:var(--primary)">${ach.title}</h2>
        <div class="meta" style="margin-bottom:15px">${ach.userName} | ${ach.result.toUpperCase()}</div>
        <p style="background:rgba(255,255,255,0.05); padding:15px; border-radius:10px; margin-bottom:20px; white-space:pre-wrap; word-break:break-word;">
            ${ach.description || 'Описание отсутствует'}
        </p>
        <div class="docs-grid">${ach.documents?.map(d => `<img src="${d.url}" class="modal-img">`).join('')}</div>
        ${ach.slug ? `<div style="margin-top:15px; font-size:0.75rem; color:var(--primary)">ID: #${ach.slug}</div>` : ''}
        ${getCurrentUser()?.role === 'admin' ? `<button id="delBtn" class="btn btn-danger" style="width:100%; margin-top:20px">Удалить запись</button>` : ''}
    `;

    initLightbox();
    if (document.getElementById('delBtn')) {
        document.getElementById('delBtn').onclick = async () => {
            if (confirm('Удалить навсегда?')) {
                await deleteAchievement(ach.id);
                modal.classList.add('hidden');
                handleRoute();
            }
        };
    }
    document.getElementById('closeModal').onclick = () => modal.classList.add('hidden');
}

function openAddModal(user) {
    const modal = document.getElementById('modal');
    modal.classList.remove('hidden');
    document.getElementById('modalBody').innerHTML = `
        <h2>Новое достижение</h2>
        <div class="input-group"><label>Название *</label><input type="text" id="aTitle" class="input-field"></div>
        <div class="input-group"><label>Результат *</label>
            <select id="aResult" class="input-field">
                <option value="участник">Участник</option><option value="призёр">Призёр</option><option value="победитель">Победитель</option>
            </select>
        </div>
        <div class="input-group"><label>Уровень *</label>
            <select id="aLevel" class="input-field">
                <option value="школьный">Школьный</option><option value="городской">Городской</option><option value="всероссийский">Всероссийский</option>
            </select>
        </div>
        <div class="input-group"><label>Описание *</label><textarea id="aDesc" class="input-field" style="height:100px"></textarea></div>
        <div class="input-group"><label>Фото (грамоты) *</label><input type="file" id="aFiles" multiple accept="image/*" class="input-field"></div>
        <button id="sendBtn" class="btn btn-primary" style="width:100%; margin-top:10px">Отправить</button>
    `;

    document.getElementById('sendBtn').onclick = async () => {
        const title = document.getElementById('aTitle').value.trim();
        const desc = document.getElementById('aDesc').value.trim();
        const files = document.getElementById('aFiles').files;
        if (!title || !desc || files.length === 0) return alert('Заполните все поля!');

        const btn = document.getElementById('sendBtn');
        btn.disabled = true; btn.innerText = 'Загрузка...';

        try {
            await createAchievement({
                title, description: desc, result: document.getElementById('aResult').value,
                level: document.getElementById('aLevel').value, userId: user.uid,
                userName: `${user.firstName} ${user.lastName}`,
                userClass: `${user.class.grade}${user.class.letter}`, status: 'pending'
            }, files);
            modal.classList.add('hidden');
            handleRoute();
        } catch (e) { alert(e.message); btn.disabled = false; }
    };
    document.getElementById('closeModal').onclick = () => modal.classList.add('hidden');
}

function initLightbox() {
    document.querySelectorAll('.modal-img').forEach(img => {
        img.onclick = (e) => {
            e.stopPropagation();
            const lb = document.createElement('div');
            lb.className = 'lightbox';
            lb.innerHTML = `<img src="${img.src}">`;
            lb.onclick = () => lb.remove();
            document.body.appendChild(lb);
        };
    });
}
