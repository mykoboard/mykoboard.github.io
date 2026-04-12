/**
 * Minimal mocks for Browser APIs to enable testing infrastructure adapters in Bun/Node.
 */

// --- IndexedDB Mock ---
export class MockIDBDatabase {
    private stores = new Map<string, Map<string, any>>();

    constructor(public name: string, public version: number) {}

    transaction(storeNames: string | string[], mode: 'readonly' | 'readwrite') {
        const names = Array.isArray(storeNames) ? storeNames : [storeNames];
        return {
            objectStore: (name: string) => {
                if (!this.stores.has(name)) this.stores.set(name, new Map());
                const store = this.stores.get(name)!;
                // Simple assumption: 'id' or 'boardId' or 'publicKey' is the key
                const getKey = (val: any) => val.boardId || val.id || val.publicKey || val.index;

                return {
                    put: (value: any, key?: string) => {
                        const actualKey = key || getKey(value);
                        store.set(actualKey, value);
                        const req = { onsuccess: null as any, onerror: null as any };
                        setTimeout(() => req.onsuccess?.({ target: { result: actualKey } }), 0);
                        return req;
                    },
                    get: (key: string) => {
                        const result = store.get(key);
                        const req = { onsuccess: null as any, onerror: null as any, result };
                        setTimeout(() => req.onsuccess?.({ target: { result } }), 0);
                        return req;
                    },
                    delete: (key: string) => {
                        store.delete(key);
                        const req = { onsuccess: null as any, onerror: null as any };
                        setTimeout(() => req.onsuccess?.({ target: { result: undefined } }), 0);
                        return req;
                    },
                    clear: () => {
                        store.clear();
                        const req = { onsuccess: null as any, onerror: null as any };
                        setTimeout(() => req.onsuccess?.({ target: { result: undefined } }), 0);
                        return req;
                    },
                    getAll: () => {
                        const result = Array.from(store.values());
                        const req = { onsuccess: null as any, onerror: null as any, result };
                        setTimeout(() => req.onsuccess?.({ target: { result } }), 0);
                        return req;
                    },
                    openCursor: () => {
                        const entries = Array.from(store.entries());
                        let index = 0;
                        const req = { onsuccess: null as any, onerror: null as any, result: null as any };
                        const advance = () => {
                            if (index < entries.length) {
                                const [key, value] = entries[index++];
                                req.result = {
                                    key, value,
                                    continue: () => setTimeout(advance, 0),
                                    delete: () => store.delete(key)
                                };
                                req.onsuccess?.({ target: req });
                            } else {
                                req.result = null;
                                req.onsuccess?.({ target: req });
                            }
                        };
                        setTimeout(advance, 0);
                        return req;
                    }
                };
            },
            oncomplete: null as any,
            onerror: null as any,
            onabort: null as any
        };
    }

    createObjectStore(name: string) {
        if (!this.stores.has(name)) this.stores.set(name, new Map());
        return {};
    }

    get objectStoreNames() {
        return {
            contains: (name: string) => this.stores.has(name)
        };
    }
}

export const mockIndexedDB = {
    open: (name: string, version: number) => {
        const db = new MockIDBDatabase(name, version);
        const req = {
            onsuccess: null as any,
            onerror: null as any,
            onupgradeneeded: null as any,
            result: db
        };
        setTimeout(() => {
            req.onupgradeneeded?.({ target: req });
            req.onsuccess?.({ target: req });
        }, 0);
        return req;
    }
};

// --- Web Crypto Mock ---
export const mockCrypto = {
    subtle: {
        generateKey: async () => ({
            publicKey: { type: 'public' },
            privateKey: { type: 'private' }
        }),
        exportKey: async () => new Uint8Array([1, 2, 3]).buffer,
        sign: async () => new Uint8Array([4, 5, 6]).buffer,
        verify: async () => true,
        importKey: async () => ({ type: 'public' })
    }
};

// --- WebSocket Mock ---
export class MockWebSocket {
    static OPEN = 1;
    readyState = MockWebSocket.OPEN;
    onopen: (() => void) | null = null;
    onmessage: ((event: any) => void) | null = null;
    onclose: (() => void) | null = null;
    onerror: ((err: any) => void) | null = null;
    sentMessages: string[] = [];

    constructor(public url: string) {
        setTimeout(() => this.onopen?.(), 0);
    }

    send(data: string) {
        this.sentMessages.push(data);
    }

    close() {
        this.readyState = 0;
        this.onclose?.();
    }

    // Helper for tests to simulate receiving a message
    simulateMessage(data: any) {
        this.onmessage?.({ data: JSON.stringify(data) });
    }
}

/**
 * Setup global mocks for a test file.
 */
export function setupInfraMocks() {
    (global as any).indexedDB = mockIndexedDB;
    (global as any).window = global;
    (global as any).WebSocket = MockWebSocket;
    (global as any).crypto = mockCrypto;
    (global as any).TextEncoder = class { encode(s: string) { return new Uint8Array(Buffer.from(s)); } };
    (global as any).TextDecoder = class { decode(b: Uint8Array) { return Buffer.from(b).toString(); } };

    // --- WebRTC Mock ---
    (global as any).RTCPeerConnection = class {
        connectionState = 'new';
        iceGatheringState = 'new';
        onicecandidate: any = null;
        onconnectionstatechange: any = null;
        onicegatheringstatechange: any = null;
        ondatachannel: any = null;
        localDescription = null;

        createOffer() { return Promise.resolve({ type: 'offer', sdp: 'mock-sdp' }); }
        createAnswer() { return Promise.resolve({ type: 'answer', sdp: 'mock-sdp' }); }
        setLocalDescription() { return Promise.resolve(); }
        setRemoteDescription() { 
            this.connectionState = 'connected';
            setTimeout(() => this.onconnectionstatechange?.(), 0);
            return Promise.resolve(); 
        }
        createDataChannel() { 
            return {
                onopen: null, onclose: null, onmessage: null, onerror: null,
                readyState: 'open',
                send: () => {}
            };
        }
        close() {}
    };

    // --- Compression Mock (Passthrough) ---
    (global as any).CompressionStream = class {
        constructor() {
            return {
                writable: new WritableStream({
                    write(chunk: any) { this.chunk = chunk; },
                } as any),
                readable: new ReadableStream({
                    start(controller: ReadableStreamDefaultController) { controller.enqueue(new Uint8Array([120, 156, 1, 0, 0, 255, 255])); controller.close(); }
                } as any)
            };
        }
    };
    (global as any).DecompressionStream = class { constructor() { } };
    
    (global as any).Blob = class { 
        constructor(public parts: any[]) {}
        stream() { return new ReadableStream({ start(c) { c.enqueue(new Uint8Array([1, 2, 3])); c.close(); } }); }
    };
    (global as any).Response = class {
        constructor(public body: any) {}
        arrayBuffer() { return Promise.resolve(new ArrayBuffer(8)); }
        text() { return Promise.resolve('{"k":"pk","s":{"t":"offer","d":"sdp"}}'); }
    };
}
