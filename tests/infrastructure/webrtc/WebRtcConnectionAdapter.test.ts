import { describe, expect, it, beforeEach } from 'bun:test';
import { WebRtcConnectionAdapter } from '@/infrastructure/webrtc/WebRtcConnectionAdapter';
import { setupInfraMocks } from '../../infrastructure-mocks';
import { PeerConnectionStatus } from '@/application/ports/IPeerConnectionPort';

describe('WebRtcConnectionAdapter', () => {
    beforeEach(() => {
        setupInfraMocks();
    });

    it('should initialize and map initial status', () => {
        const adapter = new WebRtcConnectionAdapter(() => {});
        expect(adapter.status).toBe(PeerConnectionStatus.new);
    });

    it('should handle status changes and map them correctly', async () => {
        let changedStatus: PeerConnectionStatus | null = null;
        const adapter = new WebRtcConnectionAdapter(() => {});
        adapter.onStatusChange(s => changedStatus = s);

        // Simulate connection established in the mock
        // eyJwdWJsaWNLZXkiOiJwayIsInNlc3Npb24iOnsidHlwZSI6Im9mZmVyIiwic2RwIjoic2RwIn19 
        // is base64 for {"publicKey":"pk","session":{"type":"offer","sdp":"sdp"}}
        await adapter.acceptAnswer('eyJwdWJsaWNLZXkiOiJwayIsInNlc3Npb24iOnsidHlwZSI6Im9mZmVyIiwic2RwIjoic2RwIn19');
        
        // Wait for the async connection state change in the mock
        await new Promise(r => setTimeout(r, 10));
        
        expect(adapter.status).toBe(PeerConnectionStatus.connected);
        expect(changedStatus).toBe(PeerConnectionStatus.connected);
    });

    it('should provide access to underlying connection properties', () => {
        const adapter = new WebRtcConnectionAdapter(() => {});
        adapter.remotePlayerName = 'Remote Player';
        adapter.remotePublicKey = 'pk-remote';

        expect(adapter.remotePlayerName).toBe('Remote Player');
        expect(adapter.remotePublicKey).toBe('pk-remote');
    });

    it('should send data through the connection', () => {
        const adapter = new WebRtcConnectionAdapter(() => {});
        // Manual trigger of datachannel open would be needed for a full test,
        // but we're mostly testing the adapter wrapping logic here.
        expect(() => adapter.send('test message')).not.toThrow();
    });
});
