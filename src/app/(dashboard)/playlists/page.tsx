"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, ListVideo, Pencil, Loader2, Film, ChevronRight, Check, X, Clock, Copy } from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface Video { id: string; title: string; thumbnailUrl: string | null; duration: number; }
interface PlaylistItem { id: string; position: number; video: Video; }
interface Playlist { id: string; name: string; description: string | null; items: PlaylistItem[]; createdAt: string; }

export default function PlaylistsPage() {
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Playlist | null>(null);
    const [newName, setNewName] = useState("");
    const [creating, setCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [showAddVideo, setShowAddVideo] = useState(false);
    const [saving, setSaving] = useState(false);

    const fetchAll = async () => {
        const [pRes, vRes] = await Promise.all([fetch("/api/playlists"), fetch("/api/videos")]);
        if (pRes.ok) { const d = await pRes.json(); setPlaylists(d.playlists); }
        if (vRes.ok) { const d = await vRes.json(); setVideos(d.videos); }
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, []);

    const totalDuration = (p: Playlist) => p.items.reduce((sum, i) => sum + (i.video.duration || 0), 0);

    const createPlaylist = async () => {
        if (!newName.trim()) return;
        setCreating(true);
        const res = await fetch("/api/playlists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName.trim() }) });
        if (res.ok) { await fetchAll(); setNewName(""); }
        setCreating(false);
    };

    const deletePlaylist = async (id: string) => {
        if (!confirm("Delete this playlist?")) return;
        await fetch(`/api/playlists/${id}`, { method: "DELETE" });
        if (selected?.id === id) setSelected(null);
        await fetchAll();
    };

    const renamePlaylist = async (id: string) => {
        await fetch(`/api/playlists/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editName }) });
        setEditingId(null);
        await fetchAll();
    };

    const addVideoToPlaylist = async (videoId: string) => {
        if (!selected) return;
        const existingIds = selected.items.map(i => ({ videoId: i.video.id }));
        if (existingIds.some(i => i.videoId === videoId)) return;
        const newItems = [...existingIds, { videoId }];
        setSaving(true);
        const res = await fetch(`/api/playlists/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: newItems }) });
        if (res.ok) { const d = await res.json(); setSelected(d.playlist); await fetchAll(); }
        setSaving(false);
    };

    const removeVideo = async (videoId: string) => {
        if (!selected) return;
        const newItems = selected.items.filter(i => i.video.id !== videoId).map(i => ({ videoId: i.video.id }));
        setSaving(true);
        const res = await fetch(`/api/playlists/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: newItems }) });
        if (res.ok) { const d = await res.json(); setSelected(d.playlist); await fetchAll(); }
        setSaving(false);
    };

    const moveVideo = async (fromIdx: number, toIdx: number) => {
        if (!selected) return;
        const items = [...selected.items];
        const [moved] = items.splice(fromIdx, 1);
        items.splice(toIdx, 0, moved);
        const newItems = items.map(i => ({ videoId: i.video.id }));
        setSaving(true);
        const res = await fetch(`/api/playlists/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: newItems }) });
        if (res.ok) { const d = await res.json(); setSelected(d.playlist); await fetchAll(); }
        setSaving(false);
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-white/30" /></div>;

    return (
        <div className="p-6 flex gap-6 h-[calc(100vh-0px)] max-h-full overflow-hidden">
            {/* Left: Playlist list */}
            <div className="w-72 flex-shrink-0 flex flex-col gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Playlists</h1>
                    <p className="text-white/40 text-sm mt-1">{playlists.length} playlist{playlists.length !== 1 ? "s" : ""}</p>
                </div>

                {/* Create */}
                <div className="flex gap-2">
                    <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && createPlaylist()} placeholder="New playlist name..." className="flex-1 bg-[#13131a] border border-white/5 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-indigo-500 transition-all" />
                    <button onClick={createPlaylist} disabled={!newName.trim() || creating} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-3 py-2 rounded-xl transition-all">
                        {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto space-y-2">
                    {playlists.length === 0 ? (
                        <div className="text-center py-10 text-white/30 text-sm"><ListVideo className="w-8 h-8 mx-auto mb-2 opacity-30" />No playlists yet</div>
                    ) : playlists.map(p => (
                        <div key={p.id} onClick={() => setSelected(p)} className={`bg-[#13131a] border rounded-xl p-3 cursor-pointer transition-all ${selected?.id === p.id ? "border-indigo-500/50 bg-indigo-500/5" : "border-white/5 hover:border-white/10"}`}>
                            {editingId === p.id ? (
                                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                    <input value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => e.key === "Enter" && renamePlaylist(p.id)} className="flex-1 bg-white/5 rounded-lg px-2 py-1 text-sm text-white focus:outline-none" autoFocus />
                                    <button onClick={() => renamePlaylist(p.id)} className="text-emerald-400"><Check className="w-4 h-4" /></button>
                                    <button onClick={() => setEditingId(null)} className="text-white/40"><X className="w-4 h-4" /></button>
                                </div>
                            ) : (
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{p.name}</p>
                                        <p className="text-white/40 text-xs mt-0.5">{p.items.length} videos · {formatDuration(totalDuration(p))}</p>
                                    </div>
                                    <div className="flex items-center gap-0.5 flex-shrink-0 ml-1" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => { setEditingId(p.id); setEditName(p.name); }} className="p-1 text-white/30 hover:text-white transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => deletePlaylist(p.id)} className="p-1 text-white/30 hover:text-red-400 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Right: Playlist editor */}
            <div className="flex-1 bg-[#13131a] border border-white/5 rounded-2xl overflow-hidden flex flex-col">
                {!selected ? (
                    <div className="flex-1 flex items-center justify-center text-white/30">
                        <div className="text-center">
                            <ListVideo className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>Select a playlist to edit</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                            <div>
                                <h2 className="text-base font-semibold text-white">{selected.name}</h2>
                                <p className="text-white/40 text-xs mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" />Total: {formatDuration(totalDuration(selected))}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {saving && <Loader2 className="w-4 h-4 animate-spin text-white/30" />}
                                <button onClick={() => setShowAddVideo(!showAddVideo)} className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all">
                                    <Plus className="w-4 h-4" /> Add Videos
                                </button>
                            </div>
                        </div>

                        {showAddVideo && (
                            <div className="border-b border-white/5 p-4 max-h-48 overflow-y-auto">
                                <p className="text-xs text-white/40 mb-2">Click to add video to playlist:</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {videos.filter(v => !selected.items.some(i => i.video.id === v.id)).map(v => (
                                        <button key={v.id} onClick={() => addVideoToPlaylist(v.id)} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 rounded-lg px-2 py-1.5 text-left transition-all">
                                            {v.thumbnailUrl ? <img src={v.thumbnailUrl} className="w-8 h-6 object-cover rounded" alt="" /> : <Film className="w-6 h-6 text-white/30" />}
                                            <span className="text-xs text-white truncate">{v.title}</span>
                                        </button>
                                    ))}
                                    {videos.filter(v => !selected.items.some(i => i.video.id === v.id)).length === 0 && (
                                        <p className="col-span-3 text-center text-white/30 text-xs py-2">All videos added</p>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {selected.items.length === 0 ? (
                                <div className="text-center py-10 text-white/30 text-sm">No videos in playlist — click Add Videos</div>
                            ) : selected.items.map((item, idx) => (
                                <div key={item.id} className="flex items-center gap-3 bg-white/3 hover:bg-white/5 border border-white/5 rounded-xl p-3 transition-all">
                                    <span className="text-white/30 text-sm font-mono w-6 text-center flex-shrink-0">{idx + 1}</span>
                                    {item.video.thumbnailUrl ? <img src={item.video.thumbnailUrl} className="w-12 h-8 object-cover rounded" alt="" /> : <Film className="w-8 h-8 text-white/20" />}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white truncate">{item.video.title}</p>
                                        <p className="text-xs text-white/30">{formatDuration(item.video.duration)}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {idx > 0 && <button onClick={() => moveVideo(idx, idx - 1)} className="p-1 text-white/30 hover:text-white transition-all text-xs">↑</button>}
                                        {idx < selected.items.length - 1 && <button onClick={() => moveVideo(idx, idx + 1)} className="p-1 text-white/30 hover:text-white transition-all text-xs">↓</button>}
                                        <button onClick={() => removeVideo(item.video.id)} className="p-1 text-white/30 hover:text-red-400 transition-all"><X className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
