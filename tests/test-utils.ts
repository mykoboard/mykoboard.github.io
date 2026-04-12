import { createApp, defineComponent, h } from 'vue';

export function withSetup<T>(composable: () => T, providers?: Record<symbol | string, any>) {
    const app = createApp({ setup: () => () => h('div') });

    if (providers) {
        Object.getOwnPropertySymbols(providers).forEach(key => {
            app.provide(key, providers[key]);
        });
        Object.keys(providers).forEach(key => {
            app.provide(key, providers[key]);
        });
    }

    return [app.runWithContext(composable), app] as const;
}

