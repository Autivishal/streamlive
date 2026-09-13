"use client";

import { useState, useEffect } from "react";

interface WorkerStatus {
    id: string;
    name: string | null;
    hostname: string | null;
    status: string;
    lastHeartbeat: string | null;
}

export function useWorkerStatus() {
    const [worker, setWorker] = useState<WorkerStatus | null>(null);
    const [isOnline, setIsOnline] = useState(false);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch("/api/worker/status");
                if (res.ok) {
                    const data = await res.json();
                    setWorker(data.worker);
                    setIsOnline(data.isOnline);
                }
            } catch { }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    return { worker, isOnline };
}
