import React from 'react'
import ReactDOM from 'react-dom/client'
import PlanningPoker from './PlanningPoker'
import { PlayerInfo } from '@mykoboard/integration'
import './index.css'

const mockPlayers: PlayerInfo[] = [
    { id: 'local', name: 'Developer', isLocal: true, isHost: true, status: 'game', isConnected: true }
];

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <PlanningPoker
            connections={[]}
            playerNames={['Developer']}
            playerInfos={mockPlayers}
            isInitiator={true}
            ledger={[]}
            onAddLedger={() => { }}
            onFinishGame={() => { }}
        />
    </React.StrictMode>,
)
