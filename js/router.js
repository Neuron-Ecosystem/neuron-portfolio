import { 
    renderFeed, renderLogin, renderInvite, renderProfile, 
    renderAdmin, renderUserProfile, renderUsersAdmin 
} from './app.js';
import { getCurrentUser } from './auth.js';

export function navigate(route) {
    window.location.hash = route;
}

export async function handleRoute() {
    const app = document.getElementById('app');
    const hash = window.location.hash.slice(1) || 'home';
    const user = getCurrentUser();

    // Если пользователь залогинен и пытается зайти на логин/инвайт — шлем его на главную
    if (user && (hash === 'login' || hash === 'invite')) {
        navigate('home');
        return;
    }

    app.style.opacity = '0';

    setTimeout(async () => {
        // Очищаем контейнер перед каждым рендером, чтобы избежать наложений
        app.innerHTML = '';

        if (hash === 'login') {
            renderLogin(app);
        } else if (hash === 'invite') {
            renderInvite(app);
        } else if (hash.startsWith('user/')) {
            if (!user) { navigate('login'); return; }
            const userId = hash.split('/')[1];
            await renderUserProfile(app, userId);
        } else {
            // Если нет пользователя и мы не на страницах входа — редирект
            if (!user) { navigate('login'); return; }

            switch (hash) {
                case 'home':
                    await renderFeed(app);
                    break;
                case 'profile':
                    await renderProfile(app, user);
                    break;
                case 'admin':
                    if (user.role === 'admin' || user.role === 'moder') {
                        await renderAdmin(app);
                    } else { navigate('home'); }
                    break;
                case 'users':
                    if (user.role === 'admin') {
                        await renderUsersAdmin(app);
                    } else { navigate('home'); }
                    break;
                default:
                    await renderFeed(app);
            }
        }
        app.style.opacity = '1';
    }, 250);
}
