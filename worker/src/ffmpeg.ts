import { spawn, ChildProcess } from "child_process";
import { config } from "./config";
import { logger } from "./logger";

export interface FFmpegOptions {
    videoUrls: string[];         // ordered array of Cloudinary video URLs
    rtmpUrl: string;
    streamKey: string;
    resolution: string;
    videoBitrate: string;
    audioBitrate: string;
}

export class FFmpegProcess {
    private process: ChildProcess | null = null;
    private startTime = 0;

    isRunning(): boolean {
        return this.process !== null && !this.process.killed;
    }

    elapsedSeconds(): number {
        return this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
    }

    /**
     * Build an FFmpeg command that plays all videos in sequence using the
     * concat demuxer, then streams to RTMP. Falls back to re-encoding if
     * videos have mixed codecs/resolutions.
     */
    buildArgs(opts: FFmpegOptions, concatListPath: string): string[] {
        const rtmpTarget = `${opts.rtmpUrl}/${opts.streamKey}`;

        const baseArgs = [
            "-re",
            "-f", "concat",
            "-safe", "0",
            "-protocol_whitelist", "file,http,https,tcp,tls,crypto",
            "-i", concatListPath,
        ];

        const needsTranscode =
            opts.resolution !== "source" ||
            opts.videoBitrate !== "auto";

        if (!needsTranscode) {
            // Stream copy — fastest, no re-encoding. Requires all videos to be h264/aac-compatible.
            return [
                ...baseArgs,
                "-c:v", "copy",
                "-c:a", "aac",
                "-b:a", opts.audioBitrate,
                "-f", "flv",
                rtmpTarget,
            ];
        }

        // Transcode mode
        const [vW, vH] = opts.resolution !== "source"
            ? opts.resolution.split("x").map(Number)
            : [1280, 720];

        const bitrateArgs = opts.videoBitrate !== "auto"
            ? ["-b:v", opts.videoBitrate]
            : ["-crf", "23"];

        return [
            ...baseArgs,
            "-vf", `scale=${vW}:${vH}:force_original_aspect_ratio=decrease,pad=${vW}:${vH}:(ow-iw)/2:(oh-ih)/2`,
            "-c:v", "libx264",
            "-preset", "veryfast",
            ...bitrateArgs,
            "-c:a", "aac",
            "-b:a", opts.audioBitrate,
            "-ar", "44100",
            "-f", "flv",
            rtmpTarget,
        ];
    }

    start(args: string[], onExit: (code: number | null) => void): void {
        if (this.isRunning()) {
            logger.warn("[FFmpeg] Already running");
            return;
        }

        logger.info(`[FFmpeg] Starting: ${config.ffmpegPath}`);
        this.startTime = Date.now();

        this.process = spawn(config.ffmpegPath, args, {
            stdio: ["ignore", "pipe", "pipe"],
        });

        this.process.stdout?.on("data", (d: Buffer) => {
            // FFmpeg outputs progress on stderr — stdout usually empty
        });

        this.process.stderr?.on("data", (d: Buffer) => {
            const line = d.toString().trim();
            // Only log meaningful lines, not raw progress
            if (line.includes("Error") || line.includes("error")) {
                logger.error("[FFmpeg]", line.slice(0, 200));
            } else if (line.includes("frame=") || line.includes("fps=")) {
                // Progress — debug only
            } else if (line.length > 0) {
                logger.debug("[FFmpeg]", line.slice(0, 200));
            }
        });

        this.process.on("exit", (code) => {
            logger.info(`[FFmpeg] Exited with code ${code}`);
            this.process = null;
            onExit(code);
        });

        this.process.on("error", (err) => {
            logger.error("[FFmpeg] Process error:", err.message);
            if (err.message.includes("ENOENT")) {
                logger.error(`[FFmpeg] Executable not found at: ${config.ffmpegPath}`);
                logger.error("[FFmpeg] Set FFMPEG_PATH in worker/.env");
            }
            this.process = null;
            onExit(-1);
        });
    }

    stop(): void {
        if (this.process) {
            logger.info("[FFmpeg] Stopping process...");
            this.process.kill("SIGTERM");
            // Force kill after 5s if it hasn't stopped
            setTimeout(() => {
                if (this.process) { this.process.kill("SIGKILL"); }
            }, 5000);
        }
    }
}
