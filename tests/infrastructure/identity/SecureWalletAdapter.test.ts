import { describe, expect, it, beforeEach } from 'bun:test';
import { SecureWalletAdapter } from '@/infrastructure/identity/SecureWalletAdapter';
import { setupInfraMocks } from '../../infrastructure-mocks';

describe('SecureWalletAdapter', () => {
    let wallet: SecureWalletAdapter;

    beforeEach(async () => {
        setupInfraMocks();
        wallet = SecureWalletAdapter.getInstance();
        await wallet.clearIdentity();
    });

    it('should create and retrieve an identity', async () => {
        const name = 'Test Player';
        const token = 'sub-token-123';
        
        const identity = await wallet.createIdentity(name, token);
        
        expect(identity.name).toBe(name);
        expect(identity.subscriptionToken).toBe(token);
        expect(identity.publicKey).toBeDefined();
        expect(identity.id).toBeDefined();

        const retrieved = await wallet.getIdentity();
        expect(retrieved).toEqual(identity);
    });

    it('should sign and verify data', async () => {
        await wallet.createIdentity('Signer', 'token');
        const data = { message: 'Hello P2P' };
        
        const signature = await wallet.sign(data);
        expect(signature).toBeDefined();

        const identity = await wallet.getIdentity();
        const isValid = await wallet.verify(data, signature, identity!.publicKey);
        expect(isValid).toBe(true);
    });

    it('should update an identity', async () => {
        await wallet.createIdentity('Old Name', 'token');
        await wallet.updateIdentity({ name: 'New Name' });
        
        const identity = await wallet.getIdentity();
        expect(identity?.name).toBe('New Name');
    });
});

