import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { deleteCloudinaryVideo } from "@/lib/cloudinary/client";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const video = await prisma.video.findFirst({
        where: { id, userId: session.user.id },
    });
    if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

    try { await deleteCloudinaryVideo(video.cloudinaryPublicId); } catch { }
    await prisma.video.delete({ where: { id } });
    return NextResponse.json({ success: true });
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const video = await prisma.video.findFirst({ where: { id, userId: session.user.id } });
    if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });
    return NextResponse.json({ video });
}
