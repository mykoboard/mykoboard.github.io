import { v4 as uuidv4 } from 'uuid';

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
  playerName: string
  dataChannel: RTCDataChannel
  iceCandidates: RTCIceCandidate[]
  status: ConnectionStatus
  signal: Signal
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
      if (this.peerConnection.connectionState == "connected") {
        console.log(this.id + ': Connection established');
        this.status = ConnectionStatus.connected;
        this.updateView(this)
      }
    }

  }

  private updateSignal() {
    if (this.peerConnection.localDescription) {
      this.signal = new Signal(
        this.id,
        this.peerConnection.localDescription,
        this.playerName,
        this.iceCandidates
      );
    }
  }

  openDataChannel() {
    this.dataChannel = this.peerConnection.createDataChannel('gameData');

    this.dataChannel.onopen = (e) => console.log(this.id + ' Data channel state is: ' + this.dataChannel.readyState);
    this.dataChannel.onclose = (e) => console.log(this.id + ' Data channel state is: ' + this.dataChannel.readyState);
    this.dataChannel.onerror = (e) => console.log(this.id + ' Error ', e);
    this.dataChannel.onmessage = (e) => console.log(this.id + ': Received Message: ' + e.data);
  }

  setDataChannelCallback() {
    this.peerConnection.ondatachannel = (event) => {
      console.log('Receive Channel Callback', event);
      this.dataChannel = event.channel;
      this.dataChannel.onmessage = (e) => console.log(this.id + ': Received Message: ' + e.data);
      this.dataChannel.onopen = (e) => {
        const readyState = this.dataChannel.readyState;
        console.log(this.id + ': Data channel state is: ' + readyState);

        if (readyState == "open") {
          console.log(this.id + ': Sending ping');
          this.dataChannel.send('Ping');
        }
      };

      this.dataChannel.onclose = (e) => {
        const readyState = this.dataChannel.readyState;
        console.log(this.id + ': Data channel state is: ' + readyState);
      };
    }
  }

  prepareOfferSignal(playerName: string) {
    this.playerName = playerName;
    this.status = ConnectionStatus.new;

    this.peerConnection.createOffer().then((offer) => {
      this.peerConnection.setLocalDescription(offer);

      this.status = ConnectionStatus.started;
      this.updateSignal();
      this.updateView(this);
    }, this.onCreateSessionDescriptionError);

  }

  async send(text: string) {
    await this.dataChannel.send(text);
  }

  async acceptOffer(offerSignal: string, acceptingPlayerName: string) {
    const signal = Signal.fromString(offerSignal);


    this.playerName = acceptingPlayerName; // This is the name of the player accepting the offer

    await this.peerConnection.setRemoteDescription(signal.session);

    signal.iceCandidates.forEach((candidate) => {
      console.log(this.id + ': adding ice candidates');
      this.peerConnection.addIceCandidate(candidate)
    });

    await this.peerConnection.createAnswer().then((answer) => {

      this.peerConnection.setLocalDescription(answer);

      this.status = ConnectionStatus.answered;
      this.updateSignal();
      this.updateView(this);

      console.log(this.id + ': Answer signal generated ', this.signal);
    }, this.onCreateSessionDescriptionError);

  }

  onCreateSessionDescriptionError(error) {
    console.log('Failed to create session description: ' + error.toString());
  }

  async acceptAnswer(answerSignal: string) {
    const connectionSignal = Signal.fromString(answerSignal);

    await this.peerConnection.setRemoteDescription(connectionSignal.session);
    // Note: we don't necessarily update playerName here if we want to keep the initiator's name for them
    // but we should probably store the remote player's name.

    connectionSignal.iceCandidates.forEach((candidate) => {
      console.log(this.id + ': adding ice candidates');
      this.peerConnection.addIceCandidate(candidate);
    });
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
  pearConnection.playerName = connectionSignal.playerName;
}


