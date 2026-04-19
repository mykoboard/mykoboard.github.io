import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router';
import type { Ref } from 'vue';
import type { PlayerIdentity } from '@/domain/identity/PlayerIdentity';

interface IdentityGuardDeps {
    identity: Ref<PlayerIdentity | null>;
}

/**
 * Factory that returns a Vue Router navigation guard.
 * Any route with `meta.requiresAuth` is blocked for users without an identity.
 * The guard redirects to the home page and passes the original path as a `redirect`
 * query param so the user can be sent back after identity creation.
 */
export function createIdentityGuard(deps: IdentityGuardDeps) {
    return async (
        to: RouteLocationNormalized,
        _from: RouteLocationNormalized,
        next: NavigationGuardNext
    ) => {
        if (!to.meta.requiresAuth) {
            return next();
        }

        if (deps.identity.value?.publicKey) {
            return next();
        }

        // Build a redirect query so we can restore destination after identity creation
        const redirectPath = to.fullPath ?? (to as any).path ?? '/';
        return next({
            name: 'index',
            query: { redirect: redirectPath },
        });
    };
}
