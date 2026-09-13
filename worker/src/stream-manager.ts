import fs from "fs";
import path from "path";
import os from "os";
import { Job, postEvent } from "./api";
import { FFmpegProcess } from "./ffmpeg";
import { getOrderedVideos, shouldContinueLoop } from "./playlist";
import { logger } from "./logger";

type StreamState = "IDLE" | "STARTING" | "STREAMING" | "STOPPING" | "ERROR";

const BACKOFF_DELAYS = [5000, 10000, 20000, 30000, 60000];
const MAX_RETRIES = 5;

export class StreamManager {
    private state: StreamState = "IDLE";
    private ffmpeg = new FFmpegProcess();
    private currentJob: Job | null = null;
    private passIndex = 0;
    private retryCount = 0;
    private retryTimeout: NodeJS.Timeout | null = null;
    private concatFilePath: string | null = null;

    getState(): StreamState { return this.state; }
    getCurrentJobId(): string | null { return this.currentJob?.id ?? null; }

    async handleJob(job: Job): Promise<void> {
        if (this.state === "IDLE" || this.state === "ERROR") {
            if (job.status === "STARTING") {
                await this.startStream(job);
            }
        } else if (this.state === "STREAMING" || this.state === "STARTING") {
            if (job.status === "STOPPING") {
                await this.stopStream();
            }
        }
    }

    private async startStream(job: Job): Promise<void> {
        logger.info(`[StreamManager] Starting stream: ${job.name}`);
        this.currentJob = job;
        this.state = "STARTING";
        this.passIndex = 0;
        this.retryCount = 0;

        await postEvent(job.id, "STREAM_STARTED", `Worker started stream: ${job.name}`, {
            status: "STREAMING",
        });

        await this.runPass(job);
    }

    private async runPass(job: Job): Promise<void> {
        if (this.state === "STOPPING") return;

        const videos = getOrderedVideos(job);
        if (videos.length === 0) {
            logger.error("[StreamManager] Playlist has no videos");
            await this.markError(job.id, "Playlist contains no videos");
            return;
        }

        logger.info(`[StreamManager] Pass ${this.passIndex + 1} — ${videos.length} videos`);

        // Write concat list to temp file
        const concatContent = videos
            .map((v) => `file '${v.secureUrl.replace(/'/g, "'\\''")}'`)
            .join("\n");

        const tmpDir = os.tmpdir();
        this.concatFilePath = path.join(tmpDir, `mls_concat_${Date.now()}.txt`);
        fs.writeFileSync(this.concatFilePath, concatContent, "utf-8");
        logger.info(`[StreamManager] Concat list written: ${this.concatFilePath}`);

        const firstVideo = videos[0];
        await postEvent(job.id, "VIDEO_PLAYING", `Playing: ${firstVideo.title}`, {
            currentVideoIdx: 0,
            currentVideoTitle: firstVideo.title,
        });

        const args = this.ffmpeg.buildArgs(
            {
                videoUrls: videos.map((v) => v.secureUrl),
                rtmpUrl: job.rtmpUrl,
                streamKey: job.streamKey,
                resolution: job.resolution,
                videoBitrate: job.videoBitrate,
                audioBitrate: job.audioBitrate,
            },
            this.concatFilePath
        );

        this.state = "STREAMING";

        this.ffmpeg.start(args, async (exitCode) => {
            this.cleanup();

            if (this.state === "STOPPING") {
                await this.finishStream(job.id);
                return;
            }

            if (exitCode === 0 || exitCode === null) {
                // Clean exit — check if we should loop
                this.passIndex++;
                if (shouldContinueLoop(this.passIndex, job.loopMode, job.repeatCount)) {
                    logger.info(`[StreamManager] Loop pass ${this.passIndex + 1} starting`);
                    this.retryCount = 0;
                    await this.runPass(job);
                } else {
                    logger.info("[StreamManager] Stream completed all passes");
                    await postEvent(job.id, "STREAM_COMPLETED", "Stream finished all playlist passes", { status: "STOPPED" });
                    this.state = "IDLE";
                    this.currentJob = null;
                }
            } else {
                // Crash — attempt recovery
                await this.handleCrash(job, exitCode);
            }
        });
    }

    private async handleCrash(job: Job, exitCode: number | null): Promise<void> {
        this.retryCount++;
        if (this.retryCount > MAX_RETRIES) {
            const msg = `FFmpeg crashed ${this.retryCount} times. Marking stream as ERROR.`;
            logger.error(`[StreamManager] ${msg}`);
            await this.markError(job.id, msg);
            return;
        }

        const delay = BACKOFF_DELAYS[Math.min(this.retryCount - 1, BACKOFF_DELAYS.length - 1)];
        logger.warn(`[StreamManager] FFmpeg exited (code ${exitCode}). Retry ${this.retryCount}/${MAX_RETRIES} in ${delay / 1000}s...`);

        await postEvent(job.id, "FFMPEG_CRASHED", `FFmpeg exited (code ${exitCode}). Retrying in ${delay / 1000}s...`, {
            metadata: { exitCode, retryCount: this.retryCount },
        });

        this.retryTimeout = setTimeout(async () => {
            if (this.state !== "STOPPING") {
                logger.info(`[StreamManager] Restarting FFmpeg (retry ${this.retryCount})`);
                await this.runPass(job);
            }
        }, delay);
    }

    async stopStream(): Promise<void> {
        logger.info("[StreamManager] Stop requested");
        this.state = "STOPPING";
        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
            this.retryTimeout = null;
        }
        this.ffmpeg.stop();
    }

    private async finishStream(streamId: string): Promise<void> {
        await postEvent(streamId, "STREAM_STOPPED", "Stream stopped by user request", {
            status: "STOPPED",
        });
        this.state = "IDLE";
        this.currentJob = null;
    }

    private async markError(streamId: string, message: string): Promise<void> {
        await postEvent(streamId, "STREAM_ERROR", message, {
            status: "ERROR",
            metadata: { error: message },
        });
        this.state = "ERROR";
        this.currentJob = null;
    }

    private cleanup(): void {
        if (this.concatFilePath && fs.existsSync(this.concatFilePath)) {
            try { fs.unlinkSync(this.concatFilePath); } catch { }
            this.concatFilePath = null;
        }
    }
}
