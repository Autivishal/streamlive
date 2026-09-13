"use client";

import { useEffect, useState, useRef } from "react";
import { Upload, Search, Trash2, Loader2, Film, SortAsc, SortDesc, X, CheckCircle, AlertCircle } from "lucide-react";
import { formatBytes, formatDuration, formatRelativeTime } from "@/lib/utils";

interface Video {
    id: string; title: string; filename: string; secureUrl: string;
    thumbnailUrl: string | null; duration: number; width: number | null;
    height: number | null; format: string | null; bytes: number | null;
    createdAt: string;
}

interface UploadingFile {
    id: string; name: string; progress: number; status: "uploading" | "done" | "error"; error?: string;
}

export default function VideosPage() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [uploading, setUploading] = useState<UploadingFile[]>([]);
    const [dragging, setDragging] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchVideos = async (q = search) => {
        const res = await fetch(`/api/videos?search=${encodeURIComponent(q)}`);
        if (res.ok) { const d = await res.json(); setVideos(d.videos); }
        setLoading(false);
    };

    useEffect(() => { fetchVideos(); }, []);
    useEffect(() => { const t = setTimeout(() => fetchVideos(search), 300); return () => clearTimeout(t); }, [search]);

    const uploadToCloudinary = async (files: File[]) => {
        // Get signed params from our API
        const signRes = await fetch("/api/upload/sign");
        if (!signRes.ok) return;
        const { signature, timestamp, cloudName, apiKey, folder } = await signRes.json();

        for (const file of files) {
            const uid = Math.random().toString(36).slice(2);
            setUploading(u => [...u, { id: uid, name: file.name, progress: 0, status: "uploading" }]);

            try {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("signature", signature);
                formData.append("timestamp", timestamp.toString());
                formData.append("api_key", apiKey);
                formData.append("folder", folder);
                formData.append("resource_type", "video");

                const xhr = new XMLHttpRequest();
                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        setUploading(u => u.map(x => x.id === uid ? { ...x, progress: Math.round(e.loaded / e.total * 100) } : x));
                    }
                };

                await new Promise<void>((resolve, reject) => {
                    xhr.onload = async () => {
                        if (xhr.status === 200) {
                            const data = JSON.parse(xhr.responseText);
                            // Save to our DB
                            await fetch("/api/videos", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    cloudinaryPublicId: data.public_id,
                                    secureUrl: data.secure_url,
                                    thumbnailUrl: `https://res.cloudinary.com/${cloudName}/video/upload/f_jpg,q_auto,w_640,h_360,c_fill/${data.public_id}.jpg`,
                                    title: file.name.replace(/\.[^/.]+$/, ""),
                                    filename: file.name,
                                    duration: data.duration || 0,
                                    width: data.width,
                                    height: data.height,
                                    format: data.format,
                                    bytes: data.bytes,
                                }),
                            });
                            setUploading(u => u.map(x => x.id === uid ? { ...x, status: "done", progress: 100 } : x));
                            resolve();
                        } else {
                            reject(new Error("Upload failed"));
                        }
                    };
                    xhr.onerror = () => reject(new Error("Network error"));
                    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`);
                    xhr.send(formData);
                });

                await fetchVideos();
            } catch (err) {
                setUploading(u => u.map(x => x.id === uid ? { ...x, status: "error", error: "Upload failed" } : x));
            }

            setTimeout(() => setUploading(u => u.filter(x => x.id !== uid)), 5000);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setDragging(false);
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("video/"));
        if (files.length) uploadToCloudinary(files);
    };

    const handleDelete = async (id: string) => {
        setDeleteId(id);
        await fetch(`/api/videos/${id}`, { method: "DELETE" });
        setVideos(v => v.filter(x => x.id !== id));
        setDeleteId(null);
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Videos</h1>
                    <p className="text-white/40 text-sm mt-1">{videos.length} video{videos.length !== 1 ? "s" : ""} in your library</p>
                </div>
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all">
                    <Upload className="w-4 h-4" /> Upload Videos
                </button>
                <input ref={fileInputRef} type="file" accept="video/*" multiple className="hidden" onChange={e => { if (e.target.files) uploadToCloudinary(Array.from(e.target.files)); }} />
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                    type="text" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search videos..."
                    className="w-full bg-[#13131a] border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-white/25 focus:outline-none focus:border-indigo-500 transition-all"
                />
                {search && <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"><X className="w-4 h-4" /></button>}
            </div>

            {/* Upload queue */}
            {uploading.length > 0 && (
                <div className="space-y-2">
                    {uploading.map(u => (
                        <div key={u.id} className="bg-[#13131a] border border-white/5 rounded-xl p-3 flex items-center gap-3">
                            {u.status === "uploading" && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin flex-shrink-0" />}
                            {u.status === "done" && <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                            {u.status === "error" && <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">{u.name}</p>
                                {u.status === "uploading" && (
                                    <div className="mt-1.5 bg-white/10 rounded-full h-1"><div className="bg-indigo-500 h-1 rounded-full transition-all" style={{ width: `${u.progress}%` }} /></div>
                                )}
                                {u.status === "error" && <p className="text-xs text-red-400 mt-0.5">{u.error}</p>}
                                {u.status === "done" && <p className="text-xs text-emerald-400 mt-0.5">Uploaded successfully</p>}
                            </div>
                            <span className="text-xs text-white/30 flex-shrink-0">{u.progress}%</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Drop zone */}
            <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${dragging ? "border-indigo-500 bg-indigo-500/5" : "border-white/10 hover:border-white/20"}`}
            >
                <Upload className="w-8 h-8 text-white/30 mx-auto mb-2" />
                <p className="text-white/50 text-sm">Drag and drop video files here, or click to browse</p>
                <p className="text-white/25 text-xs mt-1">MP4, MOV, AVI, MKV supported</p>
            </div>

            {/* Videos grid */}
            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-white/30" /></div>
            ) : videos.length === 0 ? (
                <div className="text-center py-20 text-white/30">
                    <Film className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>{search ? "No videos match your search" : "No videos yet — upload your first video"}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {videos.map(video => (
                        <div key={video.id} className="bg-[#13131a] border border-white/5 rounded-2xl overflow-hidden group hover:border-white/10 transition-all">
                            <div className="relative aspect-video bg-black">
                                {video.thumbnailUrl ? (
                                    <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center"><Film className="w-8 h-8 text-white/20" /></div>
                                )}
                                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded font-mono">
                                    {formatDuration(video.duration)}
                                </div>
                            </div>
                            <div className="p-3">
                                <p className="text-white text-sm font-medium truncate">{video.title}</p>
                                <div className="flex items-center justify-between mt-2">
                                    <div className="text-white/30 text-xs space-y-0.5">
                                        {video.width && video.height && <div>{video.width}×{video.height}</div>}
                                        {video.bytes && <div>{formatBytes(video.bytes)}</div>}
                                        <div>{formatRelativeTime(video.createdAt)}</div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(video.id)}
                                        disabled={deleteId === video.id}
                                        className="p-2 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                    >
                                        {deleteId === video.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
