import { renderLogin, renderInvite, renderFeed, renderProfile, renderAdmin } from './app.js';
import { getCurrentUser } from './auth.js';

export function navigate(route) {
    window.location.hash = route;
    handleRoute();
}

export function handleRoute() {
    const hash = window.location.hash.slice(1) || 'home';
    const app = document.getElementById('app');
    const user = getCurrentUser();

    app.innerHTML = ''; // Clear

    if (hash === 'invite') {
        renderInvite(app);
        return;
    }

    if (hash === 'login') {
        renderLogin(app);
        return;
    }

    // Защищенные маршруты (автоматически редиректят, если логика внутри позволяет)
    switch(hash) {
        case 'home':
            renderFeed(app);
            break;
        case 'profile':
            if (!user) navigate('login');
            else renderProfile(app, user);
            break;
        case 'admin':
            if (!user || user.role === 'people') { alert('Доступ запрещен'); navigate('home'); }
            else renderAdmin(app);
            break;
        default:
            renderFeed(app);
    }
    updateNavbar(user);
}

function updateNavbar(user) {
    const nav = document.getElementById('navLinks');
    let html = `<a onclick="window.location.hash='home'" class="nav-item">Лента</a>`;
    
    if (user) {
        html += `<a onclick="window.location.hash='profile'" class="nav-item">Профиль</a>`;
        if (user.role !== 'people') {
            html += `<a onclick="window.location.hash='admin'" class="nav-item">Админка</a>`;
        }
        html += `<span class="nav-item" id="logoutBtn">Выход</span>`;
    } else {
        html += `<a onclick="window.location.hash='login'" class="nav-item">Вход</a>`;
        html += `<a onclick="window.location.hash='invite'" class="btn btn-primary" style="margin-left:15px">Регистрация</a>`;
    }
    nav.innerHTML = html;
    
    if(document.getElementById('logoutBtn')) {
        document.getElementById('logoutBtn').addEventListener('click', () => import('./auth.js').then(m => m.logout()));
    }
}
