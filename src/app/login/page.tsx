"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Tv2, Loader2 } from "lucide-react";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const rawCallback = searchParams.get("callbackUrl");
    const callbackUrl = (rawCallback && rawCallback.startsWith("/") && !rawCallback.startsWith("//"))
        ? rawCallback
        : "/dashboard";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError("Invalid email or password");
            } else {
                router.push(callbackUrl);
                router.refresh();
            }
        } catch (err) {
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="block text-sm font-medium text-white/60 mb-2">
                    Email
                </label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-white/60 mb-2">
                    Password
                </label>
                <div className="relative">
                    <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-white/25 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                    >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">
                    {error}
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
            >
                {loading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Signing in...
                    </>
                ) : (
                    "Sign In"
                )}
            </button>
        </form>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
            {/* Background gradient */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] bg-indigo-600/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-[40%] -right-[20%] w-[80%] h-[80%] bg-violet-600/10 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Card */}
                <div className="bg-[#13131a] border border-white/5 rounded-2xl p-8 shadow-2xl">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/25">
                            <Tv2 className="w-7 h-7 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">My Loop Stream</h1>
                        <p className="text-sm text-white/40 mt-1">Personal streaming control panel</p>
                    </div>

                    <Suspense fallback={<div className="text-center py-6"><Loader2 className="w-6 h-6 animate-spin text-white/30 mx-auto" /></div>}>
                        <LoginForm />
                    </Suspense>

                    <p className="text-center text-white/25 text-xs mt-6">
                        Personal use only · My Loop Stream
                    </p>
                </div>
            </div>
        </div>
    );
}
