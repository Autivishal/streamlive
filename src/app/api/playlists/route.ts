import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const playlists = await prisma.playlist.findMany({
        where: { userId: session.user.id },
        include: { items: { include: { video: true }, orderBy: { position: "asc" } } },
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ playlists });
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name, description } = body;
    if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const playlist = await prisma.playlist.create({
        data: { userId: session.user.id, name: name.trim(), description: description?.trim() || null },
        include: { items: { include: { video: true }, orderBy: { position: "asc" } } },
    });
    return NextResponse.json({ playlist }, { status: 201 });
}
