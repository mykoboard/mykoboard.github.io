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

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.iceCandidates.push(event.candidate);
        // Update view when new ICE candidates are gathered if we are in started or answered status
        if (this.status === ConnectionStatus.started || this.status === ConnectionStatus.answered) {
          this.updateSignal();
          this.updateView(this);
        }
      }
    };

    this.peerConnection.onconnectionstatechange = (event) => {
      const state = this.peerConnection.connectionState;
      console.log(this.id + ': Connection state changed to ' + state);

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

    this.dataChannel.onopen = (e) => logger.info(this.id + ' Data channel state is: ' + this.dataChannel.readyState);
    this.dataChannel.onclose = (e) => logger.info(this.id + ' Data channel state is: ' + this.dataChannel.readyState);
    this.dataChannel.onerror = (e) => logger.error(this.id + ' Error ', e);
    this.dataChannel.onmessage = (e) => {
      logger.netIn(this.id, e.data);
      this.messageListeners.forEach(listener => listener(e.data));
    };
  }

  setDataChannelCallback() {
    this.peerConnection.ondatachannel = (event) => {
      logger.info('Receive Channel Callback', event);
      this.dataChannel = event.channel;
      this.dataChannel.onmessage = (e) => {
        logger.netIn(this.id, e.data);
        this.messageListeners.forEach(listener => listener(e.data));
      };
      this.dataChannel.onopen = (e) => {
        const readyState = this.dataChannel.readyState;
        logger.info(this.id + ': Data channel state is: ' + readyState);

        if (readyState == "open") {
          logger.info(this.id + ': Sending ping');
          this.send('Ping');
        }
      };

      this.dataChannel.onclose = (e) => {
        const readyState = this.dataChannel.readyState;
        console.log(this.id + ': Data channel state is: ' + readyState);
      };
    }
  }

  prepareOfferSignal(playerName: string) {
    this.localPlayerName = playerName;
    this.status = ConnectionStatus.new;

    this.peerConnection.createOffer().then((offer) => {
      this.peerConnection.setLocalDescription(offer);

      this.status = ConnectionStatus.started;
      this.updateSignal();
      this.updateView(this);
    }, this.onCreateSessionDescriptionError);

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

    // Store Host's name
    this.remotePlayerName = signal.playerName;
    // Store our name (Guest)
    this.localPlayerName = acceptingPlayerName;

    await this.peerConnection.setRemoteDescription(signal.session);

    signal.iceCandidates.forEach((candidate) => {
      console.log(this.id + ': adding ice candidates');
      this.peerConnection.addIceCandidate(candidate)
    });

    await this.peerConnection.createAnswer().then((answer) => {
      this.peerConnection.setLocalDescription(answer);
      this.status = ConnectionStatus.answered;
      // When generating the answer, we include our own name (the guest) in the signal
      this.updateSignal();
      this.updateView(this);

      console.log(this.id + ': Answer signal generated ', this.signal);
    }, this.onCreateSessionDescriptionError);
  }

  onCreateSessionDescriptionError(error) {
    console.log('Failed to create session description: ' + error.toString());
  }

  async acceptAnswer(answerSignal: string | Signal) {
    const connectionSignal = typeof answerSignal === 'string' ? Signal.fromString(answerSignal) : answerSignal;
    console.log(this.id + ': Accepting answer signal from ' + connectionSignal.playerName);

    try {
      await this.peerConnection.setRemoteDescription(connectionSignal.session);
      // Store Guest's name
      this.remotePlayerName = connectionSignal.playerName;

      if (connectionSignal.iceCandidates) {
        console.log(this.id + `: Adding ${connectionSignal.iceCandidates.length} ICE candidates from answer`);
        connectionSignal.iceCandidates.forEach((candidate) => {
          this.peerConnection.addIceCandidate(candidate).catch(e => console.error("Error adding ICE candidate:", e));
        });
      }

      this.updateView(this);
    } catch (e) {
      console.error(this.id + ": Failed to set remote description from answer", e);
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
  session: RTCSessionDescriptionInit
  connectionId: string
  playerName: string
  iceCandidates: RTCIceCandidate[]

  constructor(
    connectionId: string,
    session: RTCSessionDescriptionInit,
    playerName: string,
    iceCandidates: RTCIceCandidate[],
  ) {
    this.session = session;
    this.connectionId = connectionId;
    this.playerName = playerName;
    this.iceCandidates = iceCandidates
    console.log(iceCandidates);
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


