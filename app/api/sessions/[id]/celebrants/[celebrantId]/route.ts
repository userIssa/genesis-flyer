import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { FlyerSession } from "@/lib/models";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; celebrantId: string } }
) {
  try {
    await connectToDatabase();
    const session = await FlyerSession.findById(params.id);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const celebrant = session.celebrants.id(params.celebrantId);
    if (!celebrant) return NextResponse.json({ error: "Celebrant not found" }, { status: 404 });

    const body = await req.json();

    if (body.name !== undefined) celebrant.name = String(body.name).trim();
    if (body.position !== undefined) celebrant.position = String(body.position).trim();
    if (body.unit !== undefined) celebrant.unit = String(body.unit).trim();
    if (body.birthDay !== undefined) {
      const day = parseInt(body.birthDay, 10);
      if (day >= 1 && day <= 31) {
        celebrant.birthDay = day;
      }
    }

    await session.save();
    return NextResponse.json({ session, celebrant });
  } catch (err: any) {
    console.error("Error updating celebrant:", err);
    return NextResponse.json({ error: err.message || "Failed to update celebrant" }, { status: 500 });
  }
}
