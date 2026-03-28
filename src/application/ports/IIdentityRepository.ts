import { Ref } from 'vue';
import { PlayerIdentity } from '../../domain/identity/PlayerIdentity';

export interface IIdentityRepository {
    readonly identity: Ref<PlayerIdentity | null>;
    readonly isLoading: Ref<boolean>;
    getIdentity(): Promise<PlayerIdentity | null>;
    hasIdentity(): Promise<boolean>;
    createIdentity(name: string, subscriptionToken: string): Promise<PlayerIdentity>;
    updateIdentity(updates: Partial<PlayerIdentity>): Promise<void>;
    sign(data: any): Promise<string>;
    verify(data: any, signatureHex: string, publicKeyHex: string): Promise<boolean>;
    clearIdentity(): Promise<void>;
}
