const DEBUG_KEY = 'debug';

const isDev = import.meta.env.DEV;

export type LogCategory = 'net' | 'state' | 'info' | 'error' | 'lobby' | 'sig' | 'webrtc';

const getInitialSettings = (): Record<LogCategory, boolean> => {
    const defaultSettings: Record<LogCategory, boolean> = {
        net: isDev,
        state: isDev,
        info: isDev,
        error: true,
        lobby: isDev,
        sig: isDev,
        webrtc: isDev,
    };

    try {
        const stored = localStorage.getItem('debug_config');
        if (stored) {
            return { ...defaultSettings, ...JSON.parse(stored) };
        }
    } catch { }

    return defaultSettings;
};

const settings = getInitialSettings();

export const logger = {
    shouldLog: (category: LogCategory) => {
        return settings[category];
    },

    netIn: (peerId: string, data: string) => {
        if (!logger.shouldLog('net')) return;

        let parsed = data;
        try {
            parsed = JSON.parse(data);
        } catch { }

        console.log(
            `%c[NET-IN] %cfrom ${peerId.slice(0, 8)}:`,
            'color: #22c55e; font-weight: bold;',
            'color: #64748b;',
            parsed
        );
    },

    netOut: (peerId: string, data: string) => {
        if (!logger.shouldLog('net')) return;

        let parsed = data;
        try {
            parsed = JSON.parse(data);
        } catch { }

        console.log(
            `%c[NET-OUT] %cto ${peerId.slice(0, 8)}:`,
            'color: #3b82f6; font-weight: bold;',
            'color: #64748b;',
            parsed
        );
    },

    state: (type: 'EVENT' | 'STATE', label: string, data?: any, category: LogCategory = 'state') => {
        if (!logger.shouldLog(category)) return;
        const color = type === 'EVENT' ? '#f59e0b' : '#10b981';
        console.log(
            `%c[${category.toUpperCase()}-${type}] %c${label}`,
            `color: ${color}; font-weight: bold;`,
            'color: inherit;',
            data || ''
        );
    },

    lobby: (type: 'EVENT' | 'STATE', label: string, data?: any) => {
        logger.state(type, label, data, 'lobby');
    },

    sig: (label: string, ...args: any[]) => {
        if (!logger.shouldLog('sig')) return;
        console.log(
            `%c[SIG] %c${label}`,
            'color: #ec4899; font-weight: bold;',
            'color: inherit;',
            ...args
        );
    },

    webrtc: (label: string, ...args: any[]) => {
        if (!logger.shouldLog('webrtc')) return;
        console.log(
            `%c[WEBRTC] %c${label}`,
            'color: #06b6d4; font-weight: bold;',
            'color: inherit;',
            ...args
        );
    },

    info: (...args: any[]) => {
        if (!logger.shouldLog('info')) return;
        console.log('%c[INFO]', 'color: #8b5cf6; font-weight: bold;', ...args);
    },

    error: (...args: any[]) => {
        if (!logger.shouldLog('error')) return;
        console.error('%c[ERROR]', 'color: #ef4444; font-weight: bold;', ...args);
    }
};
