import crypto from "crypto";

const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 16;

function getKey(): Buffer {
    if (!ENCRYPTION_KEY_HEX) {
        throw new Error("ENCRYPTION_KEY environment variable is not set");
    }
    const key = Buffer.from(ENCRYPTION_KEY_HEX, "hex");
    if (key.length !== 32) {
        throw new Error("ENCRYPTION_KEY must be 32 bytes (64 hex characters)");
    }
    return key;
}

export function encrypt(text: string): string {
    if (!text) return "";
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
}

export function decrypt(encryptedText: string): string {
    if (!encryptedText) return "";
    const key = getKey();
    const [ivHex, encrypted] = encryptedText.split(":");
    if (!ivHex || !encrypted) {
        throw new Error("Invalid encrypted text format");
    }
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
}
