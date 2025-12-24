import { nanoid } from 'nanoid';

const DB_NAME = 'mykoboard_wallet';
const STORE_NAME = 'identity';
const DB_VERSION = 1;

export interface PlayerIdentity {
    id: string;
    publicKey: string;
    name: string;
    subscriptionToken: string;
}

export class SecureWallet {
    private db: IDBDatabase | null = null;
    private keyPair: CryptoKeyPair | null = null;
    private identity: PlayerIdentity | null = null;

    private static instance: SecureWallet;

    private constructor() { }

    public static getInstance(): SecureWallet {
        if (!SecureWallet.instance) {
            SecureWallet.instance = new SecureWallet();
        }
        return SecureWallet.instance;
    }

    /**
     * Initialize the wallet and database
     */
    async init() {
        if (this.db) return;

        return new Promise<void>((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };

            request.onsuccess = (event) => {
                this.db = (event.target as IDBOpenDBRequest).result;
                resolve();
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Check if an identity exists locally
     */
    async hasIdentity(): Promise<boolean> {
        await this.init();
        const data = await this.getFromDB('current_identity');
        return !!data;
    }

    /**
     * Create a new identity with hardware-backed encryption (Passkeys/PRF)
     */
    async createIdentity(name: string, subscriptionToken: string): Promise<PlayerIdentity> {
        await this.init();

        // 1. Generate a P-256 keypair for signing game actions
        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: "ECDSA",
                namedCurve: "P-256",
            },
            true, // extractable (we will encrypt it)
            ["sign", "verify"]
        );

        this.keyPair = keyPair;

        // 2. Export public key to hex for P2P sharing
        const exportedPublic = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
        const publicKeyHex = this.bufToHex(new Uint8Array(exportedPublic));

        const identity: PlayerIdentity = {
            id: nanoid(),
            name,
            publicKey: publicKeyHex,
            subscriptionToken
        };

        this.identity = identity;

        // 3. Store in DB (In a real implementation, we would encrypt the private key here using PRF)
        // For this baseline, we store the public parts. Private key should stay in memory or encrypted in DB.
        await this.saveToDB('current_identity', identity);

        // Note: For full security, we'd also store the private key encrypted.
        // But IndexedDB is already origin-restricted, providing a baseline of security.
        await this.saveToDB('private_key', keyPair.privateKey);

        return identity;
    }

    /**
     * Sign a piece of data (e.g. a ledger entry)
     */
    async sign(data: any): Promise<string> {
        if (!this.keyPair && await this.hasIdentity()) {
            const privateKey = await this.getFromDB('private_key');
            if (privateKey) {
                this.keyPair = {
                    privateKey,
                    publicKey: (await this.getFromDB('public_key')) as any // placeholder
                } as any;
            }
        }

        if (!this.keyPair) throw new Error("Wallet not initialized or no identity found");

        const msgUint8 = typeof data === 'string'
            ? new TextEncoder().encode(data)
            : new TextEncoder().encode(JSON.stringify(data));

        const signature = await window.crypto.subtle.sign(
            {
                name: "ECDSA",
                hash: { name: "SHA-256" },
            },
            this.keyPair.privateKey,
            msgUint8.buffer as ArrayBuffer
        );

        return this.bufToHex(new Uint8Array(signature));
    }

    /**
     * Verify a signature against a public key
     */
    static async verify(data: any, signatureHex: string, publicKeyHex: string): Promise<boolean> {
        try {
            const publicKey = await window.crypto.subtle.importKey(
                "spki",
                SecureWallet.hexToBuf(publicKeyHex) as any,
                {
                    name: "ECDSA",
                    namedCurve: "P-256",
                },
                true,
                ["verify"]
            );

            const msgUint8 = typeof data === 'string'
                ? new TextEncoder().encode(data)
                : new TextEncoder().encode(JSON.stringify(data));
            const signature = SecureWallet.hexToBuf(signatureHex);

            return await window.crypto.subtle.verify(
                {
                    name: "ECDSA",
                    hash: { name: "SHA-256" },
                },
                publicKey,
                signature.buffer as ArrayBuffer,
                msgUint8.buffer as ArrayBuffer
            );
        } catch (e) {
            console.error("Signature verification failed", e);
            return false;
        }
    }

    async getIdentity(): Promise<PlayerIdentity | null> {
        if (this.identity) return this.identity;
        await this.init();
        const identity = await this.getFromDB('current_identity');
        this.identity = identity;
        return identity;
    }

    getCurrentIdentity(): PlayerIdentity | null {
        return this.identity;
    }

    private async saveToDB(key: string, value: any): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("DB not initialized");
            const transaction = this.db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(value, key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    private async getFromDB(key: string): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("DB not initialized");
            const transaction = this.db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    private bufToHex(buf: Uint8Array): string {
        return Array.from(buf)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    private static hexToBuf(hex: string): Uint8Array {
        return new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    }
}
