import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
    trustHost: true,
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const pathname = nextUrl.pathname;

            const publicRoutes = ["/login", "/api/auth"];
            const isPublic = publicRoutes.some((route) => pathname.startsWith(route));
            const isWorkerRoute = pathname.startsWith("/api/worker");

            if (isPublic || isWorkerRoute) {
                return true;
            }

            return isLoggedIn;
        },
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
    providers: [],
};
