import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import crypto from "crypto";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    let worker = await prisma.worker.findFirst({ where: { userId: session.user.id } });
    if (!worker) {
        const newToken = crypto.randomBytes(32).toString("hex");
        worker = await prisma.worker.create({ data: { userId: session.user.id, token: newToken, name: "My PC Worker" } });
    }
    return NextResponse.json({ token: worker.token });
}

export async function POST() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const newToken = crypto.randomBytes(32).toString("hex");
    const worker = await prisma.worker.findFirst({ where: { userId: session.user.id } });
    if (!worker) {
        const created = await prisma.worker.create({ data: { userId: session.user.id, token: newToken, name: "My PC Worker" } });
        return NextResponse.json({ token: created.token });
    }
    const updated = await prisma.worker.update({ where: { id: worker.id }, data: { token: newToken } });
    return NextResponse.json({ token: updated.token });
}
