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
    infoComponent?: React.LazyExoticComponent<React.ComponentType<any>>;
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
        // @ts-ignore
        infoComponent: React.lazy(() => import('tic-tac-toe/GameInfo')),
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
        // @ts-ignore
        infoComponent: React.lazy(() => import('ludo/GameInfo')),
    },
    {
        id: 'galactic-hegemony',
        name: "Galactic Hegemony",
        image: "/img/games/galactic-hegemony/card.webp",
        description: "Decentralized P2P strategy game. Compete for cosmic dominance in a serverless galaxy!",
        minPlayers: 2,
        maxPlayers: 6,
        // @ts-ignore
        component: React.lazy(() => import('galactic-hegemony/GalacticHegemony')),
        // @ts-ignore
        infoComponent: React.lazy(() => import('galactic-hegemony/GameInfo')),
    },
    {
        id: 'planning-poker',
        name: "Planning Poker",
        image: "/img/games/planning-poker/card.webp",
        description: "Scrum estimation tool for teams. Vote on story points with Fibonacci cards in real-time.",
        minPlayers: 2,
        maxPlayers: 10,
        // @ts-ignore
        component: React.lazy(() => import('planning-poker/PlanningPoker')),
        // @ts-ignore
        infoComponent: React.lazy(() => import('planning-poker/GameInfo')),
    },
    {
        id: 'apex-nebula',
        name: "Apex Nebula",
        image: "/img/games/apex-nebula/card.webp",
        description: "Evolutionary strategy game based on genetic algorithms. Mutate your genome and colonize the nebula!",
        minPlayers: 2,
        maxPlayers: 4,
        // @ts-ignore
        component: React.lazy(() => import('apex-nebula/ApexNebula')),
        // @ts-ignore
        infoComponent: React.lazy(() => import('apex-nebula/GameInfo')),
    },
];

export function getGameById(id: string): GameMetadata | undefined {
    return games.find(game => game.id === id);
}
