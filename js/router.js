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
    const hash = window.location.hash.slice(1) || 'home';
    const user = getCurrentUser();

    app.style.opacity = '0';

    setTimeout(async () => {
        // 1. Проверка на публичный Slug (Доступно всем)
        const publicAch = await getAchievementBySlug(hash);
        if (publicAch) {
            renderSingleAchievement(app, publicAch);
        } 
        // 2. Экраны входа/инвайта
        else if (hash === 'login') {
            renderLogin(app);
        } else if (hash === 'invite') {
            renderInvite(app);
        } 
        // 3. Защищенные роуты
        else {
            if (!user) { navigate('login'); return; }

            if (hash.startsWith('user/')) {
                await renderUserProfile(app, hash.split('/')[1]);
            } else {
                switch (hash) {
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
