import { config } from "./config";
import { logger } from "./logger";
import { sendHeartbeat, getJobs } from "./api";
import { StreamManager } from "./stream-manager";

const streamManager = new StreamManager();
let running = true;

async function heartbeatLoop() {
    while (running) {
        const state = streamManager.getState();
        const activeId = streamManager.getCurrentJobId();

        const ok = await sendHeartbeat(
            state === "STREAMING" ? "STREAMING" :
                state === "STARTING" ? "STARTING" :
                    state === "STOPPING" ? "STOPPING" :
                        state === "ERROR" ? "ERROR" : "IDLE",
            activeId
        );

        if (ok) {
            logger.debug("[Heartbeat] Sent OK");
        }

        await sleep(config.heartbeatIntervalMs);
    }
}

async function pollLoop() {
    while (running) {
        try {
            const jobs = await getJobs();
            const managerState = streamManager.getState();

            for (const job of jobs) {
                const activeId = streamManager.getCurrentJobId();

                // Only handle the job that is relevant to current state
                if (job.status === "STARTING" && (managerState === "IDLE" || managerState === "ERROR")) {
                    await streamManager.handleJob(job);
                    break;
                } else if (job.status === "STOPPING" && activeId === job.id) {
                    await streamManager.handleJob(job);
                    break;
                }
            }
        } catch (err: any) {
            logger.error("[Poll] Error:", err.message);
        }

        await sleep(config.pollIntervalMs);
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

async function main() {
    logger.info("========================================");
    logger.info(" My Loop Stream — Local Worker");
    logger.info(`  API:     ${config.apiUrl}`);
    logger.info(`  Machine: ${config.hostname}`);
    logger.info(`  FFmpeg:  ${config.ffmpegPath}`);
    logger.info("========================================");

    // Send initial heartbeat to signal CONNECTED
    const ok = await sendHeartbeat("IDLE", null);
    if (!ok) {
        logger.warn("[Worker] Initial heartbeat failed — check API_URL and WORKER_TOKEN");
        logger.warn("[Worker] Will continue to retry...");
    } else {
        logger.info("[Worker] Connected to dashboard successfully");
    }

    // Start both loops concurrently
    await Promise.all([heartbeatLoop(), pollLoop()]);
}

// Graceful shutdown
process.on("SIGINT", async () => {
    logger.info("[Worker] Shutting down (SIGINT)");
    running = false;
    if (streamManager.getState() === "STREAMING" || streamManager.getState() === "STARTING") {
        await streamManager.stopStream();
        // Wait a moment for cleanup
        await sleep(2000);
    }
    process.exit(0);
});

process.on("SIGTERM", async () => {
    logger.info("[Worker] Shutting down (SIGTERM)");
    running = false;
    await streamManager.stopStream();
    process.exit(0);
});

main().catch((err) => {
    logger.error("[Worker] Fatal error:", err.message);
    process.exit(1);
});
