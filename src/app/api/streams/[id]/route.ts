import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { encrypt } from "@/lib/security/encryption";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const stream = await prisma.stream.findFirst({
        where: { id, userId: session.user.id },
        include: {
            playlist: { include: { items: { include: { video: true }, orderBy: { position: "asc" } } } },
            worker: { select: { id: true, name: true, hostname: true, status: true, lastHeartbeat: true } },
        },
    });
    if (!stream) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { streamKeyEnc, ...safe } = stream;
    return NextResponse.json({ stream: safe });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const stream = await prisma.stream.findFirst({ where: { id, userId: session.user.id } });
    if (!stream) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const body = await req.json();
    const updateData: Record<string, unknown> = {};
    if (body.name) updateData.name = body.name;
    if (body.playlistId !== undefined) updateData.playlistId = body.playlistId;
    if (body.streamKey) updateData.streamKeyEnc = encrypt(body.streamKey);
    const updated = await prisma.stream.update({ where: { id }, data: updateData });
    const { streamKeyEnc, ...safe } = updated;
    return NextResponse.json({ stream: safe });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const stream = await prisma.stream.findFirst({ where: { id, userId: session.user.id } });
    if (!stream) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (stream.status === "STREAMING") return NextResponse.json({ error: "Cannot delete a running stream" }, { status: 400 });
    await prisma.stream.delete({ where: { id } });
    return NextResponse.json({ success: true });
}
