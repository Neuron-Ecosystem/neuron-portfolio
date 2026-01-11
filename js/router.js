import { 
    renderFeed, renderLogin, renderInvite, renderProfile, 
    renderAdmin, renderUserProfile, renderUsersAdmin, renderSingleAchievement 
} from './app.js';
import { getCurrentUser } from './auth.js';
import { getAchievementBySlug } from './db.js';

export function navigate(route) {
    window.location.hash = route;
}

export async function handleRoute() {
    const app = document.getElementById('app');
    // Получаем путь, удаляя # и лишние слэши
    let path = window.location.hash.slice(1);
    if (path.startsWith('/')) path = path.slice(1);
    if (!path || path === '') path = 'home';

    const user = getCurrentUser();
    app.style.opacity = '0';

    setTimeout(async () => {
        // 1. Проверка на публичную ссылку (slug)
        const publicAch = await getAchievementBySlug(path);
        
        if (publicAch) {
            renderSingleAchievement(app, publicAch);
        } 
        // 2. Стандартные страницы
        else if (path === 'login') {
            renderLogin(app);
        } else if (path === 'invite') {
            renderInvite(app);
        } 
        // 3. Защищенные роуты
        else {
            if (!user) { navigate('login'); return; }

            if (path.startsWith('user/')) {
                await renderUserProfile(app, path.split('/')[1]);
            } else {
                switch (path) {
                    case 'home': await renderFeed(app); break;
                    case 'profile': await renderProfile(app, user); break;
                    case 'admin':
                        if (user.role === 'admin' || user.role === 'moder') await renderAdmin(app);
                        else navigate('home');
                        break;
                    case 'users':
                        if (user.role === 'admin') await renderUsersAdmin(app);
                        else navigate('home');
                        break;
                    default: await renderFeed(app);
                }
            }
        }
        app.style.opacity = '1';
    }, 250);
}
