import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { getSignedUploadParams } from "@/lib/cloudinary/client";

export async function GET() {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = getSignedUploadParams("streamlive/videos");
    return NextResponse.json(params);
}
