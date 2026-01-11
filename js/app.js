import { initAuthListener, validateInvite, registerWithInvite, login, getCurrentUser } from './auth.js';
import { getFeed, createAchievement, updateStatus, deleteAchievement } from './db.js';
import { handleRoute, navigate } from './router.js';

// --- Инициализация приложения ---
window.addEventListener('load', () => {
    initAuthListener((user) => {
        handleRoute(); // Перерисовываем интерфейс при изменении состояния авторизации
    });
    window.addEventListener('hashchange', handleRoute);
});

// --- UI Компоненты и Экраны ---

/**
 * Экран ввода инвайт-кода и последующей регистрации
 */
export function renderInvite(container) {
    container.innerHTML = `
        <div class="auth-container">
            <h2 style="margin-bottom: 20px;">Активация доступа</h2>
            <div id="inviteStep">
                <div class="input-group">
                    <label>Инвайт-код</label>
                    <input type="text" id="inviteCode" class="input-field" placeholder="Например: neuron-2026-xxxx">
                </div>
                <button id="checkBtn" class="btn btn-primary" style="width: 100%;">Проверить код</button>
                <div id="inviteError" class="error-msg"></div>
            </div>
            
            <div id="regForm" class="hidden" style="margin-top: 20px; border-top: 1px solid #334155; padding-top:20px;">
                <p style="margin-bottom: 10px;">Здравствуйте, <b id="regName" style="color: var(--primary);"></b>!</p>
                <p class="meta" style="margin-bottom: 20px;">Ваш профиль: <span id="regClass"></span></p>
                
                <div class="input-group">
                    <label>Электронная почта</label>
                    <input type="email" id="regEmail" class="input-field" placeholder="email@example.com">
                </div>
                <div class="input-group">
                    <label>Придумайте пароль</label>
                    <input type="password" id="regPass" class="input-field" placeholder="Минимум 6 символов">
                </div>
                <button id="regBtn" class="btn btn-primary" style="width: 100%; background: var(--success); color: white;">Завершить регистрацию</button>
            </div>
        </div>
    `;

    let inviteData = null;

    // Шаг 1: Проверка инвайта
    document.getElementById('checkBtn').onclick = async () => {
        const code = document.getElementById('inviteCode').value.trim();
        const errorDiv = document.getElementById('inviteError');
        try {
            errorDiv.innerText = "Проверка...";
            inviteData = await validateInvite(code);
            
            document.getElementById('regName').innerText = `${inviteData.firstName} ${inviteData.lastName}`;
            document.getElementById('regClass').innerText = `${inviteData.class.grade}${inviteData.class.letter} (${inviteData.role})`;
            
            document.getElementById('regForm').classList.remove('hidden');
            document.getElementById('inviteStep').classList.add('hidden');
        } catch (e) {
            errorDiv.innerText = e.message;
        }
    };

    // Шаг 2: Регистрация
    document.getElementById('regBtn').onclick = async () => {
        const email = document.getElementById('regEmail').value.trim();
        const pass = document.getElementById('regPass').value;
        const code = document.getElementById('inviteCode').value.trim();

        if (!email || pass.length < 6) {
            alert("Пожалуйста, введите корректный email и пароль от 6 символов");
            return;
        }

        try {
            await registerWithInvite(email, pass, code, inviteData);
            navigate('home');
        } catch (e) {
            alert("Ошибка при регистрации: " + e.message);
        }
    };
}

/**
 * Экран входа
 */
export function renderLogin(container) {
    container.innerHTML = `
        <div class="auth-container">
            <h2 style="margin-bottom: 20px;">Вход в Portfolio</h2>
            <div class="input-group">
                <label>Email</label>
                <input type="email" id="lEmail" class="input-field" placeholder="Введите почту">
            </div>
            <div class="input-group">
                <label>Пароль</label>
                <input type="password" id="lPass" class="input-field" placeholder="Введите пароль">
            </div>
            <button id="loginBtn" class="btn btn-primary" style="width: 100%;">Войти</button>
            <p style="margin-top: 20px; font-size: 0.85rem; color: var(--text-muted);">
                Нет аккаунта? <a onclick="window.location.hash='invite'" style="color: var(--primary); cursor:pointer;">Активировать код</a>
            </p>
        </div>
    `;

    document.getElementById('loginBtn').onclick = async () => {
        try {
            await login(document.getElementById('lEmail').value, document.getElementById('lPass').value);
            navigate('home');
        } catch (e) {
            alert("Неверный логин или пароль");
        }
    };
}

/**
 * Главная страница: Лента всех достижений
 */
export async function renderFeed(container) {
    container.innerHTML = `
        <header style="margin-bottom: 30px;">
            <h1 style="font-weight: 800; font-size: 2rem;">Достижения учеников</h1>
            <p style="color: var(--text-muted);">Публичный реестр успехов Neuron Ecosystem</p>
        </header>
        <div id="feedGrid" class="grid">
            <div class="loading-spinner"></div>
        </div>
    `;

    const achievements = await getFeed();
    const grid = document.getElementById('feedGrid');
    grid.innerHTML = '';
    
    const user = getCurrentUser();

    achievements.forEach(ach => {
        // Логика видимости: одобрено всем, либо владельцу/админу в любом статусе
        const isOwner = user && user.uid === ach.userId;
        const isStaff = user && (user.role === 'admin' || user.role === 'moder');
        const canView = ach.status === 'approved' || isOwner || isStaff;
        
        if (!canView) return;

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-header">
                <span class="meta">${ach.userName} • ${ach.userClass}</span>
                <span class="badge ${ach.status}">${ach.status === 'approved' ? 'подтверждено' : 'на проверке'}</span>
            </div>
            <div class="card-body">
                <div class="card-title">${ach.title}</div>
                <p class="meta" style="margin-bottom: 15px;">
                    <span class="material-icons-round" style="font-size: 14px;">emoji_events</span> ${ach.result} 
                    <span style="margin: 0 5px;">|</span> ${ach.level}
                </p>
                <button class="btn btn-primary" style="width: 100%; font-size: 0.85rem; background: rgba(56, 189, 248, 0.1); color: var(--primary); border: 1px solid var(--primary);">
                    Смотреть детали
                </button>
            </div>
        `;
        card.onclick = () => openDetailsModal(ach);
        grid.appendChild(card);
    });

    if (grid.children.length === 0) {
        grid.innerHTML = `<p style="color: var(--text-muted);">Достижений пока нет.</p>`;
    }
}

/**
 * Личный кабинет ученика
 */
export async function renderProfile(container, user) {
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap: wrap; gap: 15px; margin-bottom: 30px;">
            <div>
                <h1 style="font-weight: 800;">Личный кабинет</h1>
                <p style="color: var(--primary);">${user.firstName} ${user.lastName} • ${user.class.grade}${user.class.letter}</p>
            </div>
            ${user.role === 'people' ? `<button id="addAchBtn" class="btn btn-primary">+ Добавить успех</button>` : ''}
        </div>

        <div class="grid">
            <div class="card" style="padding: 20px; border-left: 4px solid var(--primary);">
                <h4 style="color: var(--text-muted); text-transform: uppercase; font-size: 0.7rem; letter-spacing: 1px;">Статус системы</h4>
                <p style="font-weight: 600; margin-top: 5px;">Активен (Роль: ${user.role})</p>
            </div>
            <div class="card" style="padding: 20px; border-left: 4px solid var(--accent);">
                <h4 style="color: var(--text-muted); text-transform: uppercase; font-size: 0.7rem; letter-spacing: 1px;">Контактные данные</h4>
                <p style="font-weight: 600; margin-top: 5px;">${user.email}</p>
            </div>
        </div>

        <h3 style="margin: 40px 0 20px 0;">Моя история достижений</h3>
        <div id="myHistoryGrid" class="grid">Загрузка...</div>
    `;

    if (user.role === 'people') {
        document.getElementById('addAchBtn').onclick = () => openAddModal(user);
    }

    // Фильтруем только свои достижения
    const all = await getFeed();
    const myAch = all.filter(a => a.userId === user.uid);
    const historyGrid = document.getElementById('myHistoryGrid');
    historyGrid.innerHTML = '';

    if (myAch.length === 0) {
        historyGrid.innerHTML = '<p class="meta">Вы еще не добавили ни одного достижения.</p>';
        return;
    }

    myAch.forEach(ach => {
        const item = document.createElement('div');
        item.className = 'card';
        item.innerHTML = `
            <div class="card-header">
                <span class="badge ${ach.status}">${ach.status}</span>
            </div>
            <div class="card-body">
                <div class="card-title">${ach.title}</div>
                <button class="btn btn-primary" style="width: 100%; margin-top: 10px;">Просмотр</button>
            </div>
        `;
        item.onclick = () => openDetailsModal(ach);
        historyGrid.appendChild(item);
    });
}

/**
 * Админ-панель: Модерация
 */
export async function renderAdmin(container) {
    const user = getCurrentUser();
    container.innerHTML = `
        <h1 style="margin-bottom: 10px;">Панель управления</h1>
        <p class="meta" style="margin-bottom: 30px;">Очередь на подтверждение (Moderation Queue)</p>
        <div id="adminQueue" style="display: flex; flex-direction: column; gap: 15px;"></div>
    `;

    const all = await getFeed();
    const queue = all.filter(a => a.status === 'pending');
    const listDiv = document.getElementById('adminQueue');

    if (queue.length === 0) {
        listDiv.innerHTML = '<div class="card" style="padding: 20px; text-align: center; color: var(--text-muted);">Заявок на модерацию нет</div>';
        return;
    }

    queue.forEach(item => {
        const row = document.createElement('div');
        row.className = 'card';
        row.innerHTML = `
            <div style="padding: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                <div>
                    <h3 style="font-size: 1.1rem; margin-bottom: 5px;">${item.title}</h3>
                    <p class="meta">От: <b>${item.userName}</b> (${item.userClass})</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn view-btn" style="background: var(--card-bg); border: 1px solid #334155; color: white;">Детали</button>
                    <button class="btn ok-btn" style="background: var(--success); color: white;">Одобрить</button>
                    <button class="btn no-btn" style="background: var(--danger); color: white;">Отклонить</button>
                </div>
            </div>
        `;
        
        row.querySelector('.view-btn').onclick = () => openDetailsModal(item);
        
        row.querySelector('.ok-btn').onclick = async (e) => {
            e.stopPropagation();
            if (confirm(`Подтвердить достижение "${item.title}"?`)) {
                await updateStatus(item.id, 'approved', user.lastName);
                renderAdmin(container);
            }
        };

        row.querySelector('.no-btn').onclick = async (e) => {
            e.stopPropagation();
            if (confirm(`Отклонить заявку "${item.title}"?`)) {
                await updateStatus(item.id, 'rejected', user.lastName);
                renderAdmin(container);
            }
        };

        listDiv.appendChild(row);
    });
}

// --- Модальные окна (Modals) ---

/**
 * Модалка детального просмотра
 */
function openDetailsModal(ach) {
    const modal = document.getElementById('modal');
    const body = document.getElementById('modalBody');
    modal.classList.remove('hidden');
    
    // Генерируем галерею изображений (ImgBB)
    const imagesHtml = ach.documents && ach.documents.length > 0 
        ? ach.documents.map(img => `
            <div style="margin-top: 15px;">
                <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 5px;">${img.name}</p>
                <a href="${img.url}" target="_blank">
                    <img src="${img.url}" style="width: 100%; border-radius: 8px; border: 1px solid #334155;">
                </a>
            </div>
        `).join('')
        : '<p style="color: var(--text-muted); margin-top: 10px;">Документы не приложены</p>';

    body.innerHTML = `
        <span class="badge ${ach.status}" style="margin-bottom: 10px;">${ach.status}</span>
        <h2 style="font-weight: 800; line-height: 1.2;">${ach.title}</h2>
        <p class="meta" style="margin: 10px 0 20px 0;">${ach.type} • ${ach.level}</p>
        
        <div style="background: var(--card-bg); padding: 15px; border-radius: 10px; border: 1px solid #334155;">
            <p style="margin-bottom: 5px;"><span style="color: var(--text-muted);">Обладатель:</span> ${ach.userName}</p>
            <p style="margin-bottom: 5px;"><span style="color: var(--text-muted);">Класс:</span> ${ach.userClass}</p>
            <p><span style="color: var(--text-muted);">Результат:</span> <b>${ach.result}</b></p>
        </div>

        <h4 style="margin-top: 25px;">Подтверждающие документы (ImgBB)</h4>
        <div class="docs-container">${imagesHtml}</div>
        
        ${ (getCurrentUser()?.role === 'admin') ? `
            <button id="delBtn" class="btn btn-danger" style="margin-top: 30px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <span class="material-icons-round" style="font-size: 18px;">delete</span> Удалить достижение
            </button>
        ` : '' }
    `;

    if (document.getElementById('delBtn')) {
        document.getElementById('delBtn').onclick = async () => {
            if (confirm('Вы уверены? Запись будет безвозвратно удалена из базы.')) {
                await deleteAchievement(ach.id);
                modal.classList.add('hidden');
                handleRoute();
            }
        };
    }
    
    document.getElementById('closeModal').onclick = () => modal.classList.add('hidden');
}

/**
 * Модалка добавления (только фото через ImgBB)
 */
function openAddModal(user) {
    const modal = document.getElementById('modal');
    const body = document.getElementById('modalBody');
    modal.classList.remove('hidden');
    
    body.innerHTML = `
        <h2 style="margin-bottom: 20px;">Новое достижение</h2>
        
        <div class="input-group">
            <label>Что вы получили? (Название)</label>
            <input type="text" id="aTitle" class="input-field" placeholder="Напр: Диплом 1 степени по физике">
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div class="input-group">
                <label>Тип</label>
                <select id="aType" class="input-field">
                    <option>олимпиада</option>
                    <option>конкурс</option>
                    <option>спорт</option>
                    <option>активность</option>
                </select>
            </div>
            <div class="input-group">
                <label>Результат</label>
                <select id="aResult" class="input-field">
                    <option>участник</option>
                    <option>призёр</option>
                    <option>победитель</option>
                </select>
            </div>
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
            <label>Фото доказательства (JPG, PNG)</label>
            <input type="file" id="aFiles" multiple accept="image/*" class="input-field" style="padding: 8px;">
            <p style="font-size: 0.7rem; color: var(--text-muted); margin-top: 5px;">* Файлы будут загружены на ImgBB. PDF не поддерживается.</p>
        </div>

        <button id="sendAch" class="btn btn-primary" style="width: 100%; margin-top: 10px; height: 50px;">Отправить на модерацию</button>
    `;

    document.getElementById('sendAch').onclick = async () => {
        const btn = document.getElementById('sendAch');
        const title = document.getElementById('aTitle').value.trim();
        const files = document.getElementById('aFiles').files;

        if (!title || files.length === 0) {
            alert("Заполните название и прикрепите хотя бы одно фото.");
            return;
        }

        btn.disabled = true;
        btn.innerText = 'Загрузка фото на ImgBB...';

        const data = {
            title: title,
            type: document.getElementById('aType').value,
            level: document.getElementById('aLevel').value,
            result: document.getElementById('aResult').value,
            description: "",
            userId: user.uid,
            userName: `${user.firstName} ${user.lastName}`,
            userClass: `${user.class.grade}${user.class.letter}`,
            status: 'pending',
            approvedBy: null
        };

        try {
            await createAchievement(data, files);
            modal.classList.add('hidden');
            alert("Успешно! Достижение появится в ленте после проверки модератором.");
            renderProfile(document.getElementById('app'), user);
        } catch (e) {
            alert("Ошибка: " + e.message);
            btn.disabled = false;
            btn.innerText = 'Отправить на модерацию';
        }
    };

    document.getElementById('closeModal').onclick = () => modal.classList.add('hidden');
}
