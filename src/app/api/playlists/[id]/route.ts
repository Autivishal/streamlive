import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const playlist = await prisma.playlist.findFirst({
        where: { id, userId: session.user.id },
        include: { items: { include: { video: true }, orderBy: { position: "asc" } } },
    });
    if (!playlist) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ playlist });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { name, description, items } = body;
    const playlist = await prisma.playlist.findFirst({ where: { id, userId: session.user.id } });
    if (!playlist) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (items !== undefined) {
        await prisma.playlistItem.deleteMany({ where: { playlistId: id } });
        if (items.length > 0) {
            await prisma.playlistItem.createMany({
                data: items.map((item: { videoId: string }, idx: number) => ({
                    playlistId: id, videoId: item.videoId, position: idx,
                })),
            });
        }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;

    const updated = await prisma.playlist.update({
        where: { id },
        data: updateData,
        include: { items: { include: { video: true }, orderBy: { position: "asc" } } },
    });
    return NextResponse.json({ playlist: updated });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const playlist = await prisma.playlist.findFirst({ where: { id, userId: session.user.id } });
    if (!playlist) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.playlist.delete({ where: { id } });
    return NextResponse.json({ success: true });
}
