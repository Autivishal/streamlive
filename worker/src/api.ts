import axios, { AxiosInstance } from "axios";
import { config } from "./config";
import { logger } from "./logger";

export interface Job {
    id: string;
    name: string;
    status: string;
    rtmpUrl: string;
    streamKey: string;
    loopMode: "ONCE" | "INFINITE" | "REPEAT";
    repeatCount: number | null;
    resolution: string;
    videoBitrate: string;
    audioBitrate: string;
    currentVideoIdx: number;
    playlist: {
        id: string;
        name: string;
        videos: Array<{
            id: string;
            title: string;
            secureUrl: string;
            duration: number;
            width: number | null;
            height: number | null;
            format: string | null;
        }>;
    } | null;
}

let client: AxiosInstance;

function getClient() {
    if (!client) {
        client = axios.create({
            baseURL: config.apiUrl,
            headers: { Authorization: `Bearer ${config.workerToken}` },
            timeout: 10000,
        });
    }
    return client;
}

export async function sendHeartbeat(status: string, activeStreamId?: string | null): Promise<boolean> {
    try {
        await getClient().post("/api/worker/heartbeat", {
            status,
            hostname: config.hostname,
            version: config.version,
            activeStreamId: activeStreamId || null,
        });
        return true;
    } catch (err: any) {
        logger.warn("Heartbeat failed:", err.message);
        return false;
    }
}

export async function getJobs(): Promise<Job[]> {
    try {
        const res = await getClient().get("/api/worker/jobs");
        return res.data.jobs || [];
    } catch (err: any) {
        logger.warn("Failed to fetch jobs:", err.message);
        return [];
    }
}

export async function postEvent(
    streamId: string,
    type: string,
    message: string,
    opts?: { status?: string; currentVideoIdx?: number; currentVideoTitle?: string; metadata?: any }
) {
    try {
        await getClient().post("/api/worker/events", {
            streamId,
            type,
            message,
            ...opts,
        });
    } catch (err: any) {
        logger.warn("Failed to post event:", err.message);
    }
}
