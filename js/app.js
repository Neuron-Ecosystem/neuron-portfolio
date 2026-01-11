import { initAuthListener, validateInvite, registerWithInvite, login, logout, getCurrentUser } from './auth.js';
import { getFeed, createAchievement, updateStatus, deleteAchievement, getAllUsers, toggleUserActive } from './db.js';
import { handleRoute, navigate } from './router.js';

// --- ИНИЦИАЛИЗАЦИЯ СИСТЕМЫ ---
window.addEventListener('load', () => {
    initAuthListener((user) => {
        updateNavigation(user);
        handleRoute();
    });
    window.addEventListener('hashchange', handleRoute);
});

// Глобальный слушатель кликов (для выхода и закрытия модалок)
document.addEventListener('click', (e) => {
    if (e.target.closest('#logoutBtn')) {
        if (confirm('Выйти из системы?')) logout();
    }
});

// Обертка для анимации переходов
const wrap = (content) => `<div class="page-transition">${content}</div>`;

// Копирование ссылки в буфер
async function shareAchievement(slug) {
    const fullUrl = `${window.location.origin}${window.location.pathname}#/${slug}`;
    try {
        await navigator.clipboard.writeText(fullUrl);
        alert("Ссылка скопирована в буфер обмена!");
    } catch (e) {
        alert("Не удалось скопировать ссылку");
    }
}

// Управление навигационным меню
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

// --- СТРАНИЦЫ АВТОРИЗАЦИИ ---

export function renderLogin(container) {
    container.innerHTML = wrap(`
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
            <p style="text-align:center; margin-top:15px; font-size:0.8rem">
                Нет аккаунта? <a href="#invite" style="color:var(--primary)">Активировать инвайт</a>
            </p>
        </div>
    `);
    document.getElementById('loginBtn').onclick = async () => {
        try {
            await login(document.getElementById('lEmail').value, document.getElementById('lPass').value);
        } catch (e) {
            alert("Ошибка входа. Проверьте почту и пароль.");
        }
    };
}

