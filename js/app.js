import { initAuthListener, validateInvite, registerWithInvite, login, logout, getCurrentUser } from './auth.js';
import { getFeed, createAchievement, updateStatus, deleteAchievement, getAllUsers, toggleUserActive } from './db.js';
import { handleRoute, navigate } from './router.js';

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

export function updateNavigation(user) {
    const adminLink = document.querySelector('a[href="#admin"]');
    const usersLink = document.querySelector('a[href="#users"]');
    const mainNav = document.getElementById('mainNav');

    if (!user) {
        if (adminLink) adminLink.style.display = 'none';
        if (usersLink) usersLink.style.display = 'none';
        if (mainNav) mainNav.classList.add('hidden');
        return;
    }

    if (mainNav) mainNav.classList.remove('hidden');
    if (adminLink) adminLink.style.display = (user.role === 'admin' || user.role === 'moder') ? 'inline-block' : 'none';
    if (usersLink) usersLink.style.display = (user.role === 'admin') ? 'inline-block' : 'none';
}

// --- СТРАНИЦЫ АВТОРИЗАЦИИ ---
export function renderInvite(container) {
    container.innerHTML = '';
    container.innerHTML = wrap(`
        <div class="auth-container">
            <h2>Активация доступа</h2>
            <div id="inviteStep">
                <input type="text" id="inviteCode" class="input-field" placeholder="Код инвайта">
                <button id="checkBtn" class="btn btn-primary" style="width:100%">Проверить</button>
            </div>
            <div id="regForm" class="hidden" style="margin-top:20px">
                <p>Привет, <b id="regName"></b>!</p>
                <input type="email" id="regEmail" class="input-field" placeholder="Email">
                <input type="password" id="regPass" class="input-field" placeholder="Пароль">
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

export function renderLogin(container) {
    container.innerHTML = '';
    container.innerHTML = wrap(`
        <div class="auth-container">
            <h2>Вход</h2>
            <input type="email" id="lEmail" class="input-field" placeholder="Email">
            <input type="password" id="lPass" class="input-field" placeholder="Пароль">
            <button id="loginBtn" class="btn btn-primary" style="width:100%">Войти</button>
        </div>
    `);
    document.getElementById('loginBtn').onclick = async () => {
        try { await login(document.getElementById('lEmail').value, document.getElementById('lPass').value); } 
        catch (e) { alert("Ошибка входа"); }
    };
}

// --- ОСНОВНОЙ КОНТЕНТ ---
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
                <div class="meta" style="color:var(--primary); font-weight:600">${ach.result.toUpperCase()} — ${ach.level}</div>
                <p class="card-desc">${ach.description.substring(0, 100)}${ach.description.length > 100 ? '...' : ''}</p>
                <div style="margin-top:10px"><span class="badge ${ach.status}">${ach.status}</span></div>
            </div>
        `;
        card.querySelector('.profile-link').onclick = (e) => { e.stopPropagation(); navigate(`user/${e.target.dataset.uid}`); };
        card.onclick = () => openDetailsModal(ach);
        grid.appendChild(card);
    });
}

export async function renderProfile(container, user) {
    container.innerHTML = wrap(`
        <div style="display:flex; justify-content:space-between; align-items:center">
            <h1>Мой кабинет</h1>
            <button id="addBtn" class="btn btn-primary">+ Добавить достижение</button>
        </div>
        <div class="card" style="margin:20px 0; border-left:4px solid var(--primary)">
            <b>${user.firstName} ${user.lastName}</b>
            <p class="meta">${user.class.grade}${user.class.letter} | Роль: ${user.role}</p>
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
        card.innerHTML = `<span class="badge ${ach.status}">${ach.status}</span><h3>${ach.title}</h3><p class="meta">${ach.level}</p>`;
        card.onclick = () => openDetailsModal(ach);
        grid.appendChild(card);
    });
}

// --- АДМИН ПАНЕЛИ ---
export async function renderAdmin(container) {
    container.innerHTML = wrap(`<h1>Очередь проверки</h1><div id="adminQueue" class="grid"></div>`);
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
                <p class="meta">${item.result} | ${item.level}</p>
                <div style="display:flex; gap:10px; margin-top:15px">
                    <button class="btn btn-primary ok-btn">Принять</button>
                    <button class="btn btn-danger no-btn">Отклонить</button>
                </div>
            </div>
        `;
        div.querySelector('.ok-btn').onclick = async () => { await updateStatus(item.id, 'approved', getCurrentUser().lastName); renderAdmin(container); };
        div.querySelector('.no-btn').onclick = async () => { await updateStatus(item.id, 'rejected', getCurrentUser().lastName); renderAdmin(container); };
        div.onclick = () => openDetailsModal(item);
        queue.appendChild(div);
    });
}

