"use client";

import { useEffect, useState } from "react";
import { Plus, Radio, StopCircle, Play, Trash2, Loader2, Clock, Eye, EyeOff } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface Playlist { id: string; name: string; }
interface Stream {
    id: string; name: string; platform: string; rtmpUrl: string; status: string;
    loopMode: string; repeatCount: number | null; resolution: string;
    videoBitrate: string; audioBitrate: string; playlistId: string | null;
    playlist: { id: string; name: string } | null;
    currentVideoTitle: string | null; currentVideoIdx: number;
    startedAt: string | null; createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
    IDLE: "text-white/40", STARTING: "text-amber-400", STREAMING: "text-emerald-400",
    STOPPING: "text-orange-400", STOPPED: "text-white/30", ERROR: "text-red-400",
};

export default function StreamsPage() {
    const [streams, setStreams] = useState<Stream[]>([]);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNew, setShowNew] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const [actionId, setActionId] = useState<string | null>(null);

    const [form, setForm] = useState({
        name: "", platform: "YouTube", playlistId: "", rtmpUrl: "rtmp://a.rtmp.youtube.com/live2",
        streamKey: "", loopMode: "INFINITE", repeatCount: "1",
        resolution: "source", videoBitrate: "auto", audioBitrate: "128k",
    });

    const fetchAll = async () => {
        const [sRes, pRes] = await Promise.all([fetch("/api/streams"), fetch("/api/playlists")]);
        if (sRes.ok) { const d = await sRes.json(); setStreams(d.streams); }
        if (pRes.ok) { const d = await pRes.json(); setPlaylists(d.playlists); }
        setLoading(false);
    };

    useEffect(() => { fetchAll(); const i = setInterval(fetchAll, 5000); return () => clearInterval(i); }, []);

    const createStream = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch("/api/streams", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, repeatCount: parseInt(form.repeatCount) || 1, playlistId: form.playlistId || null }),
        });
        if (res.ok) { setShowNew(false); setForm({ ...form, name: "", streamKey: "" }); await fetchAll(); }
    };

    const startStream = async (id: string) => {
        setActionId(id);
        const res = await fetch(`/api/streams/${id}/start`, { method: "POST" });
        if (!res.ok) { const d = await res.json(); alert(d.error || "Failed to start"); }
        await fetchAll(); setActionId(null);
    };

    const stopStream = async (id: string) => {
        setActionId(id);
        await fetch(`/api/streams/${id}/stop`, { method: "POST" });
        await fetchAll(); setActionId(null);
    };

    const deleteStream = async (id: string) => {
        if (!confirm("Delete this stream?")) return;
        const res = await fetch(`/api/streams/${id}`, { method: "DELETE" });
        if (!res.ok) { const d = await res.json(); alert(d.error || "Failed to delete"); return; }
        await fetchAll();
    };

    const canStart = (s: Stream) => s.status === "IDLE" || s.status === "STOPPED" || s.status === "ERROR";
    const canStop = (s: Stream) => s.status === "STREAMING" || s.status === "STARTING";

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Streams</h1>
                    <p className="text-white/40 text-sm mt-1">{streams.length} stream configuration{streams.length !== 1 ? "s" : ""}</p>
                </div>
                <button onClick={() => setShowNew(!showNew)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all">
                    <Plus className="w-4 h-4" /> New Stream
                </button>
            </div>

            {/* New stream form */}
            {showNew && (
                <form onSubmit={createStream} className="bg-[#13131a] border border-white/5 rounded-2xl p-6 space-y-5">
                    <h2 className="text-base font-semibold text-white">New Stream Configuration</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-white/50 mb-1.5">Stream Name</label>
                            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="My YouTube Stream" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-indigo-500 transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs text-white/50 mb-1.5">Platform</label>
                            <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all">
                                <option value="YouTube">YouTube</option>
                                <option value="Twitch">Twitch</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-white/50 mb-1.5">Playlist</label>
                            <select value={form.playlistId} onChange={e => setForm({ ...form, playlistId: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all">
                                <option value="">Select playlist...</option>
                                {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-white/50 mb-1.5">Loop Mode</label>
                            <select value={form.loopMode} onChange={e => setForm({ ...form, loopMode: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all">
                                <option value="INFINITE">Infinite Loop</option>
                                <option value="ONCE">Play Once</option>
                                <option value="REPEAT">Repeat Count</option>
                            </select>
                        </div>
                        {form.loopMode === "REPEAT" && (
                            <div>
                                <label className="block text-xs text-white/50 mb-1.5">Repeat Count</label>
                                <input type="number" min="1" value={form.repeatCount} onChange={e => setForm({ ...form, repeatCount: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all" />
                            </div>
                        )}
                        <div>
                            <label className="block text-xs text-white/50 mb-1.5">RTMP Server</label>
                            <input value={form.rtmpUrl} onChange={e => setForm({ ...form, rtmpUrl: e.target.value })} required className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono placeholder-white/25 focus:outline-none focus:border-indigo-500 transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs text-white/50 mb-1.5">Stream Key <span className="text-white/30">(encrypted at rest)</span></label>
                            <div className="relative">
                                <input type={showKey ? "text" : "password"} value={form.streamKey} onChange={e => setForm({ ...form, streamKey: e.target.value })} required placeholder="xxxx-xxxx-xxxx" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 pr-10 text-sm text-white font-mono placeholder-white/25 focus:outline-none focus:border-indigo-500 transition-all" />
                                <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
                                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-white/50 mb-1.5">Resolution</label>
                            <select value={form.resolution} onChange={e => setForm({ ...form, resolution: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all">
                                <option value="source">Source</option>
                                <option value="1920x1080">1080p</option>
                                <option value="1280x720">720p</option>
                                <option value="854x480">480p</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-white/50 mb-1.5">Audio Bitrate</label>
                            <select value={form.audioBitrate} onChange={e => setForm({ ...form, audioBitrate: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all">
                                <option value="128k">128k</option>
                                <option value="192k">192k</option>
                                <option value="256k">256k</option>
                                <option value="320k">320k</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all">Create Stream</button>
                        <button type="button" onClick={() => setShowNew(false)} className="bg-white/5 hover:bg-white/10 text-white/60 text-sm px-5 py-2.5 rounded-xl transition-all">Cancel</button>
                    </div>
                </form>
            )}

            {/* Streams list */}
            {loading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-white/30" /></div>
                : streams.length === 0 ? (
                    <div className="text-center py-20 text-white/30">
                        <Radio className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No streams configured yet</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {streams.map(s => (
                            <div key={s.id} className="bg-[#13131a] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
                                <div className="flex flex-wrap items-start gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-base font-semibold text-white">{s.name}</span>
                                            <span className={`text-xs font-medium ${STATUS_COLORS[s.status] ?? "text-white/40"}`}>● {s.status}</span>
                                        </div>
                                        <div className="text-xs text-white/40 mt-1.5 space-y-0.5">
                                            <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                                                <span>Platform: {s.platform}</span>
                                                {s.playlist && <span>Playlist: {s.playlist.name}</span>}
                                                <span>Loop: {s.loopMode === "REPEAT" ? `${s.repeatCount}×` : s.loopMode}</span>
                                            </div>
                                            {s.status === "STREAMING" && s.currentVideoTitle && (
                                                <div className="text-emerald-400">Now playing: {s.currentVideoTitle}</div>
                                            )}
                                            {s.startedAt && <div className="flex items-center gap-1"><Clock className="w-3 h-3" />Started {formatRelativeTime(s.startedAt)}</div>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {canStart(s) && (
                                            <button onClick={() => startStream(s.id)} disabled={actionId === s.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-medium transition-all disabled:opacity-50">
                                                {actionId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} Start
                                            </button>
                                        )}
                                        {canStop(s) && (
                                            <button onClick={() => stopStream(s.id)} disabled={actionId === s.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-xs font-medium transition-all disabled:opacity-50">
                                                {actionId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <StopCircle className="w-3.5 h-3.5" />} Stop
                                            </button>
                                        )}
                                        {(s.status === "IDLE" || s.status === "STOPPED") && (
                                            <button onClick={() => deleteStream(s.id)} className="p-1.5 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            }
        </div>
    );
}
