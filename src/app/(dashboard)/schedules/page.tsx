"use client";

import { useEffect, useState } from "react";
import { Plus, Calendar, Trash2, Loader2, Clock, WifiOff } from "lucide-react";

interface Playlist { id: string; name: string; }
interface Schedule { id: string; name: string; type: string; startTime: string; stopTime: string | null; days: number[]; enabled: boolean; loopMode: string; playlist: { name: string } | null; }

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SchedulesPage() {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNew, setShowNew] = useState(false);
    const [form, setForm] = useState({ name: "", playlistId: "", type: "DAILY", startTime: "22:00", stopTime: "", days: [] as number[], loopMode: "INFINITE", rtmpUrl: "", streamKey: "" });

    const fetchAll = async () => {
        const [sRes, pRes] = await Promise.all([fetch("/api/schedules"), fetch("/api/playlists")]);
        if (sRes.ok) { const d = await sRes.json(); setSchedules(d.schedules); }
        if (pRes.ok) { const d = await pRes.json(); setPlaylists(d.playlists); }
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, []);

    const createSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch("/api/schedules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        if (res.ok) { setShowNew(false); await fetchAll(); }
    };

    const toggleDay = (d: number) => {
        setForm(f => ({ ...f, days: f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d] }));
    };

    const deleteSchedule = async (id: string) => {
        if (!confirm("Delete this schedule?")) return;
        await fetch(`/api/schedules/${id}`, { method: "DELETE" });
        await fetchAll();
    };

    const toggleEnabled = async (id: string, enabled: boolean) => {
        await fetch(`/api/schedules/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !enabled }) });
        await fetchAll();
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Schedules</h1>
                    <p className="text-white/40 text-sm mt-1">Automate your streams</p>
                </div>
                <button onClick={() => setShowNew(!showNew)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all">
                    <Plus className="w-4 h-4" /> New Schedule
                </button>
            </div>

            {/* Worker warning */}
            <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-amber-400 text-sm">
                <WifiOff className="w-4 h-4 flex-shrink-0" />
                <span>Scheduled streams require the local worker to be running on your PC. The worker must be online at the scheduled time.</span>
            </div>

            {showNew && (
                <form onSubmit={createSchedule} className="bg-[#13131a] border border-white/5 rounded-2xl p-6 space-y-4">
                    <h2 className="text-base font-semibold text-white">New Schedule</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-white/50 mb-1.5">Schedule Name</label>
                            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs text-white/50 mb-1.5">Playlist</label>
                            <select value={form.playlistId} onChange={e => setForm({ ...form, playlistId: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all">
                                <option value="">Select playlist...</option>
                                {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-white/50 mb-1.5">Type</label>
                            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all">
                                <option value="ONCE">One-time</option>
                                <option value="DAILY">Daily</option>
                                <option value="SELECTED_DAYS">Selected Days</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-white/50 mb-1.5">Start Time</label>
                            <input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs text-white/50 mb-1.5">Stop Time <span className="text-white/30">(optional)</span></label>
                            <input type="time" value={form.stopTime} onChange={e => setForm({ ...form, stopTime: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs text-white/50 mb-1.5">RTMP URL</label>
                            <input value={form.rtmpUrl} onChange={e => setForm({ ...form, rtmpUrl: e.target.value })} placeholder="rtmp://a.rtmp.youtube.com/live2" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-indigo-500 transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs text-white/50 mb-1.5">Stream Key</label>
                            <input type="password" value={form.streamKey} onChange={e => setForm({ ...form, streamKey: e.target.value })} placeholder="xxxx-xxxx" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-indigo-500 transition-all" />
                        </div>
                        {form.type === "SELECTED_DAYS" && (
                            <div className="col-span-2">
                                <label className="block text-xs text-white/50 mb-1.5">Days</label>
                                <div className="flex gap-2">{DAY_LABELS.map((d, i) => (
                                    <button key={i} type="button" onClick={() => toggleDay(i)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${form.days.includes(i) ? "bg-indigo-600 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>{d}</button>
                                ))}</div>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all">Create Schedule</button>
                        <button type="button" onClick={() => setShowNew(false)} className="bg-white/5 hover:bg-white/10 text-white/60 text-sm px-5 py-2.5 rounded-xl transition-all">Cancel</button>
                    </div>
                </form>
            )}

            {loading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-white/30" /></div>
                : schedules.length === 0 ? (
                    <div className="text-center py-20 text-white/30"><Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No schedules yet</p></div>
                ) : (
                    <div className="space-y-3">{schedules.map(s => (
                        <div key={s.id} className="bg-[#13131a] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-white">{s.name}</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.enabled ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-white/30"}`}>{s.enabled ? "Enabled" : "Disabled"}</span>
                                </div>
                                <div className="text-xs text-white/40 mt-1 flex items-center gap-3">
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.startTime}{s.stopTime && ` – ${s.stopTime}`}</span>
                                    <span>{s.type}</span>
                                    {s.playlist && <span>Playlist: {s.playlist.name}</span>}
                                    {s.type === "SELECTED_DAYS" && <span>{s.days.map(d => DAY_LABELS[d]).join(", ")}</span>}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => toggleEnabled(s.id, s.enabled)} className={`text-xs px-3 py-1.5 rounded-lg transition-all ${s.enabled ? "bg-white/5 hover:bg-white/10 text-white/60" : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"}`}>
                                    {s.enabled ? "Disable" : "Enable"}
                                </button>
                                <button onClick={() => deleteSchedule(s.id)} className="p-1.5 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))}</div>
                )
            }
        </div>
    );
}
