import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { FlyerSession } from "@/lib/models";
import { parseCsvImport, parseJsonImport } from "@/lib/parseImport";

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const session = await FlyerSession.findById(params.id);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const mode = (form.get("mode") as string) || "update"; // "update" | "replace" | "append"

    if (!file) {
      return NextResponse.json({ error: "No CSV or JSON file uploaded" }, { status: 400 });
    }

    const text = await file.text();
    const isJson = file.name.toLowerCase().endsWith(".json");
    const { celebrants, warnings } = isJson ? parseJsonImport(text) : parseCsvImport(text);

    if (celebrants.length === 0) {
      return NextResponse.json(
        { error: "No valid celebrant rows found in the file.", warnings },
        { status: 422 }
      );
    }

    let updatedCount = 0;
    let addedCount = 0;

    if (mode === "replace") {
      // Map existing photos by normalized name to preserve uploaded photos
      const photoMap = new Map<string, { photoUrl?: string | null; photoMatchedBy?: "auto" | "manual" | null }>();
      session.celebrants.forEach((c) => {
        if (c.photoUrl) {
          photoMap.set(normalizeName(c.name), {
            photoUrl: c.photoUrl,
            photoMatchedBy: c.photoMatchedBy,
          });
        }
      });

      session.celebrants = celebrants.map((c) => {
        const existing = photoMap.get(normalizeName(c.name));
        return {
          ...c,
          photoUrl: existing?.photoUrl ?? null,
          photoMatchedBy: existing?.photoMatchedBy ?? null,
        };
      }) as any;
      addedCount = celebrants.length;
    } else {
      // "update" or "append" mode
      const existingByNorm = new Map<string, any>();
      session.celebrants.forEach((c) => {
        existingByNorm.set(normalizeName(c.name), c);
      });

      for (const row of celebrants) {
        const norm = normalizeName(row.name);
        const existing = existingByNorm.get(norm);

        if (existing && mode === "update") {
          // Update details while keeping photo intact
          if (row.position) existing.position = row.position;
          if (row.unit) existing.unit = row.unit;
          if (row.birthDay) existing.birthDay = row.birthDay;
          updatedCount++;
        } else {
          // Add new celebrant
          session.celebrants.push({
            name: row.name,
            position: row.position || "",
            unit: row.unit || "",
            birthDay: row.birthDay,
            photoUrl: null,
            photoMatchedBy: null,
          } as any);
          addedCount++;
        }
      }
    }

    // Sort celebrants by birthday (1-31)
    session.celebrants.sort((a, b) => a.birthDay - b.birthDay);
    await session.save();

    return NextResponse.json({
      session,
      updatedCount,
      addedCount,
      totalCount: session.celebrants.length,
      warnings,
    });
  } catch (err: any) {
    console.error("Error importing CSV into session:", err);
    return NextResponse.json({ error: err.message || "Failed to import CSV" }, { status: 500 });
  }
}
