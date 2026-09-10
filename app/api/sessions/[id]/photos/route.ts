import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { FlyerSession, Photo } from "@/lib/models";
import { autoMatchPhotos } from "@/lib/matchPhotos";

export const dynamic = "force-dynamic";

// GET unassigned photos for this session
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const unmatched = await Photo.find({ sessionId: params.id, celebrantId: null })
      .select("filename _id")
      .lean();

    return NextResponse.json({
      unmatchedFilenames: unmatched.map((p) => p.filename),
      photos: unmatched.map((p) => ({ id: p._id.toString(), filename: p.filename })),
    });
  } catch (err: any) {
    console.error("Failed to load unmatched photos:", err);
    return NextResponse.json({ error: err.message || "Failed to load photos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const session = await FlyerSession.findById(params.id);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const form = await req.formData();
    const celebrantId = form.get("celebrantId") as string | null;
    const files = form.getAll("files") as File[];
    if (files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    // Direct upload for an individual celebrant
    if (celebrantId) {
      const celebrant = session.celebrants.id(celebrantId);
      if (!celebrant) return NextResponse.json({ error: "Celebrant not found" }, { status: 404 });

      const file = files[0];
      const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      // Remove existing photo document for this celebrant
      await Photo.deleteMany({ sessionId: session._id, celebrantId: celebrant._id });

      const photo = await Photo.create({
        sessionId: session._id,
        celebrantId: celebrant._id,
        filename: safeName,
        contentType: file.type || "image/jpeg",
        data: buffer,
      });

      celebrant.photoUrl = `/api/photos/${photo._id}`;
      celebrant.photoMatchedBy = "manual";
      await session.save();

      return NextResponse.json({ session, celebrant });
    }

    // Bulk upload with auto-matching
    const savedPhotos = [];
    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const buffer = Buffer.from(await file.arrayBuffer());

      const photo = await Photo.create({
        sessionId: session._id,
        celebrantId: null,
        filename: safeName,
        contentType: file.type || "image/jpeg",
        data: buffer,
      });
      savedPhotos.push(photo);
    }

    // Only try to match celebrants who don't already have a photo
    const unmatchedCelebrants = session.celebrants.filter((c) => !c.photoUrl);
    const { matches, unmatchedFilenames, unmatchedCelebrantIds } = autoMatchPhotos(
      savedPhotos.map((p) => p.filename),
      unmatchedCelebrants.map((c) => ({ _id: (c._id as any).toString(), name: c.name }))
    );

    for (const m of matches) {
      const celebrant = session.celebrants.id(m.celebrantId);
      const photo = savedPhotos.find((p) => p.filename === m.filename);
      if (celebrant && photo) {
        celebrant.photoUrl = `/api/photos/${photo._id}`;
        celebrant.photoMatchedBy = "auto";
        photo.celebrantId = celebrant._id;
        await photo.save();
      }
    }
    await session.save();

    return NextResponse.json({
      matchedCount: matches.length,
      unmatchedFilenames,
      unmatchedCelebrantIds,
      session,
    });
  } catch (err: any) {
    console.error("Photo upload error:", err);
    return NextResponse.json({ error: err.message || "Error uploading photo" }, { status: 500 });
  }
}

// Manual fallback: pair an already-uploaded (unmatched) filename with a celebrant by hand, or remove a photo.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const { celebrantId, filename, photoId, action } = await req.json();

    const session = await FlyerSession.findById(params.id);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const celebrant = session.celebrants.id(celebrantId);
    if (!celebrant) return NextResponse.json({ error: "Celebrant not found" }, { status: 404 });

    if (action === "remove" || (!filename && !photoId && action !== "keep")) {
      await Photo.deleteMany({ sessionId: session._id, celebrantId: celebrant._id });
      celebrant.photoUrl = null;
      celebrant.photoMatchedBy = null;
    } else {
      // Find the photo document by id or filename in this session
      const query = photoId
        ? { _id: photoId, sessionId: session._id }
        : { filename, sessionId: session._id };

      const photo = await Photo.findOne(query).sort({ createdAt: -1 });
      if (photo) {
        // Disassociate any previous photo for this celebrant
        await Photo.deleteMany({ sessionId: session._id, celebrantId: celebrant._id, _id: { $ne: photo._id } });

        photo.celebrantId = celebrant._id;
        await photo.save();

        celebrant.photoUrl = `/api/photos/${photo._id}`;
        celebrant.photoMatchedBy = "manual";
      }
    }
    await session.save();

    return NextResponse.json({ session });
  } catch (err: any) {
    console.error("Photo patch error:", err);
    return NextResponse.json({ error: err.message || "Failed to update photo" }, { status: 500 });
  }
}
