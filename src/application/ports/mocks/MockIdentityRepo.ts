import { IIdentityRepository } from '../IIdentityRepository';
import { PlayerIdentity } from '../../../domain/identity/PlayerIdentity';

export class MockIdentityRepo implements IIdentityRepository {
    private identity: PlayerIdentity | null = null;

    async getIdentity(): Promise<PlayerIdentity | null> {
        return this.identity;
    }

    async hasIdentity(): Promise<boolean> {
        return this.identity !== null;
    }

    async createIdentity(name: string, subscriptionToken: string): Promise<PlayerIdentity> {
        const id = `mock-id-${Date.now()}`;
        this.identity = {
            id,
            name,
            publicKey: `mock-pk-${id}`
        };
        return this.identity;
    }

    async updateIdentity(updates: Partial<PlayerIdentity>): Promise<void> {
        if (this.identity) {
            this.identity = { ...this.identity, ...updates };
        }
    }

    async sign(data: any): Promise<string> {
        return `mock-sig-${JSON.stringify(data)}`;
    }

    async verify(data: any, signatureHex: string, publicKeyHex: string): Promise<boolean> {
        return signatureHex === `mock-sig-${JSON.stringify(data)}`;
    }

    async clearIdentity(): Promise<void> {
        this.identity = null;
    }

    // Test helper
    public setIdentity(identity: PlayerIdentity): void {
        this.identity = identity;
    }
}
