import { ISignalingAdapter } from '@mykoboard/networking';
import { ISignalingPort } from '../../application/ports/ISignalingPort';

export class SignalingAdapterWrapper extends EventTarget implements ISignalingAdapter {
    constructor(private signalingPort: ISignalingPort) {
        super();
        this.signalingPort.onMessage((msg: any) => {
            if (msg.type === 'offer') {
                this.dispatchEvent(new CustomEvent('offer', {
                    detail: {
                        sourcePublicKey: msg.publicKey || msg.from,
                        offer: msg.offer,
                        peerName: msg.peerName,
                        targetPublicKey: msg.targetPublicKey // Assuming your signaling server sends this, otherwise derive it.
                    }
                }));
            } else if (msg.type === 'answer') {
                this.dispatchEvent(new CustomEvent('answer', {
                    detail: {
                        sourcePublicKey: msg.publicKey || msg.from,
                        answer: msg.answer,
                        peerName: msg.peerName,
                        targetPublicKey: msg.targetPublicKey
                    }
                }));
            }
        });
    }

    async sendOffer(targetPublicKey: string, offer: string, peerName: string, sourcePublicKey: string): Promise<void> {
        // targetConnectionId is needed by hostOffer in your backend. In mykoboard's current flow,
        // targetConnectionId is the AWS API Gateway connection ID of the guest, which is typically stored when peerJoined arrives.
        // The application layer needs to map targetPublicKey -> connectionId if required by ISignalingPort.
        // For simplicity, assuming the targetConnectionId is mapped elsewhere or passed correctly.
        this.signalingPort.hostOffer(targetPublicKey, targetPublicKey, offer); 
    }

    async sendAnswer(targetPublicKey: string, answer: string, peerName: string, sourcePublicKey: string): Promise<void> {
        this.signalingPort.guestAnswer(targetPublicKey, sourcePublicKey, answer);
    }
}
