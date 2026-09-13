import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req: NextRequest & { auth: any }) => {
    const isAuthenticated = !!req.auth;
    const pathname = req.nextUrl.pathname;

    // Public routes
    const publicRoutes = ["/login", "/api/auth"];
    const isPublic = publicRoutes.some((route) => pathname.startsWith(route));

    // Worker API routes — authenticated by worker token, not session
    const isWorkerRoute = pathname.startsWith("/api/worker");

    if (isPublic || isWorkerRoute) {
        return NextResponse.next();
    }

    if (!isAuthenticated) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
});

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|public).*)",
    ],
};
