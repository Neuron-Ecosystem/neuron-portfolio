import { 
    renderFeed, 
    renderLogin, 
    renderInvite, 
    renderProfile, 
    renderAdmin, 
    renderUserProfile, 
    renderUsersAdmin 
} from './app.js';
import { getCurrentUser } from './auth.js';

export function navigate(route) {
    window.location.hash = route;
}

export async function handleRoute() {
    const app = document.getElementById('app');
    const hash = window.location.hash.slice(1) || 'home';
    const user = getCurrentUser();

    // Плавное скрытие перед сменой контента
    app.style.opacity = '0';

    setTimeout(async () => {
        // Экраны без авторизации
        if (hash === 'login') {
            renderLogin(app);
        } else if (hash === 'invite') {
            renderInvite(app);
        } 
        // Экран чужого профиля
        else if (hash.startsWith('user/')) {
            if (!user) { navigate('login'); return; }
            const userId = hash.split('/')[1];
            await renderUserProfile(app, userId);
        } 
        // Основные защищенные разделы
        else {
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
                    } else {
                        navigate('home');
                    }
                    break;
                case 'users':
                    if (user.role === 'admin') {
                        await renderUsersAdmin(app);
                    } else {
                        navigate('home');
                    }
                    break;
                default:
                    await renderFeed(app);
            }
        }
        
        // Плавное появление
        app.style.opacity = '1';
    }, 250);
}
