import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Clipboard } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Connection, ConnectionStatus } from "../lib/webrtc";

function PeerConnection({ connection,  onOfferChange, onAnswerChange,  onToggleDetails }) {
  return (
    <Card className="p-4 space-y-2 relative">
      <div className="flex justify-between items-center">
        <div className="text-lg font-semibold">{connection.playerName}</div>
        <div className="text-sm font-semibold text-gray-500">{connection.status}</div>
        <Button variant="ghost" onClick={() => onToggleDetails(connection.id)}>Show</Button>
      </div>   
        <div className="space-y-2">
          {connection.status === ConnectionStatus.readyToAccept && (
            <div className="space-y-2">
              <Input placeholder="Enter Offer" onChange={(e) => onOfferChange(connection, e.target.value)} />
            </div>
          )}
          {connection.status === ConnectionStatus.started && (

            <div className="space-y-2 relative">
              <div className="flex justify-between items-center">
              <span className="">Offer: </span>
                <span className="truncate text-gray-500">{connection.signal.toString()}</span>
                <Button variant="ghost" onClick={() => navigator.clipboard.writeText(connection.signal.toString())}>
                  <Clipboard className="w-4 h-4" />
                </Button>
              </div>
              <Input placeholder="Enter Answer" onChange={(e) => onAnswerChange(connection, e.target.value)} />
            </div>
          )}
          {connection.status === ConnectionStatus.answerered && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="">Answer: </span>
                <span className="truncate text-gray-500">{connection.signal.toString()}</span>
                <Button variant="ghost" onClick={() => navigator.clipboard.writeText(connection.signal.toString())}>
                  <Clipboard className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
          {connection.status === ConnectionStatus.connected && (          
            <div className="space-y-2">
              <span className="text-green-500">Connection Established</span>
              <Input placeholder="Send text" onChange={(e) => connection.send(e.target.value)} />
            </div>
          )}
          {connection.status === ConnectionStatus.closed && <span className="text-green-500">Connection Closed</span>}

        </div>
      
    </Card>
  );
}

export default function WebRTCConnection() {
  const [playerName, setPlayerName] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [connections, setConnections] = useState(new Map());
 
  const [expandedConnections, setExpandedConnections] = useState(new Map());

  const updateConnection = (connection) => {
    setConnections(new Map(connections.set(connection.id, connection)));
  }

  const addInitiatorConnection = () => {
    
    const connection = new Connection(updateConnection);
    connection.openDataChannel();
    connection.prepareOfferSingal(playerName);
    connection.status = ConnectionStatus.new;
    updateConnection(connection);
  };

  const connectWithOffer = () => {

    const connection =  new Connection(updateConnection);
    connection.status = ConnectionStatus.readyToAccept;
    connection.setDataChannelCallback();

    updateConnection(connection);
  };

  const updateOffer = async (connection, offer) => {
    if (!(connection instanceof Connection)) {
      return;
    }

    await connection.acceptOffer(offer, playerName, );
    connection.status = ConnectionStatus.answerered;

    updateConnection(connection);
  };

  const updateAnswer = (connection, answer) => {
    
    if (!(connection instanceof Connection)) {
      return;
    }
   
    connection.acceptAnswer(answer);
    updateConnection(connection);
  };


  const toggleDetails = (id) => {
    setExpandedConnections(new Map(expandedConnections.set(id, !expandedConnections.get(id))));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Modal for setting player name */}
      <Dialog open={isModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Your Player Name</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
            />
            <Button onClick={() => setIsModalOpen(!playerName)}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Display Player Name */}
      {playerName && <div className="text-xl font-semibold">Player: {playerName}</div>}

      {/* Peer Connections List */}
      <div className="space-y-4">
        {[...connections.entries()].map(([id, conn]) => (
          <PeerConnection
            key={id}
            connection={conn}
            onOfferChange={updateOffer}
            onAnswerChange={updateAnswer}
            onToggleDetails={toggleDetails}
          />
        ))}
        <div className="flex space-x-4">
          <Button onClick={addInitiatorConnection}>Initiate New Connection</Button>
          <Button onClick={connectWithOffer}>Join Existing Offer</Button>
        </div>
      </div>
    </div>
  );
}

