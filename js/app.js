import { initAuthListener, validateInvite, registerWithInvite, login, logout, getCurrentUser } from './auth.js';
import { getFeed, createAchievement, updateStatus, deleteAchievement, getAllUsers, toggleUserActive } from './db.js';
import { handleRoute, navigate } from './router.js';

// Инициализация при загрузке
window.addEventListener('load', () => {
    initAuthListener((user) => {
        updateNavigation(user);
        // handleRoute вызывается внутри слушателя, чтобы гарантировать наличие данных пользователя
        handleRoute();
    });
    window.addEventListener('hashchange', handleRoute);
});

// Слушатель для кнопки выхода
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
        if (mainNav) mainNav.classList.add('hidden'); // Скрываем навигацию если не залогинен
        return;
    }

    if (mainNav) mainNav.classList.remove('hidden');
    if (adminLink) adminLink.style.display = (user.role === 'admin' || user.role === 'moder') ? 'inline-block' : 'none';
    if (usersLink) usersLink.style.display = (user.role === 'admin') ? 'inline-block' : 'none';
}

// --- СТРАНИЦЫ АВТОРИЗАЦИИ ---

export function renderInvite(container) {
    container.innerHTML = ''; // Очистка
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
                const email = document.getElementById('regEmail').value;
                const pass = document.getElementById('regPass').value;
                await registerWithInvite(email, pass, code, data);
                // После успешной регистрации authListener сам вызовет handleRoute
            };
        } catch (e) { alert(e.message); }
    };
}

export function renderLogin(container) {
    container.innerHTML = ''; // Очистка
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
        try {
            await login(document.getElementById('lEmail').value, document.getElementById('lPass').value);
            // Не нужно navigate('home'), Firebase изменит состояние, и listener всё сделает сам
        } catch (e) { alert("Ошибка входа: проверьте данные"); }
    };
}

// --- ОСНОВНОЙ КОНТЕНТ ---

export async function renderFeed(container) {
    container.innerHTML = wrap(`<h1>Лента успехов</h1><div id="feedGrid" class="grid"></div>`);
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
                <div class="meta">${ach.result}</div>
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
            ${user.role === 'people' ? `<button id="addBtn" class="btn btn-primary">+ Добавить</button>` : ''}
        </div>
        <div class="card" style="margin:20px 0; border-left:4px solid var(--primary)">
            <b>${user.firstName} ${user.lastName}</b>
            <p class="meta">${user.class.grade}${user.class.letter} | Роль: ${user.role}</p>
        </div>
        <div id="myGrid" class="grid"></div>
    `);

    if(document.getElementById('addBtn')) {
        document.getElementById('addBtn').onclick = () => openAddModal(user);
    }

    const all = await getFeed();
    const my = all.filter(a => a.userId === user.uid);
    const grid = document.getElementById('myGrid');

    my.forEach(ach => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<span class="badge ${ach.status}">${ach.status}</span><h3>${ach.title}</h3>`;
        card.onclick = () => openDetailsModal(ach);
        grid.appendChild(card);
    });
}

export async function renderAdmin(container) {
    container.innerHTML = wrap(`<h1>Модерация</h1><div id="adminQueue" class="grid"></div>`);
    const all = await getFeed();
    const pending = all.filter(a => a.status === 'pending');
    const queue = document.getElementById('adminQueue');

    pending.forEach(item => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <div class="card-body">
                <b>${item.userName}</b>
                <div class="card-title">${item.title}</div>
                <div style="display:flex; gap:10px; margin-top:15px">
                    <button class="btn btn-primary ok-btn">Одобрить</button>
                    <button class="btn btn-danger no-btn">Отклонить</button>
                </div>
            </div>
        `;
        div.querySelector('.ok-btn').onclick = async () => {
            await updateStatus(item.id, 'approved', getCurrentUser().lastName);
            renderAdmin(container);
        };
        div.querySelector('.no-btn').onclick = async () => {
            await updateStatus(item.id, 'rejected', getCurrentUser().lastName);
            renderAdmin(container);
        };
        queue.appendChild(div);
    });
}

export async function renderUsersAdmin(container) {
    const user = getCurrentUser();
    if (user?.role !== 'admin') { navigate('home'); return; }

    container.innerHTML = wrap(`<h1>Пользователи</h1><div id="usersList" class="grid"></div>`);
    const users = await getAllUsers();
    const list = document.getElementById('usersList');

    users.forEach(u => {
        if (u.uid === user.uid) return;
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-body">
                <div class="card-header-top">
                    <b>${u.firstName} ${u.lastName}</b>
                    <span class="badge ${u.isActive ? 'approved' : 'rejected'}">${u.isActive ? 'Active' : 'Banned'}</span>
                </div>
                <p class="meta">Роль: ${u.role}</p>
                <button class="btn ${u.isActive ? 'btn-danger' : 'btn-primary'} toggle-btn" style="width:100%; margin-top:15px">
                    ${u.isActive ? 'Заблокировать' : 'Разблокировать'}
                </button>
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
    const userAch = all.filter(a => a.userId === userId && a.status === 'approved');

    container.innerHTML = wrap(`
        <button onclick="window.history.back()" class="btn" style="margin-bottom:20px">← Назад</button>
        <div class="card" style="margin-bottom:30px">
            <h1>${info ? info.userName : 'Пользователь'}</h1>
            <p class="meta">${info ? info.userClass : ''}</p>
        </div>
        <div class="grid" id="userGrid"></div>
    `);

    const grid = document.getElementById('userGrid');
    userAch.forEach(ach => {
        const item = document.createElement('div');
        item.className = 'card';
        item.innerHTML = `<h3>${ach.title}</h3><p class="meta">${ach.result}</p>`;
        item.onclick = () => openDetailsModal(ach);
        grid.appendChild(item);
    });
}

// Модалки
function openDetailsModal(ach) {
    const modal = document.getElementById('modal');
    modal.classList.remove('hidden');
    document.getElementById('modalBody').innerHTML = `
        <h2>${ach.title}</h2>
        <p>${ach.userName} | ${ach.result}</p>
        <div style="margin-top:20px">
            ${ach.documents?.map(d => `<img src="${d.url}" style="width:100%; margin-bottom:10px">`).join('')}
        </div>
    `;
    document.getElementById('closeModal').onclick = () => modal.classList.add('hidden');
}

function openAddModal(user) {
    const modal = document.getElementById('modal');
    modal.classList.remove('hidden');
    document.getElementById('modalBody').innerHTML = `
        <h2>Новое достижение</h2>
        <input type="text" id="aTitle" class="input-field" placeholder="Название">
        <select id="aResult" class="input-field"><option>победитель</option><option>призёр</option></select>
        <input type="file" id="aFiles" multiple class="input-field">
        <button id="sendBtn" class="btn btn-primary" style="width:100%; margin-top:10px">Отправить</button>
    `;
    document.getElementById('sendBtn').onclick = async () => {
        const files = document.getElementById('aFiles').files;
        const data = {
            title: document.getElementById('aTitle').value,
            result: document.getElementById('aResult').value,
            level: 'школьный',
            userId: user.uid,
            userName: `${user.firstName} ${user.lastName}`,
            userClass: `${user.class.grade}${user.class.letter}`,
            status: 'pending'
        };
        await createAchievement(data, files);
        modal.classList.add('hidden');
        handleRoute();
    };
    document.getElementById('closeModal').onclick = () => modal.classList.add('hidden');
}