export function renderInvite(container) {
    container.innerHTML = wrap(`
        <div class="auth-container">
            <h2>Активация инвайта</h2>
            <div id="inviteStep">
                <div class="input-group">
                    <label>Код доступа</label>
                    <input type="text" id="inviteCode" class="input-field" placeholder="Напр: neuron-xxx">
                </div>
                <button id="checkBtn" class="btn btn-primary" style="width:100%">Проверить код</button>
            </div>
            <div id="regForm" class="hidden" style="margin-top:20px; border-top:1px solid #334155; padding-top:20px">
                <p>Привет, <b id="regName" style="color:var(--primary)"></b>!</p>
                <div class="input-group">
                    <label>Установите Email</label>
                    <input type="email" id="regEmail" class="input-field">
                </div>
                <div class="input-group">
                    <label>Придумайте пароль</label>
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
        } catch (e) {
            alert(e.message);
        }
    };
}

// --- ЛЕНТА И ПРОФИЛИ ---

export async function renderFeed(container) {
    container.innerHTML = wrap(`<h1>Лента достижений</h1><div id="fG" class="grid"></div>`);
    const achs = await getFeed();
    const user = getCurrentUser();
    const grid = document.getElementById('fG');

    achs.forEach(ach => {
        const isOwner = user && user.uid === ach.userId;
        const isStaff = user && (user.role === 'admin' || user.role === 'moder');
        if (ach.status !== 'approved' && !isOwner && !isStaff) return;

        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <div class="card-body">
                <div style="display:flex; justify-content:space-between; align-items:flex-start">
                    <div class="card-title">${ach.title}</div>
                    ${ach.slug ? `<button class="share-btn" data-slug="${ach.slug}"><span class="material-icons-round" style="font-size:16px">share</span></button>` : ''}
                </div>
                <p class="meta">${ach.userName} | ${ach.userClass}</p>
                <div class="meta" style="color:var(--primary); font-weight:600">${ach.result.toUpperCase()}</div>
                <div class="card-desc" style="margin-top:10px">${ach.description || ''}</div>
                <div style="margin-top:15px"><span class="badge ${ach.status}">${ach.status}</span></div>
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
        <div class="card" style="margin:20px 0; border-left:4px solid var(--primary); cursor:default">
            <div class="card-body">
                <b style="font-size:1.2rem">${user.firstName} ${user.lastName}</b>
                <p class="meta">${user.class.grade}${user.class.letter} класс | Роль: ${user.role}</p>
            </div>
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

// --- ПУБЛИЧНАЯ СТРАНИЦА (ДЛЯ УЧИТЕЛЕЙ) ---

export function renderSingleAchievement(container, ach) {
    container.innerHTML = wrap(`
        <div style="max-width:800px; margin: 0 auto;">
            <button onclick="location.hash='home'" class="btn" style="margin-bottom:20px; background: #334155; color: white">← Назад в ленту</button>
            <div class="card" style="cursor:default">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:15px; gap:20px">
                    <h1 style="color:var(--primary); word-break:break-word;">${ach.title}</h1>
                    <button class="share-btn" id="sBtnInner" style="padding:10px 20px"><span class="material-icons-round">share</span> Поделиться</button>
                </div>
                <p class="meta" style="font-size:1.1rem">${ach.userName} | ${ach.userClass}</p>
                <div style="margin:20px 0; font-weight:700; color:var(--accent); font-size:1.2rem">${ach.result.toUpperCase()} (${ach.level})</div>
                <p style="white-space:pre-wrap; word-break:break-word; background:rgba(255,255,255,0.03); padding:20px; border-radius:15px; font-size:1rem;">${ach.description || 'Описание отсутствует'}</p>
                <div class="docs-grid" style="margin-top:20px">
                    ${ach.documents?.map(d => `<img src="${d.url}" class="modal-img" style="height:200px">`).join('')}
                </div>
            </div>
        </div>
    `);
    document.getElementById('sBtnInner').onclick = () => shareAchievement(ach.slug);
    initLightbox();
}

// --- МОДАЛЬНЫЕ ОКНА ---

function openDetailsModal(ach) {
    const modal = document.getElementById('modal');
    modal.classList.remove('hidden');

    if (ach.slug) window.history.pushState(null, '', `/#/${ach.slug}`);

    document.getElementById('modalBody').innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px">
            <h2 style="word-break:break-word; color:var(--primary); padding-right:40px">${ach.title}</h2>
            ${ach.slug ? `<button id="mShare" class="share-btn"><span class="material-icons-round">share</span></button>` : ''}
        </div>
        <p class="meta">${ach.userName} | ${ach.result} | ${ach.level}</p>
        <div style="margin:20px 0; white-space:pre-wrap; background:rgba(0,0,0,0.2); padding:15px; border-radius:10px">${ach.description || ''}</div>
        <div class="docs-grid">${ach.documents?.map(d => `<img src="${d.url}" class="modal-img">`).join('')}</div>
        ${getCurrentUser()?.role === 'admin' ? `<button id="delBtn" class="btn btn-danger" style="width:100%; margin-top:20px">Удалить запись</button>` : ''}
    `;

    if (ach.slug) document.getElementById('mShare').onclick = () => shareAchievement(ach.slug);
    
    initLightbox();

    if (document.getElementById('delBtn')) {
        document.getElementById('delBtn').onclick = async () => {
            if (confirm('Удалить это достижение безвозвратно?')) {
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
        <h2 style="margin-bottom:20px">Новое достижение</h2>
        <div class="input-group"><label>Название олимпиады/конкурса</label><input type="text" id="aTitle" class="input-field"></div>
        <div class="input-group">
            <label>Результат</label>
            <select id="aResult" class="input-field">
                <option value="участник">Участник</option>
                <option value="призёр">Призёр</option>
                <option value="победитель">Победитель</option>
            </select>
        </div>
        <div class="input-group">
            <label>Уровень</label>
            <select id="aLevel" class="input-field">
                <option value="школьный">Школьный</option>
                <option value="районный">Районный</option>
                <option value="региональный">Региональный</option>
                <option value="всероссийский">Всероссийский</option>
            </select>
        </div>
        <div class="input-group"><label>Описание (необязательно)</label><textarea id="aDesc" class="input-field" style="height:80px"></textarea></div>
        <div class="input-group"><label>Фотографии грамот/дипломов</label><input type="file" id="aFiles" multiple accept="image/*" class="input-field"></div>
        <button id="sendBtn" class="btn btn-primary" style="width:100%; margin-top:10px">Отправить на модерацию</button>
    `;

    document.getElementById('sendBtn').onclick = async () => {
        const title = document.getElementById('aTitle').value.trim();
        const files = document.getElementById('aFiles').files;
        if (!title || files.length === 0) return alert('Укажите название и прикрепите фото!');

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
        } catch (e) {
            alert("Ошибка при сохранении: " + e.message);
            btn.disabled = false; btn.innerText = 'Отправить на модерацию';
        }
    };
    document.getElementById('closeModal').onclick = () => modal.classList.add('hidden');
}

