import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [videoCount, playlistCount, activeStreamCount, scheduledStreamCount] = await Promise.all([
        prisma.video.count({ where: { userId: session.user.id } }),
        prisma.playlist.count({ where: { userId: session.user.id } }),
        prisma.stream.count({ where: { userId: session.user.id, status: { in: ["STREAMING", "STARTING"] } } }),
        prisma.schedule.count({ where: { userId: session.user.id, enabled: true } }),
    ]);

    const activeStreams = await prisma.stream.findMany({
        where: { userId: session.user.id, status: { in: ["STREAMING", "STARTING", "STOPPING"] } },
        include: {
            playlist: { select: { name: true } },
            worker: { select: { name: true, hostname: true } },
        },
        orderBy: { startedAt: "desc" },
    });

    const recentActivity = await prisma.streamEvent.findMany({
        where: { stream: { userId: session.user.id } },
        orderBy: { createdAt: "desc" },
        take: 20,
    });

    const safeStreams = activeStreams.map((s) => {
        const { streamKeyEnc, ...rest } = s;
        return rest;
    });

    return NextResponse.json({
        stats: { videos: videoCount, playlists: playlistCount, activeStreams: activeStreamCount, scheduledStreams: scheduledStreamCount },
        activeStreams: safeStreams,
        recentActivity,
    });
}
