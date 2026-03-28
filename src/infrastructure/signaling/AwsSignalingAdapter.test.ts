import { describe, expect, it, beforeEach } from 'bun:test';
import { AwsSignalingAdapter } from './AwsSignalingAdapter';
import { setupInfraMocks, MockWebSocket } from '../../tests/infrastructure-mocks';

describe('AwsSignalingAdapter', () => {
    let adapter: AwsSignalingAdapter;

    beforeEach(() => {
        setupInfraMocks();
        adapter = new AwsSignalingAdapter();
    });

    it('should connect to the signaling server', async () => {
        const connectPromise = adapter.connect('test-token', 'pk-123', 'sig-456');
        
        // At this point, adapter.connect is waiting for onopen
        const socket = (adapter as any).socket as MockWebSocket;
        expect(socket).toBeDefined();
        expect(socket.url).toContain('x-api-key=test-token');
        expect(socket.url).toContain('x-pubkey=pk-123');

        await connectPromise;
        expect(adapter.isConnected).toBe(true);
    });

    it('should send hostRegister message', async () => {
        await adapter.connect('token');
        adapter.hostRegister('board-1', 'tic-tac-toe', 'Host', 'pk-host');

        const socket = (adapter as any).socket as MockWebSocket;
        const sent = JSON.parse(socket.sentMessages[0]);
        expect(sent.action).toBe('sendMessage');
        expect(sent.type).toBe('hostRegister');
        expect(sent.boardId).toBe('board-1');
    });

    it('should handle incoming messages via callback', async () => {
        await adapter.connect('token');
        let received: any = null;
        adapter.onMessage(msg => received = msg);

        const socket = (adapter as any).socket as MockWebSocket;
        const testMsg = { type: 'guestJoined', peerName: 'Guest' };
        socket.simulateMessage(testMsg);

        expect(received).toEqual(testMsg);
    });

    it('should send heartbeat pings', async () => {
        await adapter.connect('token');
        const interval = (adapter as any).pingInterval;
        expect(interval).toBeDefined();
    });
});
