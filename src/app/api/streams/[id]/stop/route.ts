import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const stream = await prisma.stream.findFirst({ where: { id, userId: session.user.id } });
    if (!stream) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const updated = await prisma.stream.update({ where: { id }, data: { status: "STOPPING" } });
    await prisma.streamEvent.create({
        data: { streamId: id, userId: session.user.id, type: "STREAM_STOPPING", message: `Stop requested: ${stream.name}` },
    });
    const { streamKeyEnc, ...safe } = updated;
    return NextResponse.json({ stream: safe });
}
