import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

interface PlayerCountSelectorProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    label?: string;
}

export function PlayerCountSelector({
    value,
    onChange,
    min = 2,
    max = 4,
    label = "Players"
}: PlayerCountSelectorProps) {
    const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);

    return (
        <div className="flex flex-col items-center gap-3">
            <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] flex items-center gap-2">
                <Users className="w-3 h-3" />
                {label} Node Capacity
            </span>
            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 shadow-inner">
                {options.map((option) => (
                    <Button
                        key={option}
                        variant={value === option ? "default" : "ghost"}
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange(option);
                        }}
                        className={`
                            h-10 w-12 rounded-xl text-xs font-black transition-all duration-300
                            ${value === option
                                ? "bg-primary text-primary-foreground shadow-neon hover:bg-primary"
                                : "text-white/30 hover:text-white hover:bg-white/5"}
                        `}
                    >
                        {option}
                    </Button>
                ))}
            </div>
        </div>
    );
}
