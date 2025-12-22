const DEBUG_KEY = 'debug';

export const logger = {
    shouldLog: () => {
        return true
    },

    netIn: (peerId: string, data: string) => {
        if (!logger.shouldLog()) return;

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
        if (!logger.shouldLog()) return;

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

    info: (...args: any[]) => {
        if (!logger.shouldLog()) return;
        console.log('%c[INFO]', 'color: #8b5cf6; font-weight: bold;', ...args);
    },

    error: (...args: any[]) => {
        // Errors usually should log regardless of debug mode, 
        // but we can make it more prominent if debug is on.
        console.error('%c[ERROR]', 'color: #ef4444; font-weight: bold;', ...args);
    }
};
