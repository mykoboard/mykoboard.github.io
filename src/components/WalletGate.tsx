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
    const [subscriptionToken, setSubscriptionToken] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [identity, setIdentity] = useState<PlayerIdentity | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const checkIdentity = async () => {
            const wallet = SecureWallet.getInstance();
            const id = await wallet.getIdentity();
            if (id) {
                setIdentity(id);
            } else {
                setIsOpen(true);
            }
            setIsLoaded(true);
        };
        checkIdentity();
    }, []);

    const handleCreateIdentity = async () => {
        if (!name.trim() || !subscriptionToken.trim()) {
            toast.error("Please enter a name and subscription token");
            return;
        }

        setIsCreating(true);
        try {
            const wallet = SecureWallet.getInstance();
            const newIdentity = await wallet.createIdentity(name, subscriptionToken);

            setIdentity(newIdentity);

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
                <DialogContent className="sm:max-w-md border border-white/10 bg-[#0a0c10] shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-[2rem] overflow-hidden">
                    {/* Ambient Glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

                    <DialogHeader className="space-y-4 pt-4">
                        <div className="mx-auto h-20 w-20 bg-primary/5 rounded-[2.5rem] border border-primary/10 flex items-center justify-center relative group">
                            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                            <ShieldCheck className="w-12 h-12 text-primary relative z-10" />
                        </div>
                        <DialogTitle className="text-3xl font-black text-center tracking-tighter bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent">
                            SECURE YOUR IDENTITY
                        </DialogTitle>
                        <DialogDescription className="text-center text-slate-400 font-medium px-4">
                            Create a decentralized identity. Your data stays on your device, secured by hardware-backed encryption.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 pt-6 pb-2">
                        <div className="space-y-2.5">
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">
                                <UserCircle className="w-4 h-4 text-slate-600" />
                                Public Persona
                            </div>
                            <Input
                                placeholder="Enter your display name..."
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="h-14 text-lg rounded-2xl bg-white/5 border-white/10 focus:border-primary/50 transition-all px-6 placeholder:text-slate-600 font-bold"
                            />
                        </div>

                        <div className="space-y-2.5">
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">
                                <Sparkles className="w-4 h-4 text-yellow-500/60" />
                                Subscription Token
                            </div>
                            <Input
                                placeholder="Paste your token here..."
                                value={subscriptionToken}
                                onChange={(e) => setSubscriptionToken(e.target.value)}
                                className="h-14 text-lg rounded-2xl bg-white/5 border-white/10 focus:border-primary/50 transition-all px-6 font-mono placeholder:text-slate-600"
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateIdentity()}
                            />
                        </div>

                        <div className="bg-white/5 p-5 rounded-[1.5rem] border border-white/5 space-y-3 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                            <div className="flex items-start gap-4 relative z-10">
                                <div className="p-2 bg-slate-900 rounded-lg border border-white/5">
                                    <Fingerprint className="w-5 h-5 text-slate-400" />
                                </div>
                                <div className="text-[11px] text-slate-400 leading-relaxed font-bold uppercase tracking-tight">
                                    We use <span className="text-white">Web Crypto & Passkeys</span> to ensure only you can access your wallet. No seeds to save, no passwords to lose.
                                </div>
                            </div>
                        </div>

                        <Button
                            className="w-full h-16 text-lg font-black rounded-2xl shadow-2xl bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-[1.02] transition-all active:scale-95 uppercase tracking-widest"
                            onClick={handleCreateIdentity}
                            disabled={isCreating}
                        >
                            {isCreating ? (
                                <div className="flex items-center gap-3">
                                    <div className="h-5 w-5 animate-spin rounded-full border-3 border-current border-b-transparent" />
                                    SECURING...
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