// --- ПРОСМОТР ФОТО (LIGHTBOX) ---

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

// --- АДМИН-ПАНЕЛИ ---

export async function renderAdmin(container) {
    container.innerHTML = wrap(`<h1>Модерация</h1><div id="aQ" class="grid"></div>`);
    const achs = await getFeed();
    const pending = achs.filter(a => a.status === 'pending');
    const queue = document.getElementById('aQ');

    pending.forEach(item => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <div class="card-body">
                <b>${item.userName} (${item.userClass})</b>
                <div class="card-title">${item.title}</div>
                <div style="display:flex; gap:10px; margin-top:15px">
                    <button class="btn btn-primary ok-btn" style="flex:1">Одобрить</button>
                    <button class="btn btn-danger no-btn" style="padding:10px">×</button>
                </div>
            </div>
        `;
        div.querySelector('.ok-btn').onclick = async (e) => {
            e.stopPropagation();
            const slug = prompt("Придумайте уникальный URL (напр: ivanov-win-math):", item.title.toLowerCase().replace(/\s+/g, '-'));
            if (!slug) return alert("URL обязателен для создания публичной ссылки!");
            await updateStatus(item.id, 'approved', getCurrentUser().lastName, slug);
            renderAdmin(container);
        };
        div.querySelector('.no-btn').onclick = async (e) => {
            e.stopPropagation();
            if (confirm('Отклонить это достижение?')) {
                await updateStatus(item.id, 'rejected', getCurrentUser().lastName);
                renderAdmin(container);
            }
        };
        div.onclick = () => openDetailsModal(item);
        queue.appendChild(div);
    });
}

export async function renderUsersAdmin(container) {
    container.innerHTML = wrap(`<h1>Пользователи</h1><div id="uL" class="grid"></div>`);
    const users = await getAllUsers();
    const list = document.getElementById('uL');

    users.forEach(u => {
        if (u.uid === getCurrentUser().uid) return;
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <div class="card-body">
                <b>${u.firstName} ${u.lastName}</b>
                <p class="meta">${u.email} | ${u.role}</p>
                <button class="btn toggle-btn" style="width:100%; margin-top:15px; background: ${u.isActive ? 'var(--danger)' : 'var(--success)'}; color:white">
                    ${u.isActive ? 'Заблокировать' : 'Разблокировать'}
                </button>
            </div>
        `;
        div.querySelector('.toggle-btn').onclick = async () => {
            await toggleUserActive(u.uid, u.isActive);
            renderUsersAdmin(container);
        };
        list.appendChild(div);
    });
}

export async function renderUserProfile(container, userId) {
    const all = await getFeed();
    const userAchs = all.filter(a => a.userId === userId && a.status === 'approved');
    const name = userAchs.length > 0 ? userAchs[0].userName : "Профиль пользователя";

    container.innerHTML = wrap(`
        <button onclick="window.history.back()" class="btn" style="margin-bottom:20px; background:#334155; color:white">← Назад</button>
        <h1>${name}</h1>
        <div id="uGrid" class="grid"></div>
    `);
    
    const grid = document.getElementById('uGrid');
    userAchs.forEach(ach => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `<div class="card-body"><div class="card-title">${ach.title}</div><p class="meta">${ach.result}</p></div>`;
        div.onclick = () => openDetailsModal(ach);
        grid.appendChild(div);
    });
}
