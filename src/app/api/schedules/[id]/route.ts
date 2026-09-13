import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const schedule = await prisma.schedule.findFirst({ where: { id, userId: session.user.id } });
    if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const updated = await prisma.schedule.update({ where: { id }, data: { enabled: body.enabled } });
    const { streamKeyEnc, ...safe } = updated;
    return NextResponse.json({ schedule: safe });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const schedule = await prisma.schedule.findFirst({ where: { id, userId: session.user.id } });
    if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.schedule.delete({ where: { id } });
    return NextResponse.json({ success: true });
}
