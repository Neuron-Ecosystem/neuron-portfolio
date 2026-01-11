import { renderFeed, renderLogin, renderInvite, renderProfile, renderAdmin, renderUserProfile } from './app.js';
import { getCurrentUser } from './auth.js';

export function navigate(route) {
    window.location.hash = route;
}

export async function handleRoute() {
    const app = document.getElementById('app');
    const hash = window.location.hash.slice(1) || 'home';
    const user = getCurrentUser();

    // Добавляем класс для анимации исчезновения перед сменой контента
    app.classList.remove('page-transition');
    app.style.opacity = '0';

    setTimeout(async () => {
        // Логика маршрутизации
        if (hash === 'login') {
            renderLogin(app);
        } else if (hash === 'invite') {
            renderInvite(app);
        } else if (hash.startsWith('user/')) {
            // Маршрут для просмотра чужого профиля: #user/ID_ПОЛЬЗОВАТЕЛЯ
            const userId = hash.split('/')[1];
            await renderUserProfile(app, userId);
        } else {
            // Защищенные маршруты
            if (!user) {
                navigate('login');
                return;
            }

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
                default:
                    await renderFeed(app);
            }
        }
        
        // Включаем анимацию появления
        app.classList.add('page-transition');
        app.style.opacity = '1';
    }, 200);
}
