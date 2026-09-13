import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { encrypt } from "@/lib/security/encryption";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const streams = await prisma.stream.findMany({
        where: { userId: session.user.id },
        include: {
            playlist: { select: { id: true, name: true } },
            worker: { select: { id: true, name: true, hostname: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    const safe = streams.map((s) => {
        const { streamKeyEnc, ...rest } = s;
        return rest;
    });
    return NextResponse.json({ streams: safe });
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized - Please sign in again." }, { status: 401 });

        const body = await request.json();
        const { name, playlistId, platform, rtmpUrl, streamKey, loopMode, repeatCount, resolution, videoBitrate, audioBitrate } = body;

        if (!name?.trim() || !rtmpUrl || !streamKey) {
            return NextResponse.json({ error: "Name, RTMP URL, and stream key are required" }, { status: 400 });
        }

        const streamKeyEnc = encrypt(streamKey);

        const stream = await prisma.stream.create({
            data: {
                userId: session.user.id,
                name: name.trim(),
                playlistId: playlistId || null,
                platform: platform || "YouTube",
                rtmpUrl,
                streamKeyEnc,
                loopMode: loopMode || "INFINITE",
                repeatCount: loopMode === "REPEAT" ? parseInt(repeatCount) || 1 : null,
                resolution: resolution || "source",
                videoBitrate: videoBitrate || "auto",
                audioBitrate: audioBitrate || "128k",
            },
            include: { playlist: { select: { id: true, name: true } } },
        });

        const { streamKeyEnc: _k, ...safe } = stream;
        return NextResponse.json({ stream: safe }, { status: 201 });
    } catch (error: any) {
        console.error("Failed to create stream:", error);
        return NextResponse.json({ error: error?.message || "Internal server error while creating stream" }, { status: 500 });
    }
}
