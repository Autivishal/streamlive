import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
    const auth = request.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = auth.slice(7);

    const worker = await prisma.worker.findUnique({ where: { token } });
    if (!worker) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const body = await request.json();
    const { streamId, type, message, metadata, currentVideoIdx, currentVideoTitle, status } = body;

    if (!streamId || !type || !message) {
        return NextResponse.json({ error: "streamId, type, message required" }, { status: 400 });
    }

    // Update stream status if provided
    if (status || currentVideoIdx !== undefined || currentVideoTitle !== undefined) {
        const updateData: any = {};
        if (status) updateData.status = status;
        if (currentVideoIdx !== undefined) updateData.currentVideoIdx = currentVideoIdx;
        if (currentVideoTitle !== undefined) updateData.currentVideoTitle = currentVideoTitle;
        if (status === "STOPPED" || status === "ERROR") {
            updateData.stoppedAt = new Date();
            updateData.workerId = null;
        }
        if (status === "ERROR" && metadata?.error) updateData.errorMessage = metadata.error;

        await prisma.stream.update({
            where: { id: streamId },
            data: updateData,
        }).catch(() => { });
    }

    await prisma.streamEvent.create({
        data: {
            streamId,
            type,
            message,
            metadata: metadata || null,
        },
    });

    return NextResponse.json({ ok: true });
}
