import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

export enum ConnectionStatus {
  new = "new",
  started = "started",
  readyToAccept = "readyToAccept",
  accepted = "accepted",
  answered = "answered",
  connected = "established",
  closed = "closed"
};

export class Connection {
  id: string
  peerConnection: RTCPeerConnection
  localPlayerId?: string
  localPlayerName: string
  localPublicKey?: string
  remotePlayerName: string
  remotePublicKey?: string
  dataChannel?: RTCDataChannel
  iceCandidates: RTCIceCandidate[]
  status: ConnectionStatus
  public isHostConnection: boolean = false;
  signal: Signal | null = null
  serializedSignal: string = ""
  iceGatheringState: RTCIceGatheringState
  private messageListeners: ((data: any) => void)[] = []
  onClose?: () => void
  private updateView: (connection: Connection) => void


  constructor(updateView: (connection: Connection) => void) {
    this.id = uuidv4();
    this.updateView = updateView;
    this.peerConnection = new RTCPeerConnection(configuration);
    this.iceGatheringState = this.peerConnection.iceGatheringState;
    this.iceCandidates = [];
    this.localPlayerName = "";
    this.remotePlayerName = "";
    this.status = ConnectionStatus.new;
    this.signal = new Signal({ type: "offer", sdp: "" }, "");

    let iceTimer: any = null;
    this.peerConnection.onicecandidate = (_event) => { // Reverted to original to maintain syntactic correctness
      if (_event.candidate) {
        this.iceCandidates.push(_event.candidate);
        // Update view when new ICE candidates are gathered if we are in started or answered status
        if (this.status === ConnectionStatus.started || this.status === ConnectionStatus.answered) {
          this.updateSignal();

          if (iceTimer) clearTimeout(iceTimer);
          iceTimer = setTimeout(() => {
            this.updateView(this);
            iceTimer = null;
          }, 200);
        }
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      logger.webrtc(this.id + ': Connection state changed to ' + state);

      if (state === "connected") {
        this.status = ConnectionStatus.connected;
        this.updateView(this);
      } else if (state === "disconnected" || state === "failed" || state === "closed") {
        this.close();
      }
    }

    this.peerConnection.onicegatheringstatechange = () => {
      this.iceGatheringState = this.peerConnection.iceGatheringState;
      logger.webrtc(this.id + ': ICE gathering state changed to ' + this.iceGatheringState);
      
      if (this.iceGatheringState === 'complete') {
        this.updateSignal();
      }
      
      this.updateView(this);
    }

  }

  private async updateSignal(publicKey?: string) {
    if (this.peerConnection.localDescription) {
      this.signal = new Signal(
        this.peerConnection.localDescription,
        publicKey
      );
      this.serializedSignal = await this.signal.serialize();
      this.updateView(this);
    }
  }

  openDataChannel() {
    this.dataChannel = this.peerConnection.createDataChannel('gameData');

    if (this.dataChannel) {
      this.dataChannel.onopen = () => logger.webrtc(this.id + ' Data channel state is: ' + this.dataChannel?.readyState);
      this.dataChannel.onclose = () => logger.webrtc(this.id + ' Data channel state is: ' + this.dataChannel?.readyState);
      this.dataChannel.onerror = (e) => logger.error(this.id + ' Error ', e);
      this.dataChannel.onmessage = (e) => {
        logger.netIn(this.id, e.data);
        this.messageListeners.forEach(listener => listener(e.data));
      };
    }
  }

  setDataChannelCallback() {
    this.peerConnection.ondatachannel = (event) => {
      logger.webrtc('Receive Channel Callback', event);
      this.dataChannel = event.channel;
      this.dataChannel.onmessage = (e) => {
        logger.netIn(this.id, e.data);
        this.messageListeners.forEach(listener => listener(e.data));
      };
      this.dataChannel.onopen = () => {
        const readyState = this.dataChannel?.readyState;
        logger.webrtc(this.id + ': Data channel state is: ' + readyState);

        if (readyState == "open") {
          logger.webrtc(this.id + ': Sending Ping (Identity)');
          this.send(JSON.stringify({
            type: 'PLAYER_IDENTITY',
            payload: {
              id: this.localPlayerId,
              name: this.localPlayerName,
              publicKey: this.localPublicKey
            }
          }));
        }
      };

      this.dataChannel.onclose = () => {
        const readyState = this.dataChannel?.readyState;
        logger.webrtc(this.id + ': Data channel state is: ' + readyState);
      };
    }
  }

  async prepareOfferSignal(playerName: string, publicKey: string) {
    console.log('[WebRTC] prepareOfferSignal - playerName:', playerName);
    this.localPlayerName = playerName;

    this.status = ConnectionStatus.new;

    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      this.status = ConnectionStatus.started;
      this.localPublicKey = publicKey;
      this.updateSignal(publicKey);
      this.updateView(this);
    } catch (e: any) {
      this.onCreateSessionDescriptionError(e);
    }
  }

