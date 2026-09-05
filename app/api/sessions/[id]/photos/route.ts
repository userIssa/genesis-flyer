import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { connectToDatabase } from "@/lib/mongodb";
import { FlyerSession } from "@/lib/models";
import { autoMatchPhotos } from "@/lib/matchPhotos";

// Uploaded photos are written under public/uploads/<sessionId>/ so the preview
// and Puppeteer's print page can both load them by plain URL.
function uploadDir(sessionId: string) {
  return path.join(process.cwd(), "public", "uploads", sessionId);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await connectToDatabase();
  const session = await FlyerSession.findById(params.id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const form = await req.formData();
  const celebrantId = form.get("celebrantId") as string | null;
  const files = form.getAll("files") as File[];
  if (files.length === 0) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  }

  const dir = uploadDir(params.id);
  await mkdir(dir, { recursive: true });

  // Direct upload for an individual celebrant
  if (celebrantId) {
    const celebrant = session.celebrants.id(celebrantId);
    if (!celebrant) return NextResponse.json({ error: "Celebrant not found" }, { status: 404 });

    const file = files[0];
    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, safeName), buffer);

    celebrant.photoUrl = `/uploads/${params.id}/${safeName}`;
    celebrant.photoMatchedBy = "manual";
    await session.save();

    return NextResponse.json({ session, celebrant });
  }

  // Bulk upload with auto-matching
  const savedFilenames: string[] = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, safeName), buffer);
    savedFilenames.push(safeName);
  }

  // Only try to match celebrants who don't already have a photo.
  const unmatchedCelebrants = session.celebrants.filter((c) => !c.photoUrl);
  const { matches, unmatchedFilenames, unmatchedCelebrantIds } = autoMatchPhotos(
    savedFilenames,
    unmatchedCelebrants.map((c) => ({ _id: (c._id as any).toString(), name: c.name }))
  );

  for (const m of matches) {
    const celebrant = session.celebrants.id(m.celebrantId);
    if (celebrant) {
      celebrant.photoUrl = `/uploads/${params.id}/${m.filename}`;
      celebrant.photoMatchedBy = "auto";
    }
  }
  await session.save();

  return NextResponse.json({
    matchedCount: matches.length,
    unmatchedFilenames,
    unmatchedCelebrantIds,
    session,
  });
}

// Manual fallback: pair an already-uploaded (unmatched) filename with a celebrant by hand, or remove a photo.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await connectToDatabase();
  const { celebrantId, filename, action } = await req.json();

  const session = await FlyerSession.findById(params.id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const celebrant = session.celebrants.id(celebrantId);
  if (!celebrant) return NextResponse.json({ error: "Celebrant not found" }, { status: 404 });

  if (action === "remove" || (!filename && action !== "keep")) {
    celebrant.photoUrl = null;
    celebrant.photoMatchedBy = null;
  } else {
    celebrant.photoUrl = `/uploads/${params.id}/${filename}`;
    celebrant.photoMatchedBy = "manual";
  }
  await session.save();

  return NextResponse.json({ session });
}
