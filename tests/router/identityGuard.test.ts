import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { ref } from 'vue';

// -----------------------------------------------------------------------
// Minimal vue-router mock — only what the guard needs
// -----------------------------------------------------------------------
type RouteLocation = { name: string; meta: Record<string, unknown>; query?: Record<string, string> };
type NavigationGuardNext = (to?: RouteLocation | false | { name: string; query?: Record<string, string> }) => void;

const mockIdentityRef = ref<{ publicKey: string; name: string } | null>(null);

mock.module('@/application/InjectionKeys', () => ({
    IdentityRepoKey: Symbol('IdentityRepo')
}));

// -----------------------------------------------------------------------
// Import the guard under test AFTER mocks are set up
// -----------------------------------------------------------------------
import { createIdentityGuard } from '@/router/guards/identityGuard';

describe('identityGuard', () => {
    let nextCalls: unknown[];

    const makeNext = (): NavigationGuardNext => {
        return (arg?: unknown) => { nextCalls.push(arg); };
    };

    beforeEach(() => {
        nextCalls = [];
        mockIdentityRef.value = null;
    });

    const boardRoute: RouteLocation = {
        name: 'board',
        meta: { requiresAuth: true },
    };

    const offerRoute: RouteLocation = {
        name: 'board',
        meta: { requiresAuth: true },
        query: { offer: 'some-encoded-offer-string' },
    };

    const publicRoute: RouteLocation = {
        name: 'index',
        meta: {},
    };

    const authRoute: RouteLocation = {
        name: 'games',
        meta: { requiresAuth: true },
    };

    it('redirects anonymous user away from requiresAuth route', async () => {
        const guard = createIdentityGuard({ identity: mockIdentityRef });

        await guard(authRoute as any, {} as any, makeNext() as any);

        expect(nextCalls[0]).not.toBeUndefined();
        const redirect = nextCalls[0] as any;
        expect(typeof redirect === 'object').toBe(true);
    });

    it('redirects anonymous user away from board route (fresh session)', async () => {
        const guard = createIdentityGuard({ identity: mockIdentityRef });

        await guard(boardRoute as any, {} as any, makeNext() as any);

        // Should NOT call next() with no args (which means "proceed")
        expect(nextCalls[0]).not.toBeUndefined();
        // Should redirect somewhere (not just `true` / proceed)
        const redirect = nextCalls[0] as any;
        expect(redirect).not.toBe(true);
        expect(typeof redirect === 'object').toBe(true);
    });

    it('redirects anonymous user following a deep-link offer', async () => {
        const guard = createIdentityGuard({ identity: mockIdentityRef });

        await guard(offerRoute as any, {} as any, makeNext() as any);

        const redirect = nextCalls[0] as any;
        expect(typeof redirect === 'object').toBe(true);
        // Preserves the original destination so it can be restored after identity creation
        expect(redirect.query?.redirect).toBeDefined();
    });

    it('allows authenticated user through to board route', async () => {
        mockIdentityRef.value = { publicKey: 'pk-abc123', name: 'Alice' };
        const guard = createIdentityGuard({ identity: mockIdentityRef });

        await guard(boardRoute as any, {} as any, makeNext() as any);

        // next() called with no args = proceed
        expect(nextCalls[0]).toBeUndefined();
    });

    it('allows anonymous user through public routes', async () => {
        const guard = createIdentityGuard({ identity: mockIdentityRef });

        await guard(publicRoute as any, {} as any, makeNext() as any);

        expect(nextCalls[0]).toBeUndefined();
    });
});
