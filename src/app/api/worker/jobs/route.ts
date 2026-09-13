import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/security/encryption";

export async function GET(request: Request) {
    const auth = request.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = auth.slice(7);

    const worker = await prisma.worker.findUnique({ where: { token } });
    if (!worker) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    // Get streams that need this worker's attention
    const streams = await prisma.stream.findMany({
        where: {
            userId: worker.userId,
            status: { in: ["STARTING", "STREAMING", "STOPPING"] },
        },
        include: {
            playlist: {
                include: {
                    items: {
                        include: { video: true },
                        orderBy: { position: "asc" },
                    },
                },
            },
        },
    });

    // Decrypt stream keys for worker use only — NEVER log/expose in response logs
    const jobs = streams.map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        rtmpUrl: s.rtmpUrl,
        streamKey: s.streamKeyEnc ? decrypt(s.streamKeyEnc) : null,
        loopMode: s.loopMode,
        repeatCount: s.repeatCount,
        resolution: s.resolution,
        videoBitrate: s.videoBitrate,
        audioBitrate: s.audioBitrate,
        currentVideoIdx: s.currentVideoIdx,
        playlist: s.playlist
            ? {
                id: s.playlist.id,
                name: s.playlist.name,
                videos: s.playlist.items.map((item) => ({
                    id: item.video.id,
                    title: item.video.title,
                    secureUrl: item.video.secureUrl,
                    duration: item.video.duration,
                    width: item.video.width,
                    height: item.video.height,
                    format: item.video.format,
                })),
            }
            : null,
    }));

    return NextResponse.json({ jobs });
}
