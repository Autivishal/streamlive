import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { current, newPassword } = await req.json();
    if (!current || !newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const valid = await bcrypt.compare(current, user.password);
    if (!valid) return NextResponse.json({ error: "Current password incorrect" }, { status: 400 });
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    return NextResponse.json({ success: true });
}