export async function renderUsersAdmin(container) {
    const user = getCurrentUser();
    if (user?.role !== 'admin') { navigate('home'); return; }
    container.innerHTML = wrap(`<h1>Управление пользователями</h1><div id="usersList" class="grid"></div>`);
    const users = await getAllUsers();
    const list = document.getElementById('usersList');
    users.forEach(u => {
        if (u.uid === user.uid) return;
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-body">
                <div class="card-header-top"><b>${u.firstName} ${u.lastName}</b><span class="badge ${u.isActive ? 'approved' : 'rejected'}">${u.isActive ? 'Active' : 'Banned'}</span></div>
                <button class="btn ${u.isActive ? 'btn-danger' : 'btn-primary'} toggle-btn" style="width:100%; margin-top:15px">${u.isActive ? 'Блокировать' : 'Разблокировать'}</button>
            </div>
        `;
        card.querySelector('.toggle-btn').onclick = async () => { await toggleUserActive(u.uid, u.isActive); renderUsersAdmin(container); };
        list.appendChild(card);
    });
}

export async function renderUserProfile(container, userId) {
    const all = await getFeed();
    const info = all.find(a => a.userId === userId);
    container.innerHTML = wrap(`<button onclick="window.history.back()" class="btn">← Назад</button><div class="card" style="margin:20px 0"><h1>${info?.userName || 'Профиль'}</h1><p class="meta">${info?.userClass || ''}</p></div><div class="grid" id="userGrid"></div>`);
    const grid = document.getElementById('userGrid');
    all.filter(a => a.userId === userId && a.status === 'approved').forEach(ach => {
        const item = document.createElement('div');
        item.className = 'card';
        item.innerHTML = `<h3>${ach.title}</h3><p class="meta">${ach.result} | ${ach.level}</p>`;
        item.onclick = () => openDetailsModal(ach);
        grid.appendChild(item);
    });
}

// --- МОДАЛЬНЫЕ ОКНА ---
function openDetailsModal(ach) {
    const modal = document.getElementById('modal');
    modal.classList.remove('hidden');
    document.getElementById('modalBody').innerHTML = `
        <h2 style="color:var(--primary)">${ach.title}</h2>
        <div class="meta" style="margin-bottom:15px">${ach.userName} | ${ach.result.toUpperCase()} | ${ach.level}</div>
        <p style="background:rgba(255,255,255,0.05); padding:15px; border-radius:10px; margin-bottom:20px">${ach.description}</p>
        <div class="docs-grid">
            ${ach.documents?.map(d => `<img src="${d.url}" class="modal-img">`).join('')}
        </div>
    `;
    document.getElementById('closeModal').onclick = () => modal.classList.add('hidden');
}

function openAddModal(user) {
    const modal = document.getElementById('modal');
    modal.classList.remove('hidden');
    document.getElementById('modalBody').innerHTML = `
        <h2>Новое достижение</h2>
        <div class="input-group">
            <label>Название мероприятия *</label>
            <input type="text" id="aTitle" class="input-field" placeholder="Напр: Олимпиада по физике">
        </div>
        <div class="input-group">
            <label>Ваш результат *</label>
            <select id="aResult" class="input-field">
                <option value="участник">Участник</option>
                <option value="призёр">Призёр</option>
                <option value="победитель">Победитель</option>
            </select>
        </div>
        <div class="input-group">
            <label>Уровень мероприятия *</label>
            <select id="aLevel" class="input-field">
                <option value="школьный">Школьный</option>
                <option value="районный">Районный</option>
                <option value="городской">Городской</option>
                <option value="областной">Областной</option>
                <option value="всероссийский">Всероссийский</option>
            </select>
        </div>
        <div class="input-group">
            <label>Описание мероприятия *</label>
            <textarea id="aDesc" class="input-field" style="height:100px" placeholder="Расскажите подробнее о мероприятии..."></textarea>
        </div>
        <div class="input-group">
            <label>Фотографии (грамоты, кубки) *</label>
            <input type="file" id="aFiles" multiple accept="image/*" class="input-field">
        </div>
        <button id="sendBtn" class="btn btn-primary" style="width:100%; margin-top:10px">Отправить на проверку</button>
    `;

    document.getElementById('sendBtn').onclick = async () => {
        const title = document.getElementById('aTitle').value.trim();
        const desc = document.getElementById('aDesc').value.trim();
        const files = document.getElementById('aFiles').files;

        if (!title || !desc || files.length === 0) return alert('Пожалуйста, заполните все поля и прикрепите фото!');

        const btn = document.getElementById('sendBtn');
        btn.disabled = true; btn.innerText = 'Загрузка файлов...';

        const data = {
            title,
            description: desc,
            result: document.getElementById('aResult').value,
            level: document.getElementById('aLevel').value,
            userId: user.uid,
            userName: `${user.firstName} ${user.lastName}`,
            userClass: `${user.class.grade}${user.class.letter}`,
            status: 'pending'
        };

        try {
            await createAchievement(data, files);
            modal.classList.add('hidden');
            handleRoute();
        } catch (e) { alert(e.message); btn.disabled = false; btn.innerText = 'Отправить на проверку'; }
    };
    document.getElementById('closeModal').onclick = () => modal.classList.add('hidden');
}
