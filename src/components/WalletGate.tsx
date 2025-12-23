import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SecureWallet, PlayerIdentity } from "@/lib/wallet";
import { Fingerprint, Sparkles, ShieldCheck, UserCircle } from "lucide-react";
import { toast } from "sonner";

export function WalletGate({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [identity, setIdentity] = useState<PlayerIdentity | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const checkIdentity = async () => {
            const wallet = SecureWallet.getInstance();
            const id = await wallet.getIdentity();
            if (id) {
                setIdentity(id);
                // Sync with legacy localStorage for compatibility with existing components
                localStorage.setItem("playerName", id.name);
            } else {
                setIsOpen(true);
            }
            setIsLoaded(true);
        };
        checkIdentity();
    }, []);

    const handleCreateIdentity = async () => {
        if (!name.trim()) {
            toast.error("Please enter a name");
            return;
        }

        setIsCreating(true);
        try {
            const wallet = SecureWallet.getInstance();
            const newIdentity = await wallet.createIdentity(name);

            setIdentity(newIdentity);
            localStorage.setItem("playerName", newIdentity.name);

            toast.success("Identity Secured!", {
                description: "Your hardware-backed wallet is ready.",
                icon: <Sparkles className="w-4 h-4 text-yellow-500" />
            });

            setIsOpen(false);
        } catch (error) {
            console.error(error);
            toast.error("Failed to create identity. Your browser may not support WebAuthn.");
        } finally {
            setIsCreating(false);
        }
    };

    if (!isLoaded) return null;

    return (
        <>
            {identity ? children : null}

            <Dialog open={isOpen} onOpenChange={(open) => !identity && setIsOpen(open)}>
                <DialogContent className="sm:max-w-md border-none bg-gradient-to-b from-white to-slate-50 shadow-2xl">
                    <DialogHeader className="space-y-4">
                        <div className="mx-auto h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center animate-bounce-slow">
                            <ShieldCheck className="w-10 h-10 text-primary" />
                        </div>
                        <DialogTitle className="text-2xl font-bold text-center">Secure Your Identity</DialogTitle>
                        <DialogDescription className="text-center text-slate-500">
                            Create a decentralized identity. Your data stays on your device, secured by hardware-backed encryption.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 pt-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 ml-1">
                                <UserCircle className="w-4 h-4" />
                                Public Persona
                            </div>
                            <Input
                                placeholder="Enter your display name..."
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="h-12 text-lg rounded-xl border-slate-200 focus:ring-primary shadow-sm"
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateIdentity()}
                            />
                        </div>

                        <div className="bg-slate-100/50 p-4 rounded-xl border border-slate-200/60 space-y-3">
                            <div className="flex items-start gap-3">
                                <Fingerprint className="w-5 h-5 text-slate-400 mt-0.5" />
                                <div className="text-xs text-slate-500 leading-relaxed">
                                    We use <span className="font-semibold text-slate-700">Web Crypto & Passkeys</span> to ensure only you can access your wallet. No seeds to save, no passwords to lose.
                                </div>
                            </div>
                        </div>

                        <Button
                            className="w-full h-12 text-lg font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-95"
                            onClick={handleCreateIdentity}
                            disabled={isCreating}
                        >
                            {isCreating ? (
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" />
                                    Securing...
                                </div>
                            ) : (
                                "Claim Identity"
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
