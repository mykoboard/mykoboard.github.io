import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MousePointer2, Globe } from "lucide-react";

interface LobbyModeSelectionProps {
    onSelectManual: () => void;
    onSelectServer: () => void;
}

export function LobbyModeSelection({ onSelectManual, onSelectServer }: LobbyModeSelectionProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in zoom-in-95 duration-300">
            <Card
                className="p-8 flex flex-col items-center text-center space-y-6 hover:shadow-xl transition-all border-2 border-primary/5 group cursor-pointer"
                onClick={onSelectManual}
            >
                <div className="h-20 w-20 bg-primary/5 rounded-3xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <MousePointer2 className="w-10 h-10 text-primary" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-xl font-bold">Manual Invite</h2>
                    <p className="text-sm text-slate-500">Copy-paste signaling strings. 100% Private & Serverless.</p>
                </div>
                <Button variant="outline" className="w-full rounded-xl">Private Mode</Button>
            </Card>

            <Card
                className="p-8 flex flex-col items-center text-center space-y-6 hover:shadow-xl transition-all border-2 border-primary/5 group cursor-pointer relative overflow-hidden"
                onClick={onSelectServer}
            >
                <div className="absolute top-3 right-3 px-2 py-0.5 bg-yellow-400 text-[10px] font-bold rounded-full uppercase tracking-tighter">Alpha</div>
                <div className="h-20 w-20 bg-blue-50 rounded-3xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <Globe className="w-10 h-10 text-blue-500" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-xl font-bold">Global Online</h2>
                    <p className="text-sm text-slate-500">Seamless connection via global signaling server.</p>
                </div>
                <Button variant="outline" className="w-full rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50">Experimental Mode</Button>
            </Card>
        </div>
    );
}
