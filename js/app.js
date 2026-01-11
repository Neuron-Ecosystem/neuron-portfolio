import { initAuthListener, validateInvite, registerWithInvite, login, getCurrentUser } from './auth.js';
import { getFeed, createAchievement, updateStatus, deleteAchievement } from './db.js';
import { handleRoute, navigate } from './router.js';

// Инициализация
window.addEventListener('load', () => {
    initAuthListener(() => handleRoute());
    window.addEventListener('hashchange', handleRoute);
});

// Вспомогательная функция для анимации
const wrap = (content) => `<div class="page-transition">${content}</div>`;

// --- АВТОРИЗАЦИЯ ---

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
                    <input type="email" id="regEmail" class="input-field" placeholder="example@mail.com">
                </div>
                <div class="input-group">
                    <label>Пароль (от 6 символов)</label>
                    <input type="password" id="regPass" class="input-field">
                </div>
                <button id="regBtn" class="btn btn-primary" style="width:100%; background:var(--success)">Завершить регистрацию</button>
            </div>
        </div>
    `);

    let inviteData = null;
    document.getElementById('checkBtn').onclick = async () => {
        const code = document.getElementById('inviteCode').value.trim();
        try {
            inviteData = await validateInvite(code);
            document.getElementById('regName').innerText = inviteData.firstName + " " + inviteData.lastName;
            document.getElementById('inviteStep').style.display = 'none';
            document.getElementById('regForm').classList.remove('hidden');
        } catch (e) { alert("Код не найден или уже использован"); }
    };

    document.getElementById('regBtn').onclick = async () => {
        const email = document.getElementById('regEmail').value;
        const pass = document.getElementById('regPass').value;
        if (pass.length < 6) return alert("Пароль слишком короткий");
        try {
            await registerWithInvite(email, pass, document.getElementById('inviteCode').value, inviteData);
            navigate('home');
        } catch (e) { alert(e.message); }
    };
}

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
                Есть код? <a href="#invite" style="color:var(--primary)">Активировать</a>
            </p>
        </div>
    `);

    document.getElementById('loginBtn').onclick = async () => {
        try {
            await login(document.getElementById('lEmail').value, document.getElementById('lPass').value);
            navigate('home');
        } catch (e) { alert("Ошибка входа"); }
    };
}

// --- ЛЕНТА ---

