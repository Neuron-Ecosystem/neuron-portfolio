import { initAuthListener, validateInvite, registerWithInvite, login, getCurrentUser } from './auth.js';
import { getFeed, createAchievement, updateStatus, deleteAchievement } from './db.js';
import { handleRoute, navigate } from './router.js';

window.addEventListener('load', () => {
    initAuthListener(() => handleRoute());
    window.addEventListener('hashchange', handleRoute);
});

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
function wrapInAnimation(content) {
    return `<div class="page-transition">${content}</div>`;
}

// --- ЭКРАНЫ АВТОРИЗАЦИИ ---

export function renderInvite(container) {
    container.innerHTML = wrapInAnimation(`
        <div class="auth-container">
            <h2>Активация доступа</h2>
            <div id="inviteStep">
                <div class="input-group">
                    <label>Инвайт-код</label>
                    <input type="text" id="inviteCode" class="input-field" placeholder="Введите код">
                </div>
                <button id="checkBtn" class="btn btn-primary" style="width:100%">Проверить</button>
                <div id="inviteError" class="error-msg"></div>
            </div>
            <div id="regForm" class="hidden">
                <p>Привет, <b id="regName" style="color:var(--primary)"></b>!</p>
                <div class="input-group">
                    <label>Email</label>
                    <input type="email" id="regEmail" class="input-field">
                </div>
                <div class="input-group">
                    <label>Пароль</label>
                    <input type="password" id="regPass" class="input-field">
                </div>
                <button id="regBtn" class="btn btn-primary" style="width:100%; background:var(--success)">Создать аккаунт</button>
            </div>
        </div>
    `);

    let inviteData = null;
    document.getElementById('checkBtn').onclick = async () => {
        const code = document.getElementById('inviteCode').value.trim();
        try {
            inviteData = await validateInvite(code);
            document.getElementById('regName').innerText = inviteData.firstName;
            document.getElementById('inviteStep').style.display = 'none';
            document.getElementById('regForm').classList.remove('hidden');
        } catch (e) { alert(e.message); }
    };

    document.getElementById('regBtn').onclick = async () => {
        try {
            await registerWithInvite(
                document.getElementById('regEmail').value,
                document.getElementById('regPass').value,
                document.getElementById('inviteCode').value,
                inviteData
            );
            navigate('home');
        } catch (e) { alert(e.message); }
    };
}

export function renderLogin(container) {
    container.innerHTML = wrapInAnimation(`
        <div class="auth-container">
            <h2>Вход в систему</h2>
            <div class="input-group">
                <label>Email</label>
                <input type="email" id="lEmail" class="input-field">
            </div>
            <div class="input-group">
                <label>Пароль</label>
                <input type="password" id="lPass" class="input-field">
            </div>
            <button id="loginBtn" class="btn btn-primary" style="width:100%">Войти</button>
        </div>
    `);

    document.getElementById('loginBtn').onclick = async () => {
        try {
            await login(document.getElementById('lEmail').value, document.getElementById('lPass').value);
            navigate('home');
        } catch (e) { alert("Ошибка входа"); }
    };
}

// --- ГЛАВНАЯ ЛЕНТА ---

