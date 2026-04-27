import { createRouter, createWebHashHistory } from 'vue-router'
import IndexView from '../pages/IndexView.vue'
import { createIdentityGuard } from './guards/identityGuard'
import { compositionRoot } from '../application/CompositionRoot'

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
            component: () => import('../pages/UserView.vue')
        },
        {
            path: '/games/:gameId',
            name: 'game-info',
            component: () => import('../pages/GameInfoView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/games/:gameId/:boardId',
            name: 'board',
            component: () => import('../pages/BoardView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/:pathMatch(.*)*',
            name: 'not-found',
            component: () => import('../pages/NotFoundView.vue')
        }
    ]
})

router.beforeEach(createIdentityGuard({ 
    identity: compositionRoot.identityRepo.identity,
    isLoading: compositionRoot.identityRepo.isLoading
}))

export default router
