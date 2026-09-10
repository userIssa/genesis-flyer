import { NextRequest, NextResponse } from "next/server";
import { rm } from "fs/promises";
import path from "path";
import { connectToDatabase } from "@/lib/mongodb";
import { FlyerSession } from "@/lib/models";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await connectToDatabase();
  const session = await FlyerSession.findById(params.id).lean();
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  return NextResponse.json({ session });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await connectToDatabase();
  const body = await req.json();

  const session = await FlyerSession.findByIdAndUpdate(
    params.id,
    { $set: body },
    { new: true, runValidators: true }
  );
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  return NextResponse.json({ session });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await connectToDatabase();
  const result = await FlyerSession.findByIdAndDelete(params.id);
  if (!result) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  // Clean up uploaded photos directory for this session
  try {
    const dir = path.join(process.cwd(), "public", "uploads", params.id);
    await rm(dir, { recursive: true, force: true });
  } catch (err) {
    console.error("Failed to delete upload folder for session:", err);
  }

  return NextResponse.json({ ok: true });
}
