import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const stream = await prisma.stream.findFirst({
        where: { id, userId: session.user.id },
        include: { playlist: { include: { items: { include: { video: true }, orderBy: { position: "asc" } } } } },
    });
    if (!stream) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (stream.status === "STREAMING" || stream.status === "STARTING") {
        return NextResponse.json({ error: "Stream is already running" }, { status: 400 });
    }
    if (!stream.playlist || stream.playlist.items.length === 0) {
        return NextResponse.json({ error: "Playlist is empty or not set" }, { status: 400 });
    }

    const worker = await prisma.worker.findFirst({
        where: { userId: session.user.id, status: { in: ["CONNECTED", "IDLE"] } },
    });
    if (!worker) {
        return NextResponse.json({ error: "No worker is online. Start the local worker first." }, { status: 400 });
    }

    const updated = await prisma.stream.update({
        where: { id },
        data: { status: "STARTING", workerId: worker.id, startedAt: new Date(), stoppedAt: null, errorMessage: null, currentVideoIdx: 0 },
    });

    await prisma.streamEvent.create({
        data: { streamId: id, userId: session.user.id, type: "STREAM_STARTING", message: `Stream starting: ${stream.name}` },
    });

    const { streamKeyEnc, ...safe } = updated;
    return NextResponse.json({ stream: safe });
}
