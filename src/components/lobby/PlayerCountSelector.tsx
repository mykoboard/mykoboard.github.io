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
        <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Users className="w-3 h-3" />
                {label}
            </span>
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
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
                            h-8 w-10 rounded-lg text-xs font-bold transition-all duration-200
                            ${value === option
                                ? "bg-white text-primary shadow-sm hover:bg-white"
                                : "text-slate-500 hover:bg-slate-200/50"}
                        `}
                    >
                        {option}
                    </Button>
                ))}
            </div>
        </div>
    );
}
