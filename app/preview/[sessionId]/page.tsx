"use client";

import { useEffect, useRef, useState } from "react";
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
  const [uploading, setUploading] = useState(false);
  const [activeCelebrant, setActiveCelebrant] = useState<Celebrant | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function handleCelebrantClick(celebrant: Celebrant) {
    setActiveCelebrant(celebrant);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }

  async function handleFileUpload(file: File) {
    if (!activeCelebrant) return;
    setUploading(true);
    setStatusMessage(`Uploading photo for ${activeCelebrant.name}…`);

    const form = new FormData();
    form.append("celebrantId", activeCelebrant._id as string);
    form.append("files", file);

    try {
      const res = await fetch(`/api/sessions/${params.sessionId}/photos`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (res.ok) {
        setSession(data.session);
        setStatusMessage(`Photo updated for ${activeCelebrant.name}!`);
        setTimeout(() => setStatusMessage(null), 3500);
      } else {
        setStatusMessage(data.error ?? "Failed to upload photo");
      }
    } catch (err) {
      console.error(err);
      setStatusMessage("Error uploading photo");
    } finally {
      setUploading(false);
      setActiveCelebrant(null);
    }
  }

  if (!session) return <main className="p-12 text-sm text-slate-500">Loading…</main>;

  const missingPhotoCount = session.celebrants.filter((c) => !c.photoUrl).length;

  return (
    <main className="min-h-screen bg-slate-100 pb-20">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
        }}
      />

      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div>
          <h1 className="text-sm font-semibold text-slate-900">{session.title}</h1>
          <div className="flex items-center gap-2">
            {missingPhotoCount > 0 ? (
              <p className="text-xs text-amber-600">
                {missingPhotoCount} celebrant(s) still missing a photo (click any card to upload)
              </p>
            ) : (
              <p className="text-xs text-emerald-600">All photos matched · click any card to replace</p>
            )}
            {statusMessage && (
              <span className="text-xs font-semibold text-genesis-red animate-pulse">
                • {statusMessage}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <a href={`/match/${session._id}`} className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
            Back to matching
          </a>
          <button
            onClick={handleExport}
            disabled={exporting || uploading}
            className="rounded bg-genesis-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90"
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
            onCelebrantClick={handleCelebrantClick}
          />
        </div>
      </div>
    </main>
  );
}
