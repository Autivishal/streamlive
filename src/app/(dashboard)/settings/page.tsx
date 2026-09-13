"use client";

import { useEffect, useState } from "react";
import { Settings, Key, RefreshCw, Loader2, Check, Eye, EyeOff, User, Lock } from "lucide-react";
import { useWorkerStatus } from "@/hooks/use-worker-status";
import { formatRelativeTime } from "@/lib/utils";

export default function SettingsPage() {
    const { worker, isOnline } = useWorkerStatus();
    const [workerToken, setWorkerToken] = useState<string | null>(null);
    const [showToken, setShowToken] = useState(false);
    const [tokenLoading, setTokenLoading] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
    const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
    const [pwLoading, setPwLoading] = useState(false);

    const fetchToken = async () => {
        const res = await fetch("/api/settings/worker-token");
        if (res.ok) { const d = await res.json(); setWorkerToken(d.token); }
    };

    useEffect(() => { fetchToken(); }, []);

    const regenerateToken = async () => {
        if (!confirm("This will invalidate the current token. The worker will need to be restarted with the new token. Continue?")) return;
        setTokenLoading(true);
        const res = await fetch("/api/settings/worker-token", { method: "POST" });
        if (res.ok) { const d = await res.json(); setWorkerToken(d.token); }
        setTokenLoading(false);
    };

    const changePassword = async (e: React.FormEvent) => {
        e.preventDefault(); setPwMsg(null);
        if (passwordForm.next !== passwordForm.confirm) { setPwMsg({ type: "err", text: "Passwords do not match" }); return; }
        setPwLoading(true);
        const res = await fetch("/api/settings/password", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ current: passwordForm.current, newPassword: passwordForm.next }),
        });
        const d = await res.json();
        setPwMsg(res.ok ? { type: "ok", text: "Password changed successfully" } : { type: "err", text: d.error || "Failed" });
        if (res.ok) setPasswordForm({ current: "", next: "", confirm: "" });
        setPwLoading(false);
    };

    return (
        <div className="p-6 space-y-6 max-w-2xl">
            <div><h1 className="text-2xl font-bold text-white">Settings</h1><p className="text-white/40 text-sm mt-1">Manage your account and worker configuration</p></div>

            {/* Account */}
            <div className="bg-[#13131a] border border-white/5 rounded-2xl p-5 space-y-4">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2"><User className="w-4 h-4 text-indigo-400" />Account</h2>
                <form onSubmit={changePassword} className="space-y-3">
                    <div>
                        <label className="block text-xs text-white/50 mb-1.5">Current Password</label>
                        <input type="password" value={passwordForm.current} onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all" />
                    </div>
                    <div>
                        <label className="block text-xs text-white/50 mb-1.5">New Password</label>
                        <input type="password" value={passwordForm.next} onChange={e => setPasswordForm({ ...passwordForm, next: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all" />
                    </div>
                    <div>
                        <label className="block text-xs text-white/50 mb-1.5">Confirm New Password</label>
                        <input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all" />
                    </div>
                    {pwMsg && <p className={`text-xs ${pwMsg.type === "ok" ? "text-emerald-400" : "text-red-400"}`}>{pwMsg.text}</p>}
                    <button type="submit" disabled={pwLoading} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all">
                        {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Change Password
                    </button>
                </form>
            </div>

            {/* Worker */}
            <div className="bg-[#13131a] border border-white/5 rounded-2xl p-5 space-y-4">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Key className="w-4 h-4 text-amber-400" />Worker Configuration</h2>
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white/3 rounded-xl p-3"><p className="text-white/40 text-xs mb-1">Status</p><p className={`font-medium ${isOnline ? "text-emerald-400" : "text-amber-400"}`}>{isOnline ? "● Connected" : "⚠ Offline"}</p></div>
                    <div className="bg-white/3 rounded-xl p-3"><p className="text-white/40 text-xs mb-1">Machine</p><p className="text-white font-mono text-xs">{worker?.hostname || "—"}</p></div>
                    <div className="bg-white/3 rounded-xl p-3"><p className="text-white/40 text-xs mb-1">Last Heartbeat</p><p className="text-white text-xs">{worker?.lastHeartbeat ? formatRelativeTime(worker.lastHeartbeat) : "Never"}</p></div>
                    <div className="bg-white/3 rounded-xl p-3"><p className="text-white/40 text-xs mb-1">Worker ID</p><p className="text-white font-mono text-xs truncate">{worker?.id?.slice(0, 12) || "—"}...</p></div>
                </div>
                <div>
                    <label className="block text-xs text-white/50 mb-1.5">Worker Token <span className="text-white/30">(set this in worker/.env as WORKER_TOKEN)</span></label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <input readOnly value={workerToken || ""} type={showToken ? "text" : "password"} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 pr-10 text-sm text-white font-mono focus:outline-none" />
                            <button onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">{showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                        </div>
                        <button onClick={regenerateToken} disabled={tokenLoading} className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 rounded-xl text-sm transition-all disabled:opacity-50">
                            {tokenLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Regenerate
                        </button>
                    </div>
                </div>
            </div>

            {/* Cloudinary info */}
            <div className="bg-[#13131a] border border-white/5 rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Settings className="w-4 h-4 text-violet-400" />Cloudinary</h2>
                <p className="text-white/40 text-sm">Cloudinary credentials are configured via environment variables on the server. See <code className="text-violet-400">.env.example</code> for the required variables.</p>
            </div>
        </div>
    );
}
