import React from 'react';

export interface GameMetadata {
    id: string;
    name: string;
    image: string;
    description: string;
    component: React.LazyExoticComponent<React.ComponentType<any>>;
}

export const games: GameMetadata[] = [
    {
        id: 'tic-tac-to',
        name: "Tic-Tac-Toe",
        image: "/img/games/tic-tac-to/card.webp",
        description: "Classic strategy game for two players. Get three in a row to win!",
        component: React.lazy(() => import('../components/games/TicTacToe')),
    },
];

export function getGameById(id: string): GameMetadata | undefined {
    return games.find(game => game.id === id);
}
