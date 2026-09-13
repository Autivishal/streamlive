type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

export const logger = {
    info: (msg: string, ...args: any[]) => log("INFO", msg, ...args),
    warn: (msg: string, ...args: any[]) => log("WARN", msg, ...args),
    error: (msg: string, ...args: any[]) => log("ERROR", msg, ...args),
    debug: (msg: string, ...args: any[]) => log("DEBUG", msg, ...args),
};

function log(level: LogLevel, msg: string, ...args: any[]) {
    const ts = new Date().toISOString();
    const sanitized = sanitize(msg);
    const extra = args.length > 0 ? " " + args.map(a => sanitize(String(a))).join(" ") : "";
    console.log(`[${ts}] [${level}] ${sanitized}${extra}`);
}

const SENSITIVE_PATTERNS = [
    /stream[_-]?key[=:\s]+\S+/gi,
    /rtmp:\/\/[^\s]*\/[^\s]+/g,  // redact RTMP stream keys
    /password[=:\s]+\S+/gi,
    /token[=:\s]+\S{8,}/gi,
];

function sanitize(msg: string): string {
    let s = msg;
    // Redact stream keys from rtmp URLs (keep server, redact key)
    s = s.replace(/(rtmp:\/\/[^\s/]+\/[^\s/]+\/)\S+/g, "$1[REDACTED]");
    return s;
}
