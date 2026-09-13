import { Job } from "./api";

export interface PlaylistVideo {
    id: string;
    title: string;
    secureUrl: string;
}

export function getOrderedVideos(job: Job): PlaylistVideo[] {
    if (!job.playlist) return [];
    return job.playlist.videos.map((v) => ({
        id: v.id,
        title: v.title,
        secureUrl: v.secureUrl,
    }));
}

/**
 * Build a concat list for the given loop pass.
 * Returns the lines that go in the FFmpeg concat file.
 */
export function buildConcatFileContent(
    videos: PlaylistVideo[],
    passIndex: number,
    loopMode: "ONCE" | "INFINITE" | "REPEAT",
    repeatCount: number | null
): string | null {
    if (videos.length === 0) return null;

    let videoList: PlaylistVideo[] = [];

    if (loopMode === "ONCE") {
        videoList = videos;
    } else if (loopMode === "INFINITE") {
        // We handle looping by relaunching FFmpeg each pass
        videoList = videos;
    } else if (loopMode === "REPEAT") {
        const count = repeatCount ?? 1;
        if (passIndex >= count) return null; // Done
        videoList = videos;
    }

    const lines = videoList.map((v) => {
        // Escape special characters in paths/URLs
        const escaped = v.secureUrl.replace(/\\/g, "/");
        return `file '${escaped}'\nduration ${0}`; // duration 0 = use actual duration
    });

    return lines.join("\n");
}

export function shouldContinueLoop(
    passIndex: number,
    loopMode: "ONCE" | "INFINITE" | "REPEAT",
    repeatCount: number | null
): boolean {
    if (loopMode === "ONCE") return passIndex < 1;
    if (loopMode === "INFINITE") return true;
    if (loopMode === "REPEAT") return passIndex < (repeatCount ?? 1);
    return false;
}
