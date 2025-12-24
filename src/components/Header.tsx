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
        <header className="flex justify-between items-center mb-4">
            <NavigationMenu
                className="relative z-10 flex w-screen justify-center"
                children={
                    <NavigationMenuList className="center m-0 flex list-none rounded-md p-1">
                        <NavigationMenuItem>
                            <NavigationMenuLink className="select-none rounded px-3 py-2 text-lg font-semibold leading-none  no-underline outline-none " href="#/games">
                                Games
                            </NavigationMenuLink>
                        </NavigationMenuItem>
                    </NavigationMenuList>
                } />
            <div className="flex items-center space-x-2">
                <User className="w-6 h-6" />
                <span className="text-lg font-semibold cursor-pointer">{identity?.name}</span>
            </div>
        </header>
    );
}