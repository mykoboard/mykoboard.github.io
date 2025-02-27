import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { GameCard } from "@/components/GameCard";
import { Header } from "@/components/Header";


const games = [
    { id: 'tic-tac-to', name: "Tic-Tac-Toe", image: "/img/games/tic-tac-to/card.webp" },
];

export default function GameSelection() {
    const [search, setSearch] = useState("");
    const [favorites, setFavorites] = useState([]);

    useEffect(() => {
        const storedFavorites = JSON.parse(localStorage.getItem("favorites")) || [];
        setFavorites(storedFavorites);
    }, []);

    const toggleFavorite = (gameId) => {
        let updatedFavorites;
        if (favorites.includes(gameId)) {
            updatedFavorites = favorites.filter((id) => id !== gameId);
        } else {
            updatedFavorites = [...favorites, gameId];
        }
        setFavorites(updatedFavorites);
        localStorage.setItem("favorites", JSON.stringify(updatedFavorites));
    };

    const filteredGames = games.filter((game) => game.name.toLowerCase().includes(search.toLowerCase()));
    const favoriteGames = filteredGames.filter((game) => favorites.includes(game.id));
    const otherGames = filteredGames.filter((game) => !favorites.includes(game.id));

    return (
        <div className="p-6">
            <Header pageTitle="Game Selection"/>
            <Input
                placeholder="Search for a game..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mb-4"
            />
            {favoriteGames.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-2">Favorites</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {favoriteGames.map((game) => (
                            <GameCard key={game.id} game={game} favorites={favorites} toggleFavorite={toggleFavorite} />
                        ))}
                    </div>
                </div>
            )}
            <h2 className="text-xl font-semibold mb-2">All Games</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {otherGames.map((game) => (
                    <GameCard key={game.id} game={game} favorites={favorites} toggleFavorite={toggleFavorite} />
                ))}
            </div>
        </div>
    );
}