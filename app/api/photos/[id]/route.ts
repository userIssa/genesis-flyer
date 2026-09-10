import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Photo } from "@/lib/models";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!mongoose.isValidObjectId(params.id)) {
      return new NextResponse("Invalid photo ID", { status: 400 });
    }

    await connectToDatabase();
    const photo = await Photo.findById(params.id).lean();

    if (!photo || !photo.data) {
      return new NextResponse("Photo not found", { status: 404 });
    }

    const buffer = Buffer.isBuffer(photo.data)
      ? photo.data
      : (photo.data as any).buffer
      ? Buffer.from((photo.data as any).buffer)
      : Buffer.from(photo.data);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": photo.contentType || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("Error serving photo:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
