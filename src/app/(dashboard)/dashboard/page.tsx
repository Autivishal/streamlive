"use client";

import { useEffect, useState } from "react";
import {
    Video, ListVideo, Radio, Calendar, Loader2, StopCircle,
    Circle, Clock, Cpu, TrendingUp, Activity, Wifi, WifiOff
} from "lucide-react";
import { formatDuration, formatRelativeTime } from "@/lib/utils";
import { useWorkerStatus } from "@/hooks/use-worker-status";

interface DashboardData {
    stats: { videos: number; playlists: number; activeStreams: number; scheduledStreams: number };
    activeStreams: any[];
    recentActivity: any[];
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const { worker, isOnline } = useWorkerStatus();

    const fetchData = async () => {
        try {
            const res = await fetch("/api/dashboard");
            if (res.ok) setData(await res.json());
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => {
        fetchData();
        const i = setInterval(fetchData, 5000);
        return () => clearInterval(i);
    }, []);

    const handleStop = async (streamId: string) => {
        await fetch(`/api/streams/${streamId}/stop`, { method: "POST" });
        fetchData();
    };

    const stats = [
        { label: "Total Videos", value: data?.stats.videos ?? 0, icon: Video, color: "text-indigo-400", bg: "bg-indigo-500/10" },
        { label: "Playlists", value: data?.stats.playlists ?? 0, icon: ListVideo, color: "text-violet-400", bg: "bg-violet-500/10" },
        { label: "Active Streams", value: data?.stats.activeStreams ?? 0, icon: Radio, color: "text-emerald-400", bg: "bg-emerald-500/10" },
        { label: "Scheduled", value: data?.stats.scheduledStreams ?? 0, icon: Calendar, color: "text-amber-400", bg: "bg-amber-500/10" },
    ];

    const eventIcon = (type: string) => {
        if (type.includes("UPLOAD")) return "📹";
        if (type.includes("PLAYLIST")) return "📋";
        if (type.includes("START")) return "🟢";
        if (type.includes("STOP")) return "🔴";
        if (type.includes("ERROR")) return "⚠️";
        return "📌";
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                    <p className="text-white/40 text-sm mt-1">Your streaming command center</p>
                </div>
                {/* Worker badge */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${isOnline ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"}`}>
                    {isOnline ? <><Circle className="w-2 h-2 fill-emerald-400" />Worker Connected</> : <><WifiOff className="w-3 h-3" />Worker Offline</>}
                    {worker?.lastHeartbeat && isOnline && (
                        <span className="text-white/30 ml-1">· {formatRelativeTime(worker.lastHeartbeat)}</span>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="bg-[#13131a] border border-white/5 rounded-2xl p-5">
                        <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                            <Icon className={`w-5 h-5 ${color}`} />
                        </div>
                        <div className="text-3xl font-bold text-white">{loading ? <Loader2 className="w-6 h-6 animate-spin text-white/30" /> : value}</div>
                        <div className="text-white/40 text-sm mt-1">{label}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Active Streams */}
                <div className="lg:col-span-2 bg-[#13131a] border border-white/5 rounded-2xl p-5">
                    <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                        <Radio className="w-4 h-4 text-emerald-400" /> Active Streams
                    </h2>
                    {!data?.activeStreams?.length ? (
                        <div className="text-center py-10 text-white/30">
                            <Radio className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">No active streams</p>
                            <p className="text-xs mt-1">Start a stream to see it here</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {data.activeStreams.map((s) => (
                                <div key={s.id} className="bg-white/3 border border-white/5 rounded-xl p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.status === "STREAMING" ? "bg-emerald-400 animate-pulse" : s.status === "STARTING" ? "bg-amber-400 animate-pulse" : "bg-red-400"}`} />
                                                <span className="text-sm font-medium text-white truncate">{s.name}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.status === "STREAMING" ? "bg-emerald-500/15 text-emerald-400" : s.status === "STARTING" ? "bg-amber-500/15 text-amber-400" : "bg-red-500/15 text-red-400"}`}>{s.status}</span>
                                            </div>
                                            <div className="text-xs text-white/40 space-y-0.5">
                                                {s.playlist && <div>Playlist: {s.playlist.name}</div>}
                                                {s.currentVideoTitle && <div>Now: {s.currentVideoTitle}</div>}
                                                {s.platform && <div>Platform: {s.platform}</div>}
                                                {s.startedAt && <div className="flex items-center gap-1"><Clock className="w-3 h-3" />Started {formatRelativeTime(s.startedAt)}</div>}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleStop(s.id)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg text-xs font-medium transition-all flex-shrink-0 ml-3"
                                        >
                                            <StopCircle className="w-3.5 h-3.5" /> Stop
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Activity */}
                <div className="bg-[#13131a] border border-white/5 rounded-2xl p-5">
                    <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-400" /> Recent Activity
                    </h2>
                    {!data?.recentActivity?.length ? (
                        <div className="text-center py-10 text-white/30 text-sm">No activity yet</div>
                    ) : (
                        <div className="space-y-2 overflow-y-auto max-h-[400px]">
                            {data.recentActivity.map((event, i) => (
                                <div key={event.id || i} className="flex gap-3 text-xs">
                                    <span className="flex-shrink-0 mt-0.5">{eventIcon(event.type)}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white/70 leading-relaxed">{event.message}</p>
                                        <p className="text-white/30 mt-0.5">{formatRelativeTime(event.createdAt)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
