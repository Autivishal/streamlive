import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                const parsed = loginSchema.safeParse(credentials);
                if (!parsed.success) return null;

                const { email, password } = parsed.data;
                const user = await prisma.user.findUnique({ where: { email } });
                if (!user) return null;

                const valid = await bcrypt.compare(password, user.password);
                if (!valid) return null;

                return { id: user.id, email: user.email, name: user.name };
            },
        }),
    ],
    session: { strategy: "jwt" },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.email = user.email;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.email = token.email as string;
            }
            return session;
        },
    },
});
