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
        <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto p-6 space-y-12">
                <Header />
                <div className="relative max-w-2xl mx-auto group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors z-20" />
                    <Input
                        placeholder="Search for a game or genre..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-12 h-14 bg-white/5 backdrop-blur-xl border-white/10 rounded-2xl focus-visible:ring-primary text-white placeholder:text-muted-foreground shadow-glass-dark neon-border"
                    />
                </div>

                {favoriteGames.length > 0 && (
                    <section className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
                        <div className="flex items-center gap-3">
                            <Sparkles className="w-6 h-6 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
                            <h2 className="text-3xl font-black tracking-tight text-white uppercase">Your <span className="text-gradient">Favorites</span></h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {favoriteGames.map((game) => (
                                <GameCard key={game.id} game={game} favorites={favorites} toggleFavorite={toggleFavorite} />
                            ))}
                        </div>
                    </section>
                )}

                <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <h2 className="text-3xl font-black tracking-tight text-white uppercase">
                        {search ? (
                            <>Search results for <span className="text-gradient">"{search}"</span></>
                        ) : (
                            <>Discover <span className="text-gradient">Games</span></>
                        )}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {otherGames.map((game) => (
                            <GameCard key={game.id} game={game} favorites={favorites} toggleFavorite={toggleFavorite} />
                        ))}
                    </div>
                    {filteredGames.length === 0 && (
                        <div className="text-center py-20 glass-dark rounded-3xl border border-dashed border-white/10 shadow-glass-dark">
                            <p className="text-muted-foreground text-xl font-light">No games match your frequency.</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}