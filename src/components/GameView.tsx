import { GamePreparationPhase } from "./GamePreparationPhase";
import { GameActivePhase } from "./GameActivePhase";
import { GameFinishedPhase } from "./GameFinishedPhase";
import { Connection } from "../lib/webrtc";
import { PlayerList, PlayerInfo } from "./Players";

interface GameViewProps {
    GameComponent: any;
    connectedPeers: Connection[];
    playerInfos: PlayerInfo[];
    isInitiator: boolean;
    isGameStarted: boolean;
    pendingSignaling: Connection[];
    signalingMode: 'manual' | 'server' | null;
    signalingClient: any;
    isServerConnecting: boolean;
    ledger: any[];
    onAddLedger: (action: { type: string, payload: any }) => void;
    onFinishGame: () => void;
    onRemovePlayer: (id: string) => void;
    onStartGame: () => void;
    onHostAGame: () => void;
    onConnectWithOffer: () => void;
    onUpdateOffer: (connection: Connection, offer: string) => void;
    onUpdateAnswer: (connection: Connection, answer: string) => void;
    onBackToLobby: () => void;
    onCloseSession: () => void;
    onResetGame: () => void;
    onAcceptGuest: () => void;
    onRejectGuest: () => void;
    state: any;
    boardId?: string;
}

export function GameView(props: GameViewProps) {
    const { state, isGameStarted } = props;
    const isFinished = state.matches('room.finished');

    return (
        <div className="animate-in fade-in slide-in-from-top-4 duration-700">
            {isFinished ? (
                <GameFinishedPhase
                    GameComponent={props.GameComponent}
                    connectedPeers={props.connectedPeers}
                    playerInfos={props.playerInfos}
                    isInitiator={props.isInitiator}
                    ledger={props.ledger}
                    onBackToLobby={props.onBackToLobby}
                />
            ) : isGameStarted ? (
                <GameActivePhase
                    GameComponent={props.GameComponent}
                    connectedPeers={props.connectedPeers}
                    playerInfos={props.playerInfos}
                    isInitiator={props.isInitiator}
                    ledger={props.ledger}
                    onAddLedger={props.onAddLedger}
                    onFinishGame={props.onFinishGame}
                />
            ) : (
                <GamePreparationPhase
                    state={props.state}
                    isInitiator={props.isInitiator}
                    signalingMode={props.signalingMode}
                    isServerConnecting={props.isServerConnecting}
                    signalingClient={props.signalingClient}
                    pendingSignaling={props.pendingSignaling}
                    onStartGame={props.onStartGame}
                    onHostAGame={props.onHostAGame}
                    onUpdateOffer={props.onUpdateOffer}
                    onUpdateAnswer={props.onUpdateAnswer}
                    onCloseSession={props.onCloseSession}
                    onBackToLobby={props.onBackToLobby}
                    onAcceptGuest={props.onAcceptGuest}
                    onRejectGuest={props.onRejectGuest}
                    onRemovePlayer={props.onRemovePlayer}
                />
            )}

            <div className="mt-8">
                <PlayerList
                    players={props.playerInfos}
                    onRemove={props.isInitiator ? props.onRemovePlayer : undefined}
                />
            </div>
        </div>
    );
}
