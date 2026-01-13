import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SecureWallet, PlayerIdentity } from "@/lib/wallet";
import { User, Key, Fingerprint, Sparkles, Save, Shield, History, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SessionManager } from "@/lib/sessions";
import { GameSession } from "@/lib/db";
import { LobbyPastMatches } from "@/components/lobby/LobbyPastMatches";
import { useNavigate } from "react-router-dom";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function UserPage() {
    const [identity, setIdentity] = useState<PlayerIdentity | null>(null);
    const [name, setName] = useState("");
    const [avatar, setAvatar] = useState("");
    const [token, setToken] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [activeSessions, setActiveSessions] = useState<GameSession[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        const loadIdentity = async () => {
            const wallet = SecureWallet.getInstance();
            const id = await wallet.getIdentity();
            if (id) {
                setIdentity(id);
                setName(id.name);
                setAvatar(id.avatar || "");
                setToken(id.subscriptionToken);
            }
        };
        const loadSessions = async () => {
            const sessions = await SessionManager.getSessions();
            setActiveSessions(sessions);
        };
        loadIdentity();
        loadSessions();
    }, []);

    const onDeleteSession = async (id: string) => {
        await SessionManager.removeSession(id);
        const sessions = await SessionManager.getSessions();
        setActiveSessions(sessions);
        toast.success("Match history deleted");
    };

    const handleUpdateProfile = async () => {
        if (!name.trim()) {
            toast.error("Identity match requires a name");
            return;
        }

        setIsSaving(true);
        try {
            const wallet = SecureWallet.getInstance();
            await wallet.updateIdentity({
                name,
                avatar,
                subscriptionToken: token
            });

            // Refresh local state
            const id = await wallet.getIdentity();
            setIdentity(id);

            toast.success("Identity Reconfigured", {
                description: "Your neural profile has been updated.",
                icon: <Save className="w-4 h-4 text-primary" />
            });
        } catch (error) {
            console.error(error);
            toast.error("Encryption Phase Failed");
        } finally {
            setIsSaving(false);
        }
    };

    const handleClearAllData = async () => {
        setIsClearing(true);
        try {
            const wallet = SecureWallet.getInstance();
            await wallet.clearIdentity();
            await SessionManager.clearAllSessions();

            toast.success("All Data Cleared", {
                description: "Your local identity and history have been wiped.",
                icon: <Trash2 className="w-4 h-4 text-destructive" />
            });

            // Redirect to landing page
            navigate("/", { replace: true });
        } catch (error) {
            console.error(error);
            toast.error("Wipe Operation Failed");
        } finally {
            setIsClearing(false);
        }
    };

    const hasChanges = identity && (
        name !== identity.name ||
        avatar !== (identity.avatar || "") ||
        token !== identity.subscriptionToken
    );

    if (!identity) return null;

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto p-6 space-y-12">
                <Header />

                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-neon">
                            <User className="w-8 h-8 text-primary" />
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-white uppercase">User <span className="text-gradient">Profile</span></h1>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Wallet Information Card */}
                        <div className="glass-dark p-8 rounded-3xl space-y-8 border border-white/5 shadow-glass-dark group hover:border-primary/20 transition-all duration-500">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shadow-neon">
                                        {avatar ? (
                                            <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-8 h-8 text-primary" />
                                        )}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-[#0A0A0A] shadow-neon" />
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-bold text-white uppercase tracking-wide">Identity</h2>
                                    <p className="text-[10px] text-primary font-black uppercase tracking-widest">Active Node</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Display Keyname</label>
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="h-14 bg-white/5 border-white/10 rounded-xl focus:ring-primary text-white font-bold placeholder:text-white/20"
                                        placeholder="Enter identity name..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Avatar Vector (URL)</label>
                                    <Input
                                        value={avatar}
                                        onChange={(e) => setAvatar(e.target.value)}
                                        className="h-14 bg-white/5 border-white/10 rounded-xl focus:ring-primary text-white font-mono text-sm placeholder:text-white/20"
                                        placeholder="https://images.unsplash.com/..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Node Identifier</label>
                                    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 group-hover:neon-border transition-all duration-500">
                                        <Fingerprint className="w-5 h-5 text-primary/60 shrink-0" />
                                        <code className="text-sm text-white/70 break-all select-all font-mono">{identity.id}</code>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* System Settings Card */}
                        <div className="glass-dark p-8 rounded-3xl space-y-8 border border-white/5 shadow-glass-dark group hover:border-primary/20 transition-all duration-500">
                            <div className="flex items-center gap-3">
                                <Sparkles className="w-6 h-6 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
                                <h2 className="text-2xl font-bold text-white uppercase tracking-wide">System Auth</h2>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Public Key Vector</label>
                                    <div className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/10 group-hover:neon-border transition-all duration-500">
                                        <Key className="w-5 h-5 text-primary/60 shrink-0 mt-1" />
                                        <code className="text-[11px] text-white/50 break-all select-all font-mono leading-relaxed">
                                            {identity.publicKey}
                                        </code>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Access Token</label>
                                    <Input
                                        placeholder="Paste your node token..."
                                        value={token}
                                        onChange={(e) => setToken(e.target.value)}
                                        className="h-14 bg-white/5 border-white/10 rounded-xl focus:ring-primary text-white font-mono placeholder:text-white/20"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8">
                        <Button
                            onClick={handleUpdateProfile}
                            disabled={isSaving || !hasChanges}
                            className="w-full h-16 text-sm font-black uppercase tracking-[0.4em] rounded-2xl bg-primary text-primary-foreground shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:shadow-[0_0_50px_rgba(16,185,129,0.4)] transition-all duration-500 border border-white/10"
                        >
                            {isSaving ? (
                                <div className="flex items-center gap-3">
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-b-transparent" />
                                    Encrypting Profile Data...
                                </div>
                            ) : (
                                "COMMIT NEURAL CONFIGURATION"
                            )}
                        </Button>
                    </div>

                    {/* Game History Section */}
                    {activeSessions.length > 0 && (
                        <div className="space-y-8 pt-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-neon">
                                    <History className="w-6 h-6 text-primary" />
                                </div>
                                <h2 className="text-3xl font-black tracking-tight text-white uppercase">Game <span className="text-gradient">History</span></h2>
                            </div>

                            <div className="max-w-3xl">
                                <LobbyPastMatches
                                    activeSessions={activeSessions}
                                    onDeleteSession={onDeleteSession}
                                />
                            </div>
                        </div>
                    )}

                    {/* Danger Zone Section */}
                    <div className="pt-12 mt-12 border-t border-destructive/20 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-destructive/10 rounded-2xl border border-destructive/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                                <AlertTriangle className="w-6 h-6 text-destructive" />
                            </div>
                            <h2 className="text-3xl font-black tracking-tight text-white uppercase italic">Danger <span className="text-destructive">Zone</span></h2>
                        </div>

                        <div className="glass-dark p-8 rounded-3xl border border-destructive/10 shadow-glass-dark space-y-6">
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-white uppercase tracking-tight">Purge All Neural Records</h3>
                                <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                    This action will permanently delete your <span className="text-destructive font-bold">decentralized identity</span>,
                                    private keys, and <span className="text-destructive font-bold">all match history</span> from this device.
                                    This cannot be undone.
                                </p>
                            </div>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="outline"
                                        disabled={isClearing}
                                        className="h-14 px-8 text-xs font-black uppercase tracking-[0.2em] rounded-xl border-destructive/30 text-destructive hover:bg-destructive hover:text-white hover:border-destructive transition-all duration-300"
                                    >
                                        {isClearing ? "PURGING DATA..." : "INITIATE FULL DATA WIPE"}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="glass-dark border border-destructive/20 rounded-[2rem] p-8 max-w-md">
                                    <AlertDialogHeader className="space-y-4">
                                        <div className="mx-auto h-20 w-20 bg-destructive/10 rounded-[2.5rem] border border-destructive/20 flex items-center justify-center relative group">
                                            <div className="absolute inset-0 bg-destructive/20 blur-2xl rounded-full opacity-50" />
                                            <AlertTriangle className="w-10 h-10 text-destructive relative z-10" />
                                        </div>
                                        <AlertDialogTitle className="text-2xl font-black text-center tracking-tighter text-white uppercase">
                                            Confirm Neural Purge?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription className="text-center text-slate-400 font-medium px-4">
                                            You are about to erase all local data. Your identity and game history will be lost forever. Are you absolutely certain?
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="flex gap-4 pt-6 sm:justify-end">
                                        <AlertDialogCancel className="h-14 rounded-xl bg-white/5 border-white/10 text-white font-bold hover:bg-white/10">
                                            ABORT
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleClearAllData}
                                            className="h-14 rounded-xl bg-destructive text-white font-black uppercase tracking-widest shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:bg-destructive/90"
                                        >
                                            WIPE DATA
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
