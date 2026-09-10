"use client";

import { useEffect, useRef, useState } from "react";
import FlyerPages from "@/components/FlyerPages";
import type { Celebrant } from "@/lib/models";
import { compressImage } from "@/lib/compressImage";
import { downloadFlyerAsPdf, downloadFlyerAsJpegZip, type ExportProgress } from "@/lib/exportFlyer";

type SessionData = {
  _id: string;
  title: string;
  monthTag: string;
  message: string;
  celebrants: Celebrant[];
};

export default function PreviewPage({ params }: { params: { sessionId: string } }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeCelebrant, setActiveCelebrant] = useState<Celebrant | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Direct export states
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const exportContainerRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportDropdownOpen(false);
      }
    }
    if (exportDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [exportDropdownOpen]);

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
      const padding = windowWidth < 640 ? 24 : windowWidth < 1024 ? 48 : 80;
      const available = Math.max(260, windowWidth - padding);
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

  // Direct multi-page PDF download
  async function handleDownloadPdf() {
    if (!session || !exportContainerRef.current) return;
    setIsExporting(true);
    setExportProgress({ current: 0, total: 1, stage: "Preparing flyer pages for PDF…" });

    try {
      const pageElements = Array.from(
        exportContainerRef.current.querySelectorAll<HTMLElement>(".flyer-page")
      );
      if (pageElements.length === 0) {
        alert("No flyer pages found to export.");
        setIsExporting(false);
        setExportProgress(null);
        return;
      }
      await downloadFlyerAsPdf(pageElements, session.title, setExportProgress);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      alert("Failed to generate PDF download. Please try again.");
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  }

  // Direct JPEG ZIP archive download
  async function handleDownloadJpegs() {
    if (!session || !exportContainerRef.current) return;
    setIsExporting(true);
    setExportProgress({ current: 0, total: 1, stage: "Preparing flyer pages for JPEG conversion…" });

    try {
      const pageElements = Array.from(
        exportContainerRef.current.querySelectorAll<HTMLElement>(".flyer-page")
      );
      if (pageElements.length === 0) {
        alert("No flyer pages found to export.");
        setIsExporting(false);
        setExportProgress(null);
        return;
      }
      await downloadFlyerAsJpegZip(pageElements, session.title, setExportProgress);
    } catch (err) {
      console.error("Failed to generate JPEG ZIP:", err);
      alert("Failed to generate JPEG ZIP archive. Please try again.");
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
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

      {/* Sticky Header */}
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

          {/* Right section: Zoom controls and Export Action Buttons */}
          <div className="flex items-center justify-between md:justify-end gap-2 shrink-0 pt-1 md:pt-0 border-t md:border-t-0 border-slate-100 flex-wrap">
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

            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={`/match/${session._id}`}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm whitespace-nowrap"
              >
                <span className="hidden sm:inline">Back to </span>Matching
              </a>

              {/* Unified Export Dropdown */}
              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => setExportDropdownOpen((prev) => !prev)}
                  disabled={isExporting || uploading}
                  className="flex items-center gap-1.5 sm:gap-2 rounded-lg bg-genesis-red px-3.5 sm:px-4 py-1.5 text-xs font-bold text-white hover:bg-[#c2141c] shadow transition-all whitespace-nowrap disabled:opacity-50"
                  title="Export Flyer"
                >
                  <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Export</span>
                  <svg
                    className={`h-3.5 w-3.5 text-white/80 transition-transform duration-150 ${
                      exportDropdownOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {exportDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white p-1.5 shadow-2xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Export Format
                    </div>

                    {/* PDF Document Option */}
                    <button
                      onClick={() => {
                        setExportDropdownOpen(false);
                        handleDownloadPdf();
                      }}
                      className="w-full flex items-start gap-3 rounded-lg p-2.5 text-left hover:bg-red-50/60 transition-colors group"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100/70 text-genesis-red group-hover:bg-genesis-red group-hover:text-white transition-colors">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                          <span>PDF Document</span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">.pdf</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                          Multi-page landscape document, ideal for viewing & printing
                        </p>
                      </div>
                    </button>

                    {/* JPEG Pages ZIP Option */}
                    <button
                      onClick={() => {
                        setExportDropdownOpen(false);
                        handleDownloadJpegs();
                      }}
                      className="w-full flex items-start gap-3 rounded-lg p-2.5 text-left hover:bg-amber-50/60 transition-colors group mt-0.5"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100/70 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                          <span>JPEG Pages</span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">.zip</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                          All pages as high-resolution images bundled in a ZIP file
                        </p>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Export progress modal */}
      {exportProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="mx-auto mb-3.5 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-genesis-red">
              <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-900">Preparing Your Download</h3>
            <p className="mt-1 text-xs text-slate-600 font-medium">{exportProgress.stage}</p>

            <div className="mt-4 w-full rounded-full bg-slate-100 h-2 overflow-hidden border border-slate-200">
              <div
                className="bg-genesis-red h-full transition-all duration-200"
                style={{
                  width: `${exportProgress.total > 0 ? Math.min(100, Math.round((exportProgress.current / exportProgress.total) * 100)) : 10}%`,
                }}
              />
            </div>
            <p className="mt-3 text-[11px] text-slate-400">
              Rendering full-resolution pages directly in your browser. Download will begin automatically.
            </p>
          </div>
        </div>
      )}

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

      {/* Hidden 1300px unscaled container used for high-fidelity JPEG / PDF export */}
      <div
        id="export-container"
        ref={exportContainerRef}
        aria-hidden="true"
        className="pointer-events-none"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "1300px",
          zIndex: -9999,
          opacity: 0,
        }}
      >
        <FlyerPages
          title={session.title}
          monthTag={session.monthTag}
          message={session.message}
          celebrants={session.celebrants}
          scale={1}
        />
      </div>
    </main>
  );
}