  async send(text: string) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      logger.netOut(this.id, text);
      await this.dataChannel.send(text);
    }
  }

  addMessageListener(listener: (data: any) => void) {
    this.messageListeners.push(listener);
  }

  removeMessageListener(listener: (data: any) => void) {
    this.messageListeners = this.messageListeners.filter(l => l !== listener);
  }

  async acceptOffer(offerSignal: string | Signal, acceptingPlayerName: string, acceptingPublicKey: string) {
    const signal = typeof offerSignal === 'string' ? await Signal.decompress(offerSignal) : offerSignal;
    console.log('[WebRTC] acceptOffer - acceptingPlayerName:', acceptingPlayerName);

    // Store Host's name (public key will come from signaling server)
    this.remotePublicKey = signal.publicKey;
    // Store our name (Guest)
    this.localPlayerName = acceptingPlayerName;
    this.localPublicKey = acceptingPublicKey;

    // ICE Candidates are included in the SDP session description
    await this.peerConnection.setRemoteDescription(signal.session);

    try {
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      this.status = ConnectionStatus.answered;
      await this.updateSignal(acceptingPublicKey);
      this.updateView(this);

      this.updateView(this);
    } catch (e: any) {
      this.onCreateSessionDescriptionError(e);
    }
  }

  onCreateSessionDescriptionError(error: any) {
    logger.error('Failed to create session description: ' + error.toString());
  }

  async acceptAnswer(answerSignal: string | Signal) {
    const connectionSignal = typeof answerSignal === 'string' ? await Signal.decompress(answerSignal) : answerSignal;
    logger.webrtc(this.id + ': Accepting answer signal');
    console.log('[WebRTC] acceptAnswer');

    try {
      await this.peerConnection.setRemoteDescription(connectionSignal.session);
      // Store Guest's name (public key will come from signaling server)
      this.remotePublicKey = connectionSignal.publicKey;

      this.updateView(this);
    } catch (e) {
      logger.error(this.id + ": Failed to set remote description from answer", e);
    }
  }

  close() {
    if (this.dataChannel) {
      this.dataChannel.close();
    }
    this.peerConnection.close();
    this.status = ConnectionStatus.closed;
    this.onClose?.();
    this.updateView(this);
  }

}

export class Signal {
  session: RTCSessionDescriptionInit;
  publicKey?: string;

  constructor(
    session: RTCSessionDescriptionInit,
    publicKey?: string
  ) {
    this.session = session;
    this.publicKey = publicKey;
  }

  // Key aliasing for smaller JSON
  private toAliased(): any {
    return {
      k: this.publicKey,
      s: {
        t: this.session.type,
        d: this.session.sdp
      }
    };
  }

  private static fromAliased(data: any): Signal {
    return new Signal(
      { type: data.s.t, sdp: data.s.d },
      data.k
    );
  }

  async serialize(): Promise<string> {
    const json = JSON.stringify(this.toAliased());
    const stream = new Blob([json]).stream();
    const compressedStream = stream.pipeThrough(new CompressionStream("gzip"));
    const response = new Response(compressedStream);
    const buffer = await response.arrayBuffer();
    
    // URL-safe Base64
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  static async decompress(content: string): Promise<Signal> {
    try {
      // Handle both old Base64 and new URL-safe Base64
      const base64 = content.replace(/-/g, "+").replace(/_/g, "/");
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      
      const stream = new Blob([bytes]).stream();
      const decompressedStream = stream.pipeThrough(new DecompressionStream("gzip"));
      const response = new Response(decompressedStream);
      const json = await response.text();
      const data = JSON.parse(json);
      
      // Check if it's aliased or old format
      if (data.s) {
        return this.fromAliased(data);
      }
      return new Signal(data.session, data.publicKey);
    } catch (e) {
      // Fallback to plain JSON/Base64 if Gzip fails
      try {
        const raw = atob(content);
        const data = JSON.parse(raw);
        return new Signal(data.session, data.publicKey);
      } catch {
        throw new Error("Failed to decompress or parse signal");
      }
    }
  }
}



const configuration: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};





