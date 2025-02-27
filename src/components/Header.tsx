import { User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function Header({ pageTitle }) {
    const isUsernameSet = () => {
        return !localStorage.getItem("playerName");
    }

    const [playerName, setPlayerName] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(isUsernameSet());
  

    const handlePlayerNameChange = (playerName: string) => {
        localStorage.setItem("playerName", playerName);
        setPlayerName(playerName);
    }

   

    return (
        <header className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">{pageTitle}</h1>
            <div className="flex items-center space-x-2">
                <User className="w-6 h-6" />
                <span className="text-lg font-semibold cursor-pointer" onClick={() => setIsModalOpen(true)}>{localStorage.getItem("playerName")}</span>
            </div>

            {/* Modal for setting player name */}
            <Dialog open={isModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Enter Your Player Name</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Input
                            value={playerName}
                            onChange={(e) => handlePlayerNameChange(e.target.value)}
                            placeholder="Enter your name"
                        />
                        <Button onClick={() => setIsModalOpen(isUsernameSet())}>Save</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </header>
    );
}