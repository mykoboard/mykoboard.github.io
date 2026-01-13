import { createRouter, createWebHashHistory } from 'vue-router'
import IndexView from '../pages/IndexView.vue'

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        {
            path: '/',
            name: 'index',
            component: IndexView
        },
        {
            path: '/games',
            name: 'games',
            component: () => import('../pages/GameSelectionView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/profile',
            name: 'profile',
            component: () => import('../pages/UserView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/games/:gameId',
            name: 'lobby',
            component: () => import('../pages/GameLobbyView.vue'),
            meta: { requiresAuth: true, requiresSession: true }
        },
        {
            path: '/games/:gameId/:boardId',
            name: 'board',
            component: () => import('../pages/BoardView.vue'),
            meta: { requiresAuth: true, requiresSession: true }
        },
        {
            path: '/:pathMatch(.*)*',
            name: 'not-found',
            component: () => import('../pages/NotFoundView.vue')
        }
    ]
})

export default router
