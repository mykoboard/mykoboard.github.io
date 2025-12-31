import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SecureWallet, PlayerIdentity } from "@/lib/wallet";
import { User, Key, Fingerprint, Sparkles, Save, Shield, History } from "lucide-react";
import { toast } from "sonner";
import { SessionManager } from "@/lib/sessions";
import { GameSession } from "@/lib/db";
import { LobbyPastMatches } from "@/components/lobby/LobbyPastMatches";

export default function UserPage() {
    const [identity, setIdentity] = useState<PlayerIdentity | null>(null);
    const [token, setToken] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [activeSessions, setActiveSessions] = useState<GameSession[]>([]);

    useEffect(() => {
        const loadIdentity = async () => {
            const wallet = SecureWallet.getInstance();
            const id = await wallet.getIdentity();
            if (id) {
                setIdentity(id);
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

    const handleUpdateToken = async () => {
        if (!token.trim()) {
            toast.error("Token cannot be empty");
            return;
        }

        setIsSaving(true);
        try {
            const wallet = SecureWallet.getInstance();
            await wallet.updateSubscriptionToken(token);

            // Refresh local state
            const id = await wallet.getIdentity();
            setIdentity(id);

            toast.success("Profile Updated", {
                description: "Your subscription token has been saved securely.",
                icon: <Save className="w-4 h-4 text-green-500" />
            });
        } catch (error) {
            console.error(error);
            toast.error("Failed to update token");
        } finally {
            setIsSaving(false);
        }
    };

    if (!identity) return null;

    return (
        <div className="min-h-screen bg-slate-50/50">
            <div className="max-w-4xl mx-auto p-6 space-y-8">
                <Header />

                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <User className="w-6 h-6 text-primary" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">User Profile</h1>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Wallet Information Card */}
                        <div className="glass p-6 rounded-3xl space-y-6 border border-white/40 shadow-xl">
                            <div className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-primary" />
                                <h2 className="text-xl font-semibold">Wallet Information</h2>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Display Name</label>
                                    <p className="text-lg font-medium text-slate-700">{identity.name}</p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Client ID</label>
                                    <div className="flex items-center gap-2 bg-slate-100/50 p-2 rounded-lg border border-slate-200/60">
                                        <Fingerprint className="w-4 h-4 text-slate-400 shrink-0" />
                                        <code className="text-sm text-slate-600 break-all select-all">{identity.id}</code>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Public Key</label>
                                    <div className="flex items-start gap-2 bg-slate-100/50 p-2 rounded-lg border border-slate-200/60">
                                        <Key className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                                        <code className="text-xs text-slate-500 break-all select-all font-mono leading-relaxed">
                                            {identity.publicKey}
                                        </code>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Subscription Settings Card */}
                        <div className="glass p-6 rounded-3xl space-y-6 border border-white/40 shadow-xl">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-yellow-500" />
                                <h2 className="text-xl font-semibold">Subscription Settings</h2>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Subscription Token</label>
                                    <Input
                                        placeholder="Paste your token here..."
                                        value={token}
                                        onChange={(e) => setToken(e.target.value)}
                                        className="h-12 bg-white/50 border-slate-200 rounded-xl focus:ring-primary font-mono"
                                    />
                                    <p className="text-[10px] text-slate-400 leading-tight">
                                        Your subscription token is used to authorize your access to premium features and signaling services.
                                    </p>
                                </div>

                                <Button
                                    onClick={handleUpdateToken}
                                    disabled={isSaving || token === identity.subscriptionToken}
                                    className="w-full h-12 text-lg font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.01] transition-transform active:scale-95"
                                >
                                    {isSaving ? (
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" />
                                            Saving Changes...
                                        </div>
                                    ) : (
                                        "Save Settings"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Game History Section */}
                    {activeSessions.length > 0 && (
                        <div className="space-y-4 pt-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-xl">
                                    <History className="w-5 h-5 text-primary" />
                                </div>
                                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Match History</h2>
                            </div>

                            <div className="max-w-2xl">
                                <LobbyPastMatches
                                    activeSessions={activeSessions}
                                    onDeleteSession={onDeleteSession}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
