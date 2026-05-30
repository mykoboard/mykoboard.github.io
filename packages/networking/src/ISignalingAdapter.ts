export interface ISignalingAdapter extends EventTarget {
    // Methods for the network manager to send signals
    sendOffer(targetPublicKey: string, offer: string, peerName: string, sourcePublicKey: string): Promise<void>;
    sendAnswer(targetPublicKey: string, answer: string, peerName: string, sourcePublicKey: string): Promise<void>;

    // Events emitted by the adapter:
    // - 'offer': CustomEvent<{ sourcePublicKey: string; offer: string; peerName: string; targetPublicKey: string }>
    // - 'answer': CustomEvent<{ sourcePublicKey: string; answer: string; peerName: string; targetPublicKey: string }>
}
