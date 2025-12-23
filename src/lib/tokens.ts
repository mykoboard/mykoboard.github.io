import { SecureWallet } from './wallet';

export interface GameAccessClaim {
    type: 'SUBSCRIPTION' | 'GAME_ACCESS';
    playerId: string;
    expiresAt: number;
    gameId?: string;
    tier?: string;
}

export interface SignedClaim {
    claim: GameAccessClaim;
    signature: string;
    issuerPublicKey: string;
}

export class TokenManager {
    /**
     * Verify a claim presented by a peer
     */
    static async verifyClaim(signedClaim: SignedClaim): Promise<boolean> {
        const { claim, signature, issuerPublicKey } = signedClaim;

        // 1. Check expiration
        if (claim.expiresAt < Date.now()) {
            console.warn("Claim expired");
            return false;
        }

        // 2. Verify signature using issuer's public key
        // In a real app, the issuerPublicKey would be hardcoded as a "trusted root"
        return await SecureWallet.verify(claim, signature, issuerPublicKey);
    }

    /**
     * Create a self-signed claim (for development or local-first reputation)
     */
    static async createSelfSignedClaim(
        wallet: SecureWallet,
        type: GameAccessClaim['type'],
        daysValid: number = 30
    ): Promise<SignedClaim> {
        const identity = await wallet.getIdentity();
        if (!identity) throw new Error("No identity found in wallet");

        const claim: GameAccessClaim = {
            type,
            playerId: identity.id,
            expiresAt: Date.now() + (daysValid * 24 * 60 * 60 * 1000)
        };

        const signature = await wallet.sign(claim);

        return {
            claim,
            signature,
            issuerPublicKey: identity.publicKey
        };
    }
}
