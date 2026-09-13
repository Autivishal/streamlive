"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import {
    Tv2,
    LayoutDashboard,
    Video,
    ListVideo,
    Radio,
    Calendar,
    Settings,
    LogOut,
    Circle,
    Wifi,
    WifiOff,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkerStatus } from "@/hooks/use-worker-status";

const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/videos", icon: Video, label: "Videos" },
    { href: "/playlists", icon: ListVideo, label: "Playlists" },
    { href: "/streams", icon: Radio, label: "Streams" },
    { href: "/schedules", icon: Calendar, label: "Schedules" },
    { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const { worker, isOnline } = useWorkerStatus();

    return (
        <aside
            className={cn(
                "flex flex-col bg-[#0d0d14] border-r border-white/5 transition-all duration-300",
                collapsed ? "w-[70px]" : "w-[240px]"
            )}
        >
            {/* Logo */}
            <div className={cn("flex items-center gap-3 px-4 py-5 border-b border-white/5", collapsed && "justify-center px-0")}>
                <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Tv2 className="w-5 h-5 text-white" />
                </div>
                {!collapsed && (
                    <span className="text-sm font-bold text-white whitespace-nowrap">My Loop Stream</span>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 py-4 space-y-1 px-2">
                {navItems.map(({ href, icon: Icon, label }) => {
                    const active = pathname === href || pathname.startsWith(href + "/");
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                                active
                                    ? "bg-indigo-500/15 text-indigo-400"
                                    : "text-white/50 hover:text-white hover:bg-white/5",
                                collapsed && "justify-center px-0"
                            )}
                            title={collapsed ? label : undefined}
                        >
                            <Icon className="w-5 h-5 flex-shrink-0" />
                            {!collapsed && label}
                        </Link>
                    );
                })}
            </nav>

            {/* Worker status */}
            <div className={cn("px-4 py-3 border-t border-white/5", collapsed && "px-2")}>
                {!collapsed ? (
                    <div className="flex items-center gap-2 text-xs">
                        {isOnline ? (
                            <>
                                <Circle className="w-2 h-2 fill-emerald-400 text-emerald-400 flex-shrink-0" />
                                <span className="text-white/50">
                                    Worker: <span className="text-emerald-400">Connected</span>
                                </span>
                            </>
                        ) : (
                            <>
                                <WifiOff className="w-3 h-3 text-amber-400 flex-shrink-0" />
                                <span className="text-amber-400">Worker Offline</span>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="flex justify-center">
                        {isOnline ? (
                            <Wifi className="w-4 h-4 text-emerald-400" />
                        ) : (
                            <WifiOff className="w-4 h-4 text-amber-400" />
                        )}
                    </div>
                )}
            </div>

            {/* Sign out + collapse */}
            <div className={cn("px-2 py-3 border-t border-white/5 space-y-1", collapsed && "px-2")}>
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs text-white/40 hover:text-white hover:bg-white/5 transition-all",
                        collapsed && "justify-center px-0"
                    )}
                >
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>}
                </button>
                <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all",
                        collapsed && "justify-center px-0"
                    )}
                    title={collapsed ? "Sign Out" : undefined}
                >
                    <LogOut className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && "Sign Out"}
                </button>
            </div>
        </aside>
    );
}