export async function renderFeed(container) {
    container.innerHTML = `<h1>Лента достижений</h1><div id="feedGrid" class="grid"></div>`;
    const achievements = await getFeed();
    const grid = document.getElementById('feedGrid');

    achievements.forEach(ach => {
        if (ach.status !== 'approved' && getCurrentUser()?.role === 'people') return;

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-body">
                <div class="card-header-top">
                    <span class="profile-link" data-uid="${ach.userId}">${ach.userName.toUpperCase()}</span>
                    <div style="font-size:0.75rem; color:var(--text-muted)">${ach.userClass}</div>
                </div>
                <div class="card-title" style="cursor:pointer">${ach.title}</div>
                <div class="meta">${ach.result} | ${ach.level}</div>
            </div>
        `;

        // Клик по ФИО переводит на профиль
        card.querySelector('.profile-link').onclick = (e) => {
            e.stopPropagation();
            navigate(`user/${e.target.dataset.uid}`);
        };

        // Клик по карточке открывает детали
        card.onclick = (e) => {
            if(!e.target.classList.contains('profile-link')) openDetailsModal(ach);
        };
        
        grid.appendChild(card);
    });
}

// --- СИСТЕМА ПРОФИЛЕЙ ---

// Профиль другого пользователя
export async function renderUserProfile(container, userId) {
    const all = await getFeed();
    const userAch = all.filter(a => a.userId === userId && a.status === 'approved');
    
    if(userAch.length === 0 && all.filter(a => a.userId === userId).length === 0) {
        container.innerHTML = `<button onclick="window.history.back()" class="btn">← Назад</button><p>Пользователь не найден</p>`;
        return;
    }

    const info = userAch[0] || all.find(a => a.userId === userId);

    container.innerHTML = wrapInAnimation(`
        <button onclick="window.history.back()" class="btn" style="margin-bottom:20px">← Назад</button>
        <div class="card" style="padding:25px; border-top:4px solid var(--primary); margin-bottom:30px">
            <h1 style="margin:0">${info.userName}</h1>
            <p class="meta">Класс: ${info.userClass}</p>
        </div>
        <h3>Достижения ученика</h3>
        <div class="grid" id="userGrid"></div>
    `);

    const grid = document.getElementById('userGrid');
    userAch.forEach(ach => {
        const item = document.createElement('div');
        item.className = 'card';
        item.innerHTML = `<div class="card-body"><div class="card-title">${ach.title}</div><p class="meta">${ach.result}</p></div>`;
        item.onclick = () => openDetailsModal(ach);
        grid.appendChild(item);
    });
}

// Личный кабинет
export async function renderProfile(container, user) {
    container.innerHTML = wrapInAnimation(`
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px">
            <h1>Мой профиль</h1>
            ${user.role === 'people' ? `<button id="addBtn" class="btn btn-primary">+ Добавить</button>` : ''}
        </div>
        <div class="card" style="padding:20px; margin-bottom:30px">
            <b>${user.firstName} ${user.lastName}</b><br>
            <span class="meta">${user.class.grade}${user.class.letter} | ${user.role}</span>
        </div>
        <h3>Мои заявки</h3>
        <div id="myGrid" class="grid"></div>
    `);

    if(document.getElementById('addBtn')) document.getElementById('addBtn').onclick = () => openAddModal(user);

    const all = await getFeed();
    const my = all.filter(a => a.userId === user.uid);
    const grid = document.getElementById('myGrid');
    
    my.forEach(ach => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<div class="card-body"><span class="badge ${ach.status}">${ach.status}</span><div class="card-title">${ach.title}</div></div>`;
        card.onclick = () => openDetailsModal(ach);
        grid.appendChild(card);
    });
}

// --- МОДЕРАЦИЯ ---
export async function renderAdmin(container) {
    container.innerHTML = `<h1>Модерация</h1><div id="adminQueue" class="grid"></div>`;
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
                <button class="btn btn-primary ok-btn">Одобрить</button>
            </div>
        `;
        div.querySelector('.ok-btn').onclick = async () => {
            await updateStatus(item.id, 'approved', getCurrentUser().lastName);
            renderAdmin(container);
        };
        queue.appendChild(div);
    });
}

// --- МОДАЛЬНЫЕ ОКНА ---

function openDetailsModal(ach) {
    const modal = document.getElementById('modal');
    const body = document.getElementById('modalBody');
    modal.classList.remove('hidden');
    
    const imgs = ach.documents?.map(d => `<img src="${d.url}" style="width:100%; border-radius:8px; margin-top:10px">`).join('') || '';

    body.innerHTML = `
        <div class="card-header-top">
            <span class="profile-link" onclick="window.location.hash='user/${ach.userId}'">${ach.userName.toUpperCase()}</span>
        </div>
        <h2>${ach.title}</h2>
        <p class="meta">${ach.result} | ${ach.level}</p>
        <div class="docs-view">${imgs}</div>
    `;
    document.getElementById('closeModal').onclick = () => modal.classList.add('hidden');
}

function openAddModal(user) {
    const modal = document.getElementById('modal');
    const body = document.getElementById('modalBody');
    modal.classList.remove('hidden');
    
    body.innerHTML = `
        <h2>Новое достижение</h2>
        <input type="text" id="aTitle" class="input-field" placeholder="Название">
        <select id="aResult" class="input-field">
            <option>участник</option><option>призёр</option><option>победитель</option>
        </select>
        <input type="file" id="aFiles" multiple accept="image/*" class="input-field">
        <button id="sendBtn" class="btn btn-primary" style="width:100%; margin-top:15px">Отправить</button>
    `;

    document.getElementById('sendBtn').onclick = async () => {
        const files = document.getElementById('aFiles').files;
        const btn = document.getElementById('sendBtn');
        btn.disabled = true;
        btn.innerText = "Загрузка фото...";

        const data = {
            title: document.getElementById('aTitle').value,
            result: document.getElementById('aResult').value,
            level: 'школьный',
            userId: user.uid,
            userName: `${user.firstName} ${user.lastName}`,
            userClass: `${user.class.grade}${user.class.letter}`,
            status: 'pending'
        };

        try {
            await createAchievement(data, files);
            modal.classList.add('hidden');
            handleRoute();
        } catch (e) { alert(e.message); btn.disabled = false; }
    };
    document.getElementById('closeModal').onclick = () => modal.classList.add('hidden');
}
