import dotenv from "dotenv";
import path from "path";
import os from "os";

dotenv.config({ path: path.join(__dirname, "../.env") });

export const config = {
    apiUrl: process.env.API_URL || "http://localhost:3000",
    workerToken: process.env.WORKER_TOKEN || "",
    ffmpegPath: process.env.FFMPEG_PATH || "ffmpeg",
    hostname: os.hostname(),
    version: "1.0.0",
    heartbeatIntervalMs: 20000,   // 20 seconds
    pollIntervalMs: 5000,         // 5 seconds
};

if (!config.workerToken) {
    console.error("[CONFIG] WORKER_TOKEN is not set. Please configure worker/.env");
    process.exit(1);
}
if (!config.apiUrl) {
    console.error("[CONFIG] API_URL is not set. Please configure worker/.env");
    process.exit(1);
}
