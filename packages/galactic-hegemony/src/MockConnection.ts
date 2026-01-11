import { SimpleConnection } from '@mykoboard/integration';

export class MockConnection implements SimpleConnection {
    private listeners: ((data: string) => void)[] = [];
    public id: string;

    constructor(id: string) {
        this.id = id;
    }

    send(data: string): void {
        console.log(`[MockConnection ${this.id}] Sending:`, JSON.parse(data));
    }

    addMessageListener(listener: (data: string) => void): void {
        this.listeners.push(listener);
    }

    removeMessageListener(listener: (data: string) => void): void {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    // Helper to simulate incoming messages
    receive(data: string): void {
        console.log(`[MockConnection ${this.id}] Receiving:`, JSON.parse(data));
        this.listeners.forEach(l => l(data));
    }
}
