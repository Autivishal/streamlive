import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";

async function seed() {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
        console.error("ADMIN_EMAIL and ADMIN_PASSWORD must be set");
        process.exit(1);
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        console.log(`Admin user already exists: ${email}`);
        return;
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
        data: {
            email,
            name: "Admin",
            password: hashed,
        },
    });

    // Create a default worker token
    const workerToken = require("crypto").randomBytes(32).toString("hex");
    await prisma.worker.create({
        data: {
            userId: user.id,
            token: workerToken,
            name: "My PC Worker",
        },
    });

    console.log(`✅ Admin created: ${email}`);
    console.log(`✅ Worker token: ${workerToken}`);
    console.log("   Save this token in your worker/.env as WORKER_TOKEN=");
}

seed()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
