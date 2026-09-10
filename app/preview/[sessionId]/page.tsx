"use client";

import { useEffect, useRef, useState } from "react";
import FlyerPages from "@/components/FlyerPages";
import type { Celebrant } from "@/lib/models";
import { compressImage } from "@/lib/compressImage";

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

  // Responsive scaling & zoom controls
  const [scale, setScale] = useState(0.55);
  const [zoomMode, setZoomMode] = useState<"fit" | number>("fit");
  const [windowWidth, setWindowWidth] = useState<number>(1200);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/sessions/${params.sessionId}`)
      .then((r) => r.json())
      .then((d) => setSession(d.session));
  }, [params.sessionId]);

  useEffect(() => {
    function updateWidth() {
      setWindowWidth(window.innerWidth);
    }
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useEffect(() => {
    if (zoomMode === "fit") {
      // Calculate responsive scale based on window width with margin
      const padding = windowWidth < 640 ? 24 : windowWidth < 1024 ? 48 : 80;
      const available = Math.max(260, windowWidth - padding);
      // Auto-fit scale: minimum 0.20 for small phones, up to 0.85 for large displays
      const computedScale = Math.min(0.85, Math.max(0.2, +(available / 1300).toFixed(3)));
      setScale(computedScale);
    } else {
      setScale(zoomMode);
    }
  }, [windowWidth, zoomMode]);

  function handleZoomIn() {
    setZoomMode((prev) => {
      const current = typeof prev === "number" ? prev : scale;
      return Math.min(1.2, +(current + 0.1).toFixed(2));
    });
  }

  function handleZoomOut() {
    setZoomMode((prev) => {
      const current = typeof prev === "number" ? prev : scale;
      return Math.max(0.25, +(current - 0.1).toFixed(2));
    });
  }

  function handleZoomReset() {
    setZoomMode("fit");
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch(`/api/sessions/${params.sessionId}/export`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${session?.title ?? "flyer"}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        setExporting(false);
        return;
      }
    } catch (err) {
      console.warn("Server-side PDF generation error, opening print view:", err);
    }
    // Fallback: in serverless environments without Chromium, open the high-res print view
    window.open(`/print/${params.sessionId}`, "_blank");
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
    setStatusMessage(`Compressing & uploading photo for ${activeCelebrant.name}…`);

    try {
      const optimizedFile = await compressImage(file);
      const form = new FormData();
      form.append("celebrantId", activeCelebrant._id as string);
      form.append("files", optimizedFile);

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
    <main className="min-h-screen bg-slate-100 pb-20 w-full overflow-x-hidden">
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

      {/* Sticky Header: responsive on minimized window and mobile */}
      <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur px-3 py-2 sm:px-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          {/* Left section: Home button, session title, photo missing count */}
          <div className="flex items-center gap-2.5 min-w-0">
            <a
              href="/"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-sm shrink-0"
              title="Return to Home"
            >
              <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="hidden xs:inline">Home</span>
            </a>

            <div className="h-5 w-px bg-slate-200 shrink-0 hidden sm:block" />

            <div className="min-w-0 flex-1">
              <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                {session.title}
              </h1>
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs">
                {missingPhotoCount > 0 ? (
                  <span className="text-amber-600 font-medium truncate">
                    {missingPhotoCount} missing · <span className="hidden sm:inline">click card to upload</span><span className="sm:hidden">click card</span>
                  </span>
                ) : (
                  <span className="text-emerald-600 font-medium">All photos matched</span>
                )}
                {statusMessage && (
                  <span className="font-semibold text-genesis-red animate-pulse truncate">
                    • {statusMessage}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right section: Zoom controls and action buttons */}
          <div className="flex items-center justify-between md:justify-end gap-2 shrink-0 pt-1 md:pt-0 border-t md:border-t-0 border-slate-100">
            {/* Zoom Controls */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs text-slate-600 shadow-sm">
              <button
                onClick={handleZoomOut}
                disabled={scale <= 0.25}
                className="rounded px-2 py-1 hover:bg-white disabled:opacity-30 transition-colors font-bold"
                title="Zoom Out"
              >
                −
              </button>
              <button
                onClick={handleZoomReset}
                className={`rounded px-2 py-1 text-[11px] font-semibold transition-colors ${
                  zoomMode === "fit" ? "bg-white text-slate-900 shadow-sm" : "hover:bg-white text-slate-600"
                }`}
                title="Auto Fit to Screen"
              >
                {zoomMode === "fit" ? "Fit" : `${Math.round(scale * 100)}%`}
              </button>
              <button
                onClick={handleZoomIn}
                disabled={scale >= 1.2}
                className="rounded px-2 py-1 hover:bg-white disabled:opacity-30 transition-colors font-bold"
                title="Zoom In"
              >
                +
              </button>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`/match/${session._id}`}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm whitespace-nowrap"
              >
                <span className="hidden sm:inline">Back to </span>Matching
              </a>
              <button
                onClick={handleExport}
                disabled={exporting || uploading}
                className="rounded-lg bg-genesis-red px-3 sm:px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50 hover:opacity-90 shadow-sm transition-all whitespace-nowrap"
              >
                {exporting ? "Generating…" : "Export PDF"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Scaled flyer canvas container */}
      <div className="mx-auto mt-6 px-2 sm:px-4 flex flex-col items-center w-full">
        <FlyerPages
          title={session.title}
          monthTag={session.monthTag}
          message={session.message}
          celebrants={session.celebrants}
          onCelebrantClick={handleCelebrantClick}
          scale={scale}
        />
      </div>
    </main>
  );
}
