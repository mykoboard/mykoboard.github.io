import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from 'uuid';

// GameCard Component
export function GameCard({ game, favorites, toggleFavorite }) {
    const naviagtion = useNavigate();

    const navigate = useNavigate();

  const goToBoard = () => {
    navigate("/games/lobby/"+ game.id +"/" + uuidv4());
  };

    return (
      <div className="relative border rounded-lg p-4 flex flex-col items-center">
        <img src={game.image} alt={game.name} className="w-32 h-32 object-cover mb-2" />
        <h3 className="text-lg font-semibold">{game.name}</h3>
        <Button className="mt-2" onClick={goToBoard}>Start Playing</Button>
        <button className="absolute top-2 right-2" onClick={() => toggleFavorite(game.id)}>
          <Star className={favorites.includes(game.id) ? "text-yellow-500" : "text-gray-400"} fill={favorites.includes(game.id) ? "yellow" : "none"} />
        </button>
      </div>
    );
  }