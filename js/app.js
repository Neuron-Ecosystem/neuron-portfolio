import { initAuthListener, validateInvite, registerWithInvite, login, getCurrentUser } from './auth.js';
import { getFeed, createAchievement, updateStatus, deleteAchievement } from './db.js';
import { handleRoute, navigate } from './router.js';

// --- Инициализация ---
window.addEventListener('load', () => {
    initAuthListener((user) => {
        handleRoute(); // Перерисовать при изменении auth
    });
    window.addEventListener('hashchange', handleRoute);
});

// --- UI Components ---

export function renderInvite(container) {
    container.innerHTML = `
        <div class="auth-container">
            <h2>Активация инвайта</h2>
            <div class="input-group">
                <input type="text" id="inviteCode" class="input-field" placeholder="Введите код (xxxx-xxxx)">
            </div>
            <button id="checkBtn" class="btn btn-primary">Проверить</button>
            <div id="inviteError" class="error-msg"></div>
            
            <div id="regForm" class="hidden" style="margin-top: 20px; border-top: 1px solid #333; padding-top:20px;">
                <p>Здравствуйте, <b id="regName"></b>!</p>
                <p class="meta">Класс: <span id="regClass"></span></p>
                <div class="input-group">
                    <input type="email" id="regEmail" class="input-field" placeholder="Email">
                </div>
                <div class="input-group">
                    <input type="password" id="regPass" class="input-field" placeholder="Пароль">
                </div>
                <button id="regBtn" class="btn btn-success">Создать аккаунт</button>
            </div>
        </div>
    `;

    let inviteData = null;

    document.getElementById('checkBtn').onclick = async () => {
        const code = document.getElementById('inviteCode').value.trim();
        try {
            inviteData = await validateInvite(code);
            document.getElementById('regName').innerText = `${inviteData.firstName} ${inviteData.lastName}`;
            document.getElementById('regClass').innerText = `${inviteData.class.grade}${inviteData.class.letter}`;
            document.getElementById('regForm').classList.remove('hidden');
            document.getElementById('inviteCode').disabled = true;
            document.getElementById('checkBtn').classList.add('hidden');
            document.getElementById('inviteError').innerText = "";
        } catch (e) {
            document.getElementById('inviteError').innerText = e.message;
        }
    };

    document.getElementById('regBtn').onclick = async () => {
        const email = document.getElementById('regEmail').value;
        const pass = document.getElementById('regPass').value;
        const code = document.getElementById('inviteCode').value.trim();
        try {
            await registerWithInvite(email, pass, code, inviteData);
            navigate('home');
        } catch (e) {
            alert("Ошибка: " + e.message);
        }
    }
}

export function renderLogin(container) {
    container.innerHTML = `
        <div class="auth-container">
            <h2>Вход в Portfolio</h2>
            <div class="input-group"><input type="email" id="lEmail" class="input-field" placeholder="Email"></div>
            <div class="input-group"><input type="password" id="lPass" class="input-field" placeholder="Пароль"></div>
            <button id="loginBtn" class="btn btn-primary">Войти</button>
        </div>
    `;
    document.getElementById('loginBtn').onclick = async () => {
        try {
            await login(document.getElementById('lEmail').value, document.getElementById('lPass').value);
            navigate('home');
        } catch (e) {
            alert("Ошибка входа");
        }
    };
}

export async function renderFeed(container) {
    container.innerHTML = `<h2>Достижения школы</h2><div id="feedGrid" class="grid" style="margin-top:20px">Loading...</div>`;
    const achievements = await getFeed();
    const grid = document.getElementById('feedGrid');
    grid.innerHTML = '';
    
    achievements.forEach(ach => {
        // Показываем всем одобренные, или свои/админу любые
        const user = getCurrentUser();
        const canView = ach.status === 'approved' || (user && (user.uid === ach.userId || user.role !== 'people'));
        
        if (!canView) return;

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-header">
                <span class="meta">${ach.userName} (${ach.userClass})</span>
                <span class="badge ${ach.status}">${ach.status}</span>
            </div>
            <div class="card-body">
                <div class="card-title">${ach.title}</div>
                <p class="meta">${ach.level} • ${ach.result}</p>
                <button class="btn btn-primary" style="margin-top:10px; width:100%; font-size:0.8rem">Подробнее</button>
            </div>
        `;
        card.onclick = () => openModal(ach);
        grid.appendChild(card);
    });
}

export function renderProfile(container, user) {
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center">
            <h2>Профиль: ${user.firstName} ${user.lastName}</h2>
            <button id="addAchBtn" class="btn btn-primary">+ Добавить достижение</button>
        </div>
        <div class="card" style="margin-top:20px; padding:20px;">
            <p>Класс: ${user.class.grade}${user.class.letter}</p>
            <p>Роль: ${user.role}</p>
            <p>Email: ${user.email}</p>
        </div>
        <h3 style="margin-top:30px">Мои заявки</h3>
        <div id="myGrid" class="grid" style="margin-top:10px"></div>
    `;

    document.getElementById('addAchBtn').onclick = () => openAddModal(user);
    // Здесь можно отфильтровать ленту только для user.uid
}

export async function renderAdmin(container) {
    const list = await getFeed();
    container.innerHTML = `<h2>Панель управления</h2><div id="adminList" style="margin-top:20px"></div>`;
    const div = document.getElementById('adminList');
    
    list.filter(i => i.status === 'pending').forEach(item => {
        const row = document.createElement('div');
        row.className = 'card';
        row.style.marginBottom = '10px';
        row.innerHTML = `
            <div class="card-header">
                <b>${item.userName}</b>: ${item.title}
                <div>
                    <button class="btn btn-success ok-btn">Approve</button>
                    <button class="btn btn-danger no-btn">Reject</button>
                </div>
            </div>
        `;
        row.querySelector('.ok-btn').onclick = async () => { await updateStatus(item.id, 'approved', getCurrentUser().lastName); renderAdmin(container); };
        row.querySelector('.no-btn').onclick = async () => { await updateStatus(item.id, 'rejected', getCurrentUser().lastName); renderAdmin(container); };
        div.appendChild(row);
    });
}

// --- Modals ---

function openAddModal(user) {
    const modal = document.getElementById('modal');
    const body = document.getElementById('modalBody');
    modal.classList.remove('hidden');
    
    body.innerHTML = `
        <h3>Новое достижение</h3>
        <div class="input-group">
            <label>Название</label>
            <input type="text" id="aTitle" class="input-field">
        </div>
        <div class="input-group">
            <label>Тип</label>
            <select id="aType" class="input-field" style="background:#1e293b; color:white">
                <option>олимпиада</option><option>конкурс</option><option>спорт</option>
            </select>
        </div>
        <div class="input-group">
            <label>Уровень</label>
            <select id="aLevel" class="input-field" style="background:#1e293b; color:white">
                <option>школьный</option><option>районный</option><option>региональный</option>
            </select>
        </div>
        <div class="input-group">
            <label>Результат</label>
            <select id="aResult" class="input-field" style="background:#1e293b; color:white">
                <option>участник</option><option>призёр</option><option>победитель</option>
            </select>
        </div>
        <div class="input-group">
            <label>Документы (PDF, JPG, PNG)</label>
            <input type="file" id="aFiles" multiple class="input-field">
        </div>
        <button id="sendAch" class="btn btn-primary">Отправить</button>
    `;

    document.getElementById('sendAch').onclick = async () => {
        const btn = document.getElementById('sendAch');
        btn.innerText = 'Загрузка...';
        const files = document.getElementById('aFiles').files;
        
        const data = {
            title: document.getElementById('aTitle').value,
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

        await createAchievement(data, files);
        modal.classList.add('hidden');
        alert("Отправлено на проверку!");
        renderProfile(document.getElementById('app'), user);
    };

    document.getElementById('closeModal').onclick = () => modal.classList.add('hidden');
}

function openModal(ach) {
    const modal = document.getElementById('modal');
    const body = document.getElementById('modalBody');
    modal.classList.remove('hidden');
    
    const docsHtml = ach.documents.map(d => `<a href="${d.url}" target="_blank" class="file-item" style="color:#38bdf8">${d.name}</a>`).join('');

    body.innerHTML = `
        <h2>${ach.title}</h2>
        <p style="color:var(--text-muted); margin-bottom:10px">${ach.type} | ${ach.level}</p>
        <div style="background:#334155; padding:10px; border-radius:8px; margin-bottom:15px">
             <b>Ученик:</b> ${ach.userName} (${ach.userClass})<br>
             <b>Результат:</b> ${ach.result}
        </div>
        <h4>Подтверждающие документы:</h4>
        <div class="file-list">${docsHtml || 'Нет документов'}</div>
        
        ${ (getCurrentUser()?.role === 'admin') ? `<button id="delBtn" class="btn btn-danger" style="margin-top:20px; width:100%">Удалить (Admin)</button>` : '' }
    `;

    if(document.getElementById('delBtn')) {
        document.getElementById('delBtn').onclick = async () => {
            if(confirm('Удалить навсегда?')) {
                await deleteAchievement(ach.id);
                modal.classList.add('hidden');
                handleRoute();
            }
        }
    }
    
    document.getElementById('closeModal').onclick = () => modal.classList.add('hidden');
}
