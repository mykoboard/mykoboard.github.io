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
  localPlayerName: string
  remotePlayerName: string
  remotePublicKey?: string
  dataChannel: RTCDataChannel
  iceCandidates: RTCIceCandidate[]
  status: ConnectionStatus
  signal: Signal
  private messageListeners: ((data: any) => void)[] = []
  onClose?: () => void
  private updateView: (connection: Connection) => void


  constructor(updateView: (connection: Connection) => void) {
    this.id = uuidv4();
    this.updateView = updateView;
    this.peerConnection = new RTCPeerConnection(configuration);
    this.iceCandidates = [];

    let iceTimer: any = null;
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.iceCandidates.push(event.candidate);
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

    this.peerConnection.onconnectionstatechange = (event) => {
      const state = this.peerConnection.connectionState;
      logger.webrtc(this.id + ': Connection state changed to ' + state);

      if (state === "connected") {
        this.status = ConnectionStatus.connected;
        this.updateView(this);
      } else if (state === "disconnected" || state === "failed" || state === "closed") {
        this.close();
      }
    }

  }

  private updateSignal(playerName?: string) {
    if (this.peerConnection.localDescription) {
      this.signal = new Signal(
        this.id,
        this.peerConnection.localDescription,
        playerName || this.localPlayerName,
        this.iceCandidates
      );
    }
  }

  openDataChannel() {
    this.dataChannel = this.peerConnection.createDataChannel('gameData');

    this.dataChannel.onopen = (e) => logger.webrtc(this.id + ' Data channel state is: ' + this.dataChannel.readyState);
    this.dataChannel.onclose = (e) => logger.webrtc(this.id + ' Data channel state is: ' + this.dataChannel.readyState);
    this.dataChannel.onerror = (e) => logger.error(this.id + ' Error ', e);
    this.dataChannel.onmessage = (e) => {
      logger.netIn(this.id, e.data);
      this.messageListeners.forEach(listener => listener(e.data));
    };
  }

  setDataChannelCallback() {
    this.peerConnection.ondatachannel = (event) => {
      logger.webrtc('Receive Channel Callback', event);
      this.dataChannel = event.channel;
      this.dataChannel.onmessage = (e) => {
        logger.netIn(this.id, e.data);
        this.messageListeners.forEach(listener => listener(e.data));
      };
      this.dataChannel.onopen = (e) => {
        const readyState = this.dataChannel.readyState;
        logger.webrtc(this.id + ': Data channel state is: ' + readyState);

        if (readyState == "open") {
          logger.webrtc(this.id + ': Sending ping');
          this.send('Ping');
        }
      };

      this.dataChannel.onclose = (e) => {
        const readyState = this.dataChannel.readyState;
        logger.webrtc(this.id + ': Data channel state is: ' + readyState);
      };
    }
  }

  async prepareOfferSignal(playerName: string) {
    console.log('[WebRTC] prepareOfferSignal - playerName:', playerName);
    this.localPlayerName = playerName;
    this.status = ConnectionStatus.new;

    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      this.status = ConnectionStatus.started;
      this.updateSignal();
      this.updateView(this);
    } catch (e) {
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

  async acceptOffer(offerSignal: string | Signal, acceptingPlayerName: string) {
    const signal = typeof offerSignal === 'string' ? Signal.fromString(offerSignal) : offerSignal;
    console.log('[WebRTC] acceptOffer - acceptingPlayerName:', acceptingPlayerName);

    // Store Host's name (public key will come from signaling server)
    this.remotePlayerName = signal.playerName;
    // Store our name (Guest)
    this.localPlayerName = acceptingPlayerName;

    await this.peerConnection.setRemoteDescription(signal.session);

    signal.iceCandidates.forEach((candidate) => {
      this.peerConnection.addIceCandidate(candidate)
    });

    try {
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      this.status = ConnectionStatus.answered;
      this.updateSignal();
      this.updateView(this);

      this.updateView(this);
    } catch (e) {
      this.onCreateSessionDescriptionError(e);
    }
  }

  onCreateSessionDescriptionError(error) {
    logger.error('Failed to create session description: ' + error.toString());
  }

  async acceptAnswer(answerSignal: string | Signal) {
    const connectionSignal = typeof answerSignal === 'string' ? Signal.fromString(answerSignal) : answerSignal;
    logger.webrtc(this.id + ': Accepting answer signal from ' + connectionSignal.playerName);
    console.log('[WebRTC] acceptAnswer - Guest name:', connectionSignal.playerName);

    try {
      await this.peerConnection.setRemoteDescription(connectionSignal.session);
      // Store Guest's name (public key will come from signaling server)
      this.remotePlayerName = connectionSignal.playerName;

      if (connectionSignal.iceCandidates) {
        logger.webrtc(this.id + `: Adding ${connectionSignal.iceCandidates.length} ICE candidates from answer`);
        connectionSignal.iceCandidates.forEach((candidate) => {
          this.peerConnection.addIceCandidate(candidate).catch(e => logger.error("Error adding ICE candidate:", e));
        });
      }

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
  connectionId: string;
  session: RTCSessionDescriptionInit;
  playerName: string;
  iceCandidates: RTCIceCandidate[];

  constructor(
    connectionId: string,
    session: RTCSessionDescriptionInit,
    playerName: string,
    iceCandidates: RTCIceCandidate[]
  ) {
    this.session = session;
    this.connectionId = connectionId;
    this.playerName = playerName;
    this.iceCandidates = iceCandidates;
  }

  toString(): string {
    return btoa(JSON.stringify(this));
  }

  static fromString(content: string): Signal {

    const data = JSON.parse(atob(content));

    return new Signal(data.connectionId, data.session, data.playerName, data.iceCandidates);
  }
}


const peerConnections: { [key: string]: Connection } = {};
const configuration: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

// with creating offer I want to connect to peer
//  - then I need to provide my player id so peer can track/name connections
// when creating answer I accept connection
// -- is store connections with player id generate answer and send it back

// what about data channels ??
// Send an offer to the lobby


export async function acceptAnswer(answer: string) {

  const connectionSignal = Signal.fromString(answer);
  const pearConnection = peerConnections[connectionSignal.connectionId];
  pearConnection.peerConnection.setRemoteDescription(connectionSignal.session);
  pearConnection.remotePlayerName = connectionSignal.playerName;
}


