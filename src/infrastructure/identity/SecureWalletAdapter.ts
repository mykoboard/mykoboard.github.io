import { nanoid } from 'nanoid';
import { PlayerIdentity } from '../../domain/identity/PlayerIdentity';
import { IIdentityRepository } from '../../application/ports/IIdentityRepository';
import { ref, Ref } from 'vue';

const DB_NAME = 'mykoboard_wallet';
const STORE_NAME = 'identity';
const DB_VERSION = 2;

export class SecureWalletAdapter implements IIdentityRepository {
    private db: IDBDatabase | null = null;
    private keyPair: CryptoKeyPair | null = null;
    public readonly identity = ref<PlayerIdentity | null>(null);
    public readonly isLoading = ref<boolean>(false);

    private static instance: SecureWalletAdapter;

    private constructor() { }

    public static getInstance(): SecureWalletAdapter {
        if (!SecureWalletAdapter.instance) {
            SecureWalletAdapter.instance = new SecureWalletAdapter();
        }
        return SecureWalletAdapter.instance;
    }

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

    async hasIdentity(): Promise<boolean> {
        await this.init();
        const data = await this.getFromDB('current_identity');
        return !!data;
    }

    async createIdentity(name: string, subscriptionToken: string): Promise<PlayerIdentity> {
        await this.init();

        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: "ECDSA",
                namedCurve: "P-256",
            },
            true,
            ["sign", "verify"]
        );

        this.keyPair = keyPair;

        const exportedPublic = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
        const publicKeyHex = this.bufToHex(new Uint8Array(exportedPublic));

        const identity: PlayerIdentity = {
            id: nanoid(),
            name,
            publicKey: publicKeyHex,
            subscriptionToken
        };

        this.identity.value = identity;

        await this.saveToDB('current_identity', identity);
        await this.saveToDB('private_key', keyPair.privateKey);

        return identity;
    }

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

    async verify(data: any, signatureHex: string, publicKeyHex: string): Promise<boolean> {
        try {
            const publicKey = await window.crypto.subtle.importKey(
                "spki",
                SecureWalletAdapter.hexToBuf(publicKeyHex) as any,
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
            const signature = SecureWalletAdapter.hexToBuf(signatureHex);

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
        if (this.identity.value) return this.identity.value;
        this.isLoading.value = true;
        try {
            await this.init();
            const identity = await this.getFromDB('current_identity');
            this.identity.value = identity;
            return identity;
        } finally {
            this.isLoading.value = false;
        }
    }

    async updateIdentity(updates: Partial<PlayerIdentity>): Promise<void> {
        await this.init();
        const ident = await this.getIdentity();
        if (!ident) throw new Error("No identity found to update");

        const updatedIdentity = { ...ident, ...updates };
        this.identity.value = updatedIdentity;
        await this.saveToDB('current_identity', updatedIdentity);
    }

    async clearIdentity(): Promise<void> {
        await this.init();
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("DB not initialized");
            const transaction = this.db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();
            request.onsuccess = () => {
                this.identity.value = null;
                this.keyPair = null;
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
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

export const wallet = SecureWalletAdapter.getInstance();
