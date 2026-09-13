import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { encrypt } from "@/lib/security/encryption";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const schedules = await prisma.schedule.findMany({
        where: { userId: session.user.id },
        include: { playlist: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
    });
    const safe = schedules.map((s) => { const { streamKeyEnc, ...rest } = s; return rest; });
    return NextResponse.json({ schedules: safe });
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { name, playlistId, type, startTime, stopTime, days, loopMode, rtmpUrl, streamKey } = body;
    if (!name?.trim() || !startTime) return NextResponse.json({ error: "Name and startTime required" }, { status: 400 });

    const schedule = await prisma.schedule.create({
        data: {
            userId: session.user.id,
            name: name.trim(),
            playlistId: playlistId || null,
            type: type || "DAILY",
            startTime,
            stopTime: stopTime || null,
            days: days || [],
            loopMode: loopMode || "INFINITE",
            rtmpUrl: rtmpUrl || null,
            streamKeyEnc: streamKey ? encrypt(streamKey) : null,
        },
        include: { playlist: { select: { id: true, name: true } } },
    });
    const { streamKeyEnc, ...safe } = schedule;
    return NextResponse.json({ schedule: safe }, { status: 201 });
}
