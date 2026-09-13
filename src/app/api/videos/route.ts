import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const videos = await prisma.video.findMany({
        where: {
            userId: session.user.id,
            ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
        },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ videos });
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { cloudinaryPublicId, secureUrl, thumbnailUrl, title, filename, duration, width, height, format, bytes } = body;

    if (!cloudinaryPublicId || !secureUrl) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const video = await prisma.video.create({
        data: {
            userId: session.user.id,
            cloudinaryPublicId,
            secureUrl,
            thumbnailUrl: thumbnailUrl || null,
            title: title || filename || "Untitled",
            filename: filename || "video",
            duration: duration || 0,
            width: width || null,
            height: height || null,
            format: format || null,
            bytes: bytes || null,
        },
    });

    return NextResponse.json({ video }, { status: 201 });
}
