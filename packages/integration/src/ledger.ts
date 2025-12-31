export interface LedgerEntry {
    index: number;
    timestamp: number;
    action: {
        type: string;
        payload: any;
    };
    prevHash: string;
    hash: string;
    signature?: string;
    signerPublicKey?: string;
}

export class Ledger {
    private entries: LedgerEntry[] = [];

    constructor(entries: LedgerEntry[] = []) {
        this.entries = entries;
    }

    static async calculateHash(entry: Omit<LedgerEntry, 'hash'>): Promise<string> {
        const data = JSON.stringify({
            index: entry.index,
            timestamp: entry.timestamp,
            action: entry.action,
            prevHash: entry.prevHash,
            signerPublicKey: entry.signerPublicKey
        });

        const msgUint8 = new TextEncoder().encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    async addEntry(action: { type: string, payload: any }): Promise<LedgerEntry> {
        const prevEntry = this.entries[this.entries.length - 1];
        const index = prevEntry ? prevEntry.index + 1 : 0;
        const prevHash = prevEntry ? prevEntry.hash : "0";
        const timestamp = Date.now();

        const entryWithoutHash = {
            index,
            timestamp,
            action,
            prevHash
        };

        const hash = await Ledger.calculateHash(entryWithoutHash);
        const entry: LedgerEntry = { ...entryWithoutHash, hash };

        this.entries.push(entry);
        return entry;
    }

    getEntries(): LedgerEntry[] {
        return [...this.entries];
    }

    async verify(): Promise<boolean> {
        for (let i = 0; i < this.entries.length; i++) {
            const entry = this.entries[i];
            const prevEntry = this.entries[i - 1];

            // Verify prevHash link
            if (i > 0) {
                if (entry.prevHash !== prevEntry.hash) return false;
            } else {
                if (entry.prevHash !== "0") return false;
            }

            // Verify current hash
            const { hash, ...rest } = entry;
            const calculatedHash = await Ledger.calculateHash(rest);
            if (calculatedHash !== hash) return false;
        }
        return true;
    }

    static fromEntries(entries: LedgerEntry[]): Ledger {
        return new Ledger(entries);
    }
}