export async function renderFeed(container) {
    container.innerHTML = wrap(`
        <header>
            <h1>Лента успехов</h1>
            <p class="meta">Достижения учеников Neuron Ecosystem</p>
        </header>
        <div id="feedGrid" class="grid" style="margin-top:20px"></div>
    `);

    const achievements = await getFeed();
    const grid = document.getElementById('feedGrid');
    const user = getCurrentUser();

    achievements.forEach(ach => {
        // Показываем если одобрено, или если это мое, или я админ
        const canSee = ach.status === 'approved' || (user && (user.uid === ach.userId || user.role !== 'people'));
        if (!canSee) return;

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-body">
                <div class="card-header-top">
                    <span class="profile-link" data-uid="${ach.userId}">${ach.userName.toUpperCase()}</span>
                    <div style="font-size:0.75rem; color:var(--text-muted)">${ach.userClass}</div>
                </div>
                <div class="card-title" style="margin-top:10px">${ach.title}</div>
                <div class="meta">${ach.result} | ${ach.level}</div>
                <div style="margin-top:10px"><span class="badge ${ach.status}">${ach.status}</span></div>
            </div>
        `;

        card.querySelector('.profile-link').onclick = (e) => {
            e.stopPropagation();
            navigate(`user/${e.target.dataset.uid}`);
        };

        card.onclick = (e) => {
            if (!e.target.classList.contains('profile-link')) openDetailsModal(ach);
        };

        grid.appendChild(card);
    });
}

// --- ПРОФИЛИ ---

export async function renderUserProfile(container, userId) {
    const all = await getFeed();
    const userAch = all.filter(a => a.userId === userId && a.status === 'approved');
    
    // Пытаемся найти данные пользователя (хотя бы из одного достижения)
    const info = all.find(a => a.userId === userId);
    if (!info) {
        container.innerHTML = `<button onclick="navigate('home')" class="btn">← Назад</button><p>Профиль не найден</p>`;
        return;
    }

    container.innerHTML = wrap(`
        <button onclick="window.history.back()" class="btn" style="margin-bottom:20px">← Назад</button>
        <div class="card" style="padding:25px; border-top:4px solid var(--primary); margin-bottom:30px">
            <h1 style="margin:0">${info.userName}</h1>
            <p class="meta" style="font-size:1.1rem">${info.userClass}</p>
        </div>
        <h3>Достижения (${userAch.length})</h3>
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

export async function renderProfile(container, user) {
    container.innerHTML = wrap(`
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px">
            <h1>Мой кабинет</h1>
            ${user.role === 'people' ? `<button id="addBtn" class="btn btn-primary">+ Добавить достижение</button>` : ''}
        </div>
        <div class="card" style="padding:20px; margin-bottom:30px; border-left:4px solid var(--accent)">
            <b style="font-size:1.2rem">${user.firstName} ${user.lastName}</b><br>
            <span class="meta">${user.class.grade}${user.class.letter} • Роль: ${user.role}</span>
        </div>
        <h3>Мои загрузки</h3>
        <div id="myGrid" class="grid"></div>
    `);

    if (document.getElementById('addBtn')) document.getElementById('addBtn').onclick = () => openAddModal(user);

    const all = await getFeed();
    const my = all.filter(a => a.userId === user.uid);
    const grid = document.getElementById('myGrid');
    
    my.forEach(ach => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-body">
                <span class="badge ${ach.status}">${ach.status}</span>
                <div class="card-title" style="margin-top:10px">${ach.title}</div>
                <p class="meta">${ach.result}</p>
            </div>
        `;
        card.onclick = () => openDetailsModal(ach);
        grid.appendChild(card);
    });
}

// --- АДМИН ПАНЕЛЬ ---

export async function renderAdmin(container) {
    container.innerHTML = wrap(`
        <h1>Панель модерации</h1>
        <p class="meta">Подтверждение новых достижений</p>
        <div id="adminQueue" class="grid" style="margin-top:20px"></div>
    `);

    const all = await getFeed();
    const pending = all.filter(a => a.status === 'pending');
    const queue = document.getElementById('adminQueue');

    if (pending.length === 0) {
        queue.innerHTML = `<div class="card" style="padding:20px; color:var(--text-muted)">Новых заявок нет</div>`;
    }

    pending.forEach(item => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <div class="card-body">
                <div class="card-header-top"><b>${item.userName}</b> (${item.userClass})</div>
                <div class="card-title">${item.title}</div>
                <p class="meta">Результат: ${item.result}</p>
                <div style="display:flex; gap:10px; margin-top:15px">
                    <button class="btn btn-primary ok-btn" style="flex:1; background:var(--success)">Одобрить</button>
                    <button class="btn btn-danger no-btn" style="flex:1">Отклонить</button>
                </div>
            </div>
        `;

        div.querySelector('.ok-btn').onclick = async () => {
            if (confirm("Одобрить это достижение?")) {
                await updateStatus(item.id, 'approved', getCurrentUser().lastName);
                renderAdmin(container);
            }
        };

        div.querySelector('.no-btn').onclick = async () => {
            if (confirm("Отклонить это достижение?")) {
                await updateStatus(item.id, 'rejected', getCurrentUser().lastName);
                renderAdmin(container);
            }
        };

        div.onclick = (e) => {
            if (!e.target.classList.contains('btn')) openDetailsModal(item);
        };

        queue.appendChild(div);
    });
}

// --- МОДАЛКИ ---

function openDetailsModal(ach) {
    const modal = document.getElementById('modal');
    const body = document.getElementById('modalBody');
    modal.classList.remove('hidden');
    
    const imgs = ach.documents?.map(d => `
        <div style="margin-top:15px">
            <img src="${d.url}" style="width:100%; border-radius:10px; border:1px solid #334155">
        </div>
    `).join('') || '<p>Фото не приложено</p>';

    body.innerHTML = `
        <div class="card-header-top" style="margin-bottom:15px">
            <span class="profile-link" onclick="window.location.hash='user/${ach.userId}'">${ach.userName.toUpperCase()}</span>
        </div>
        <span class="badge ${ach.status}">${ach.status}</span>
        <h2 style="margin-top:10px">${ach.title}</h2>
        <p class="meta">${ach.type} | ${ach.level} | ${ach.result}</p>
        <div class="docs-view">${imgs}</div>
        ${getCurrentUser()?.role === 'admin' ? `<button id="delBtn" class="btn btn-danger" style="width:100%; margin-top:20px">Удалить запись</button>` : ''}
    `;

    if (document.getElementById('delBtn')) {
        document.getElementById('delBtn').onclick = async () => {
            if (confirm("Удалить безвозвратно?")) {
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
    const body = document.getElementById('modalBody');
    modal.classList.remove('hidden');
    
    body.innerHTML = `
        <h2>Добавить достижение</h2>
        <div class="input-group">
            <label>Название мероприятия</label>
            <input type="text" id="aTitle" class="input-field" placeholder="Напр: Олимпиада по химии">
        </div>
        <div class="input-group">
            <label>Ваш результат</label>
            <select id="aResult" class="input-field">
                <option>участник</option>
                <option>призёр</option>
                <option>победитель</option>
            </select>
        </div>
        <div class="input-group">
            <label>Уровень</label>
            <select id="aLevel" class="input-field">
                <option>школьный</option>
                <option>районный</option>
                <option>региональный</option>
                <option>всероссийский</option>
            </select>
        </div>
        <div class="input-group">
            <label>Фотографии (ImgBB)</label>
            <input type="file" id="aFiles" multiple accept="image/*" class="input-field">
        </div>
        <button id="sendBtn" class="btn btn-primary" style="width:100%; margin-top:15px; height:50px">Отправить на проверку</button>
    `;

    document.getElementById('sendBtn').onclick = async () => {
        const files = document.getElementById('aFiles').files;
        const title = document.getElementById('aTitle').value.trim();
        if (!title || files.length === 0) return alert("Заполните название и выберите фото");

        const btn = document.getElementById('sendBtn');
        btn.disabled = true;
        btn.innerText = "Загрузка данных...";

        const data = {
            title: title,
            result: document.getElementById('aResult').value,
            level: document.getElementById('aLevel').value,
            type: "достижение",
            userId: user.uid,
            userName: `${user.firstName} ${user.lastName}`,
            userClass: `${user.class.grade}${user.class.letter}`,
            status: 'pending'
        };

        try {
            await createAchievement(data, files);
            modal.classList.add('hidden');
            handleRoute();
        } catch (e) { 
            alert("Ошибка: " + e.message); 
            btn.disabled = false; 
            btn.innerText = "Отправить на проверку";
        }
    };
    document.getElementById('closeModal').onclick = () => modal.classList.add('hidden');
}
