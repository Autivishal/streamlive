import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

const OFFLINE_THRESHOLD_MS = 60000;

export async function GET(request: Request) {
    // Allow authenticated dashboard users
    const session = await auth();
    const workerTokenHeader = request.headers.get("Authorization")?.slice(7);

    let worker = null;

    if (session) {
        // Dashboard user — get their worker
        worker = await prisma.worker.findFirst({
            where: { userId: session.user.id },
            orderBy: { lastHeartbeat: "desc" },
        });
    } else if (workerTokenHeader) {
        // Worker itself checking its own status
        worker = await prisma.worker.findUnique({ where: { token: workerTokenHeader } });
    } else {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!worker) return NextResponse.json({ isOnline: false, worker: null });

    const isOnline =
        worker.lastHeartbeat !== null &&
        Date.now() - new Date(worker.lastHeartbeat).getTime() < OFFLINE_THRESHOLD_MS;

    const { token, ...safeWorker } = worker;
    return NextResponse.json({ isOnline, worker: safeWorker });
}
