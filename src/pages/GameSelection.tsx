import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { GameCard } from "@/components/GameCard";
import { Header } from "@/components/Header";
import { Search, Sparkles } from "lucide-react";
import { games as registryGames } from "@/lib/GameRegistry";

export default function GameSelection() {
    const [search, setSearch] = useState("");
    const [favorites, setFavorites] = useState<string[]>([]);

    useEffect(() => {
        const storedFavorites = JSON.parse(localStorage.getItem("favorites") || "[]");
        setFavorites(storedFavorites);
    }, []);

    const toggleFavorite = (gameId: string) => {
        let updatedFavorites;
        if (favorites.includes(gameId)) {
            updatedFavorites = favorites.filter((id) => id !== gameId);
        } else {
            updatedFavorites = [...favorites, gameId];
        }
        setFavorites(updatedFavorites);
        localStorage.setItem("favorites", JSON.stringify(updatedFavorites));
    };

    const filteredGames = registryGames.filter((game) =>
        game.name.toLowerCase().includes(search.toLowerCase()) ||
        game.description.toLowerCase().includes(search.toLowerCase())
    );

    const favoriteGames = filteredGames.filter((game) => favorites.includes(game.id));
    const otherGames = filteredGames.filter((game) => !favorites.includes(game.id));

    return (
        <div className="min-h-screen bg-slate-50/50">
            <div className="max-w-7xl mx-auto p-6 space-y-8">
                <Header pageTitle="Game Market" />

                <div className="relative max-w-2xl mx-auto group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Search for a game or genre..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 h-12 bg-white shadow-sm border-slate-200 rounded-xl focus-visible:ring-primary"
                    />
                </div>

                {favoriteGames.length > 0 && (
                    <section className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-500">
                        <div className="flex items-center gap-2 text-slate-900">
                            <Sparkles className="w-5 h-5 text-yellow-500" />
                            <h2 className="text-2xl font-bold tracking-tight">Your Favorites</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {favoriteGames.map((game) => (
                                <GameCard key={game.id} game={game} favorites={favorites} toggleFavorite={toggleFavorite} />
                            ))}
                        </div>
                    </section>
                )}

                <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                        {search ? `Search results for "${search}"` : "Discover Games"}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {otherGames.map((game) => (
                            <GameCard key={game.id} game={game} favorites={favorites} toggleFavorite={toggleFavorite} />
                        ))}
                    </div>
                    {filteredGames.length === 0 && (
                        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                            <p className="text-slate-500 text-lg">No games found matching your search.</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}