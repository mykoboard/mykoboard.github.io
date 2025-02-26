import { v4 as uuidv4 } from 'uuid';

export enum ConnectionStatus {
  new = "new",
  started = "started",
  readyToAccept = "readyToAccept",
  accepted = "accpeted",
  answerered = "answered",
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


  constructor(updateView) {
    this.id = uuidv4();
    this.peerConnection = new RTCPeerConnection(configuration);
    this.iceCandidates = [];

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.iceCandidates.push(event.candidate);
      }
    };

    this.peerConnection.onconnectionstatechange = (event) => {

      if (this.peerConnection.connectionState == "connected") {
        console.log(this.id + ': Connection established');
        this.status = ConnectionStatus.connected;
        updateView(this)
      }
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

  prepareOfferSingal(playerName: string) {
    this.status = ConnectionStatus.new;

    this.peerConnection.createOffer().then((offer) => {
      this.peerConnection.setLocalDescription(offer);

      this.status = ConnectionStatus.started;
      this.signal = new Signal(
        this.id,
        offer,
        playerName,
        this.iceCandidates
      );
    }, this.onCreateSessionDescriptionError);

  }

  async send(text: string) {
    await this.dataChannel.send(text);
  }

  async acceptOffer(offerSignal: string, acceptingPlayerName: string) {
    const signal = Signal.fromString(offerSignal);


    this.playerName = signal.playerName;

    this.peerConnection.setRemoteDescription(signal.session);

    signal.iceCandidates.forEach((candidate) => {
      console.log(this.id + ': adding ice candidates');
      this.peerConnection.addIceCandidate(candidate)
    });

    await this.peerConnection.createAnswer().then((answer) => {

      this.peerConnection.setLocalDescription(answer);

      this.signal = new Signal(
        this.id,
        answer,
        acceptingPlayerName,
        this.iceCandidates
      );

      console.log(this.id + ': Answer singal generated ', this.signal);
    }, this.onCreateSessionDescriptionError);

  }

  onCreateSessionDescriptionError(error) {
    console.log('Failed to create session description: ' + error.toString());
  }

  acceptAnswer(answerSignal: string) {
    const connectionSignal = Signal.fromString(answerSignal);

    this.peerConnection.setRemoteDescription(connectionSignal.session);
    this.playerName = connectionSignal.playerName;

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


