import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

export { cloudinary };

export interface SignedUploadParams {
    signature: string;
    timestamp: number;
    cloudName: string;
    apiKey: string;
    folder: string;
}

export function getSignedUploadParams(folder = "streamlive/videos"): SignedUploadParams {
    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = {
        folder,
        timestamp,
        resource_type: "video",
    };

    const signature = cloudinary.utils.api_sign_request(
        paramsToSign,
        process.env.CLOUDINARY_API_SECRET!
    );

    return {
        signature,
        timestamp,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
        apiKey: process.env.CLOUDINARY_API_KEY!,
        folder,
    };
}

export function getVideoThumbnail(publicId: string): string {
    return cloudinary.url(publicId, {
        resource_type: "video",
        format: "jpg",
        transformation: [
            { width: 640, height: 360, crop: "fill" },
            { quality: "auto" },
        ],
    });
}

export async function deleteCloudinaryVideo(publicId: string) {
    return cloudinary.uploader.destroy(publicId, { resource_type: "video" });
}
