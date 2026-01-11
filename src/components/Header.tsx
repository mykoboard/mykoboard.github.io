import { User } from "lucide-react";
import { useState, useEffect } from "react";
import { SecureWallet, PlayerIdentity } from "@/lib/wallet";
import { NavigationMenu, NavigationMenuLink, NavigationMenuItem, NavigationMenuList } from "@/components/ui/navigation-menu";
import { useNavigate } from "react-router-dom";

export function Header() {
    const navigate = useNavigate();
    const [identity, setIdentity] = useState<PlayerIdentity | null>(null);

    useEffect(() => {
        const loadIdentity = async () => {
            const wallet = SecureWallet.getInstance();
            const id = await wallet.getIdentity();
            setIdentity(id);
        };
        loadIdentity();
    }, []);

    return (
        <header className="flex justify-between items-center py-6 border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-50">
            <div className="flex items-center gap-8">
                <h1
                    className="text-2xl font-black tracking-tighter cursor-pointer"
                    onClick={() => navigate("/")}
                >
                    MYKO<span className="text-primary">BOARD</span>
                </h1>
                <NavigationMenu className="hidden md:flex">
                    <NavigationMenuList className="flex space-x-2">
                        <NavigationMenuItem>
                            <NavigationMenuLink
                                className="px-4 py-2 text-sm font-bold uppercase tracking-widest text-white/70 hover:text-primary transition-colors cursor-pointer"
                                onClick={() => navigate("/games")}
                            >
                                Arcade
                            </NavigationMenuLink>
                        </NavigationMenuItem>
                    </NavigationMenuList>
                </NavigationMenu>
            </div>

            <div
                className="flex items-center space-x-3 glass-dark px-4 py-2 rounded-full cursor-pointer hover:neon-border transition-all duration-300"
                onClick={() => navigate("/profile")}
            >
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border border-primary/20">
                    {identity?.avatar ? (
                        <img src={identity.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <User className="w-5 h-5 text-primary" />
                    )}
                </div>
                <span className="text-sm font-bold text-white/90 tracking-wide uppercase">
                    {identity?.name || "Guest"}
                </span>
            </div>
        </header>
    );
}