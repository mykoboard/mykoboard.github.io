import { IKnownIdentityRepository, KnownIdentity } from '../IKnownIdentityRepository';

export class MockKnownIdentityRepo implements IKnownIdentityRepository {
    private identities: Map<string, KnownIdentity> = new Map();

    async addKnownIdentity(identity: KnownIdentity): Promise<void> {
        this.identities.set(identity.id, identity);
    }

    async getAllKnownIdentities(): Promise<KnownIdentity[]> {
        return Array.from(this.identities.values());
    }

    async deleteKnownIdentity(id: string): Promise<void> {
        this.identities.delete(id);
    }

    // Test helper
    public setKnownIdentity(identity: KnownIdentity): void {
        this.identities.set(identity.id, identity);
    }
}
