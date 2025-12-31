import React from 'react';
import { GameProps } from '@mykoboard/integration';

export interface GameMetadata {
    id: string;
    name: string;
    image: string;
    description: string;
    minPlayers: number;
    maxPlayers: number;
    component: React.LazyExoticComponent<React.ComponentType<GameProps>>;
}

export const games: GameMetadata[] = [
    {
        id: 'tic-tac-to',
        name: "Tic-Tac-Toe",
        image: "/img/games/tic-tac-to/card.webp",
        description: "Classic strategy game for two players. Get three in a row to win!",
        minPlayers: 2,
        maxPlayers: 2,
        // @ts-ignore
        component: React.lazy(() => import('tic-tac-toe/TicTacToe')),
    },
    {
        id: 'ludo',
        name: "Ludo",
        image: "/img/games/ludo/card.webp",
        description: "Standard Ludo game for 2-4 players. Race your pieces to the finish!",
        minPlayers: 2,
        maxPlayers: 4,
        // @ts-ignore
        component: React.lazy(() => import('ludo/Ludo')),
    },
];

export function getGameById(id: string): GameMetadata | undefined {
    return games.find(game => game.id === id);
}
