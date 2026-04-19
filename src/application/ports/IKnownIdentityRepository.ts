export interface KnownIdentity {
    id: string; // Node Identifier
    publicKey: string;
    name: string; // Display Name
    addedAt: number;
}

export interface IKnownIdentityRepository {
    addKnownIdentity(identity: KnownIdentity): Promise<void>;
    getAllKnownIdentities(): Promise<KnownIdentity[]>;
    deleteKnownIdentity(id: string): Promise<void>;
    isKnown(publicKey: string): Promise<boolean>;
}
