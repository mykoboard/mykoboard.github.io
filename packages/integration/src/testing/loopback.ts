import { SimpleConnection } from '../types';

/**
 * Creates a pair of true in-memory WebRTC connections that are wired together
 * synchronously without the need for a signaling server.
 * 
 * This allows implementers to accurately test the constraints of RTCDataChannels
 * (serialization limits, latency, delivery order) completely offline.
 */
export async function createLocalWebRTCPair(): Promise<[SimpleConnection, SimpleConnection]> {
    // 1. Create the two peers
    const peerA = new RTCPeerConnection();
    const peerB = new RTCPeerConnection();

    // 2. Setup ICE Candidate loops
    peerA.onicecandidate = e => {
        if (e.candidate) peerB.addIceCandidate(e.candidate);
    };
    peerB.onicecandidate = e => {
        if (e.candidate) peerA.addIceCandidate(e.candidate);
    };

    // 3. Create the data channel on A (this initiates the negotiation)
    const channelA = peerA.createDataChannel('test-loopback');
    
    // 4. Capture channel B when it opens
    const channelBPromise = new Promise<RTCDataChannel>(resolve => {
        peerB.ondatachannel = e => resolve(e.channel);
    });

    // 5. In-memory Signaling Exchange
    const offer = await peerA.createOffer();
    await peerA.setLocalDescription(offer);
    await peerB.setRemoteDescription(offer);

    const answer = await peerB.createAnswer();
    await peerB.setLocalDescription(answer);
    await peerA.setRemoteDescription(answer);

    // 6. Wait for the channels to be fully established and open
    const channelB = await channelBPromise;

    await Promise.all([
        new Promise<void>(resolve => {
            if (channelA.readyState === 'open') resolve();
            else channelA.onopen = () => resolve();
        }),
        new Promise<void>(resolve => {
            if (channelB.readyState === 'open') resolve();
            else channelB.onopen = () => resolve();
        })
    ]);

    // 7. Wrap them in the SimpleConnection interface
    const wrapChannel = (id: string, channel: RTCDataChannel): SimpleConnection => {
        return {
            id,
            send: (data: string) => channel.send(data),
            addMessageListener: (callback: (data: string) => void) => {
                const handler = (e: MessageEvent) => callback(e.data);
                // Use addEventListener directly instead of onmessage so multiple can stack
                channel.addEventListener('message', handler as EventListener);
                // Attach the reference to the callback so we can remove it later
                (callback as any)._handler = handler;
            },
            removeMessageListener: (callback: (data: string) => void) => {
                const handler = (callback as any)._handler;
                if (handler) {
                    channel.removeEventListener('message', handler as EventListener);
                }
            }
        };
    };

    return [
        wrapChannel('peer-A', channelA),
        wrapChannel('peer-B', channelB)
    ];
}
