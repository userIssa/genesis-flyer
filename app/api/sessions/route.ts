import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { FlyerSession } from "@/lib/models";
import { parseCsvImport, parseJsonImport } from "@/lib/parseImport";

export async function GET() {
  await connectToDatabase();
  const sessions = await FlyerSession.find({}, "title monthTag createdAt updatedAt")
    .sort({ createdAt: -1 })
    .lean();
  return NextResponse.json({ sessions });
}

export async function POST(req: NextRequest) {
  await connectToDatabase();

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const title = (form.get("title") as string) || "Birthday Celebrants";
  const monthTag = (form.get("monthTag") as string) || "";
  const message = (form.get("message") as string) || "";

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const text = await file.text();
  const isJson = file.name.toLowerCase().endsWith(".json");
  const { celebrants, warnings } = isJson ? parseJsonImport(text) : parseCsvImport(text);

  if (celebrants.length === 0) {
    return NextResponse.json(
      { error: "No usable rows found in the file.", warnings },
      { status: 422 }
    );
  }

  // Sort by day of month up front — this is the order the printed flyer uses.
  celebrants.sort((a, b) => a.birthDay - b.birthDay);

  const session = await FlyerSession.create({
    title,
    monthTag,
    message,
    celebrants,
  });

  return NextResponse.json({ session, warnings }, { status: 201 });
}
