import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

const WORKER_OFFLINE_THRESHOLD_MS = 60000; // 60 seconds

function getWorkerAuthUserId(request: Request): string | null {
    const auth = request.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return null;
    const token = auth.slice(7);
    if (token !== process.env.WORKER_AUTH_SECRET) return null;
    // For global worker routes, we find the worker by its own token below
    return "authenticated";
}

export async function POST(request: Request) {
    const auth = request.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = auth.slice(7);

    // Verify worker token
    const worker = await prisma.worker.findUnique({ where: { token } });
    if (!worker) return NextResponse.json({ error: "Invalid worker token" }, { status: 401 });

    const body = await request.json();
    const { status, hostname, version, activeStreamId } = body;

    const updated = await prisma.worker.update({
        where: { id: worker.id },
        data: {
            lastHeartbeat: new Date(),
            status: status || "IDLE",
            hostname: hostname || worker.hostname,
            version: version || worker.version,
            activeStreamId: activeStreamId || null,
        },
    });

    return NextResponse.json({ ok: true, workerId: worker.id });
}
