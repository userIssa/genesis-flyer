"use client";

import { useEffect, useState } from "react";
import FlyerPages from "@/components/FlyerPages";
import type { Celebrant } from "@/lib/models";

type SessionData = {
  _id: string;
  title: string;
  monthTag: string;
  message: string;
  celebrants: Celebrant[];
};

export default function PreviewPage({ params }: { params: { sessionId: string } }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch(`/api/sessions/${params.sessionId}`)
      .then((r) => r.json())
      .then((d) => setSession(d.session));
  }, [params.sessionId]);

  async function handleExport() {
    setExporting(true);
    const res = await fetch(`/api/sessions/${params.sessionId}/export`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${session?.title ?? "flyer"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setExporting(false);
  }

  if (!session) return <main className="p-12 text-sm text-slate-500">Loading…</main>;

  const missingPhotoCount = session.celebrants.filter((c) => !c.photoUrl).length;

  return (
    <main className="min-h-screen bg-slate-100 pb-20">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div>
          <h1 className="text-sm font-semibold text-slate-900">{session.title}</h1>
          {missingPhotoCount > 0 ? (
            <p className="text-xs text-amber-600">{missingPhotoCount} celebrant(s) still missing a photo</p>
          ) : (
            <p className="text-xs text-emerald-600">All photos matched</p>
          )}
        </div>
        <div className="flex gap-3">
          <a href={`/match/${session._id}`} className="rounded border border-slate-300 px-4 py-2 text-sm">
            Back to matching
          </a>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="rounded bg-genesis-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {exporting ? "Generating PDF…" : "Export PDF"}
          </button>
        </div>
      </div>

      <div className="mx-auto mt-8 flex w-fit flex-col items-center gap-8">
        <div className="scale-[0.55] origin-top">
          <FlyerPages
            title={session.title}
            monthTag={session.monthTag}
            message={session.message}
            celebrants={session.celebrants}
          />
        </div>
      </div>
    </main>
  );
}
