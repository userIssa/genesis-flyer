"use client";

import { useEffect, useRef, useState } from "react";
import type { Celebrant } from "@/lib/models";
import { ordinal } from "@/lib/ordinal";
import { compressImage } from "@/lib/compressImage";

type SessionData = {
  _id: string;
  title: string;
  celebrants: Celebrant[];
};

export default function MatchPage({ params }: { params: { sessionId: string } }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [unmatchedFilenames, setUnmatchedFilenames] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  // Individual profile upload & state
  const [uploadingCelebrantId, setUploadingCelebrantId] = useState<string | null>(null);
  const [activeCelebrantId, setActiveCelebrantId] = useState<string | null>(null);
  const [dragOverCelebrantId, setDragOverCelebrantId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "missing" | "matched">("all");

  const singleFileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const [sessionRes, photosRes] = await Promise.all([
        fetch(`/api/sessions/${params.sessionId}`),
        fetch(`/api/sessions/${params.sessionId}/photos`),
      ]);
      const data = await sessionRes.json();
      setSession(data.session);

      if (photosRes.ok) {
        const photosData = await photosRes.json();
        if (photosData.unmatchedFilenames) {
          setUnmatchedFilenames(photosData.unmatchedFilenames);
        }
      }
    } catch (err) {
      console.error("Failed to load session data:", err);
    }
  }

  useEffect(() => {
    load();
  }, [params.sessionId]);

  async function handleBulkUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setNote("Optimizing & compressing photos…");

    try {
      const fileArray = Array.from(files);
      const optimizedFiles = await Promise.all(fileArray.map((f) => compressImage(f)));

      const form = new FormData();
      optimizedFiles.forEach((f) => form.append("files", f));

      const res = await fetch(`/api/sessions/${params.sessionId}/photos`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      setBusy(false);

      if (!res.ok) {
        setNote(data.error ?? "Upload failed");
        return;
      }

      setSession(data.session);
      setUnmatchedFilenames((prev) => Array.from(new Set([...prev, ...data.unmatchedFilenames])));
      setNote(
        `Matched ${data.matchedCount} photo${data.matchedCount === 1 ? "" : "s"} automatically.` +
          (data.unmatchedFilenames.length
            ? ` ${data.unmatchedFilenames.length} photo(s) need manual matching below.`
            : "")
      );
    } catch (err) {
      console.error(err);
      setBusy(false);
      setNote("Error uploading photos. Please try again.");
    }
  }

  async function handleIndividualUpload(celebrantId: string, file: File) {
    setUploadingCelebrantId(celebrantId);
    setNote("Optimizing photo…");

    try {
      const optimized = await compressImage(file);
      const form = new FormData();
      form.append("celebrantId", celebrantId);
      form.append("files", optimized);

      const res = await fetch(`/api/sessions/${params.sessionId}/photos`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (res.ok) {
        setSession(data.session);
        setNote(`Updated photo for ${data.celebrant?.name ?? "celebrant"}.`);
      } else {
        setNote(data.error ?? "Failed to upload photo");
      }
    } catch (err) {
      console.error(err);
      setNote("Error uploading photo. Please try again.");
    } finally {
      setUploadingCelebrantId(null);
      setActiveCelebrantId(null);
    }
  }

  async function handleRemovePhoto(celebrantId: string, celebrantName: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Remove photo for ${celebrantName}?`)) return;

    setUploadingCelebrantId(celebrantId);
    try {
      const res = await fetch(`/api/sessions/${params.sessionId}/photos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ celebrantId, action: "remove" }),
      });
      const data = await res.json();
      if (res.ok) {
        setSession(data.session);
        setNote(`Photo removed for ${celebrantName}.`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingCelebrantId(null);
    }
  }

  async function assignManually(celebrantId: string, filename: string) {
    const res = await fetch(`/api/sessions/${params.sessionId}/photos`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ celebrantId, filename }),
    });
    const data = await res.json();
    if (res.ok) {
      setSession(data.session);
      setUnmatchedFilenames((prev) => prev.filter((f) => f !== filename));
    }
  }

  function triggerCelebrantUpload(celebrantId: string) {
    setActiveCelebrantId(celebrantId);
    if (singleFileInputRef.current) {
      singleFileInputRef.current.value = "";
      singleFileInputRef.current.click();
    }
  }

  if (!session) return <main className="p-12 text-sm text-slate-500">Loading…</main>;

  const sorted = [...session.celebrants].sort((a, b) => a.birthDay - b.birthDay);
  const missingPhoto = sorted.filter((c) => !c.photoUrl);
  const matchedPhoto = sorted.filter((c) => !!c.photoUrl);

  const filteredCelebrants = sorted.filter((c) => {
    if (filterTab === "missing" && c.photoUrl) return false;
    if (filterTab === "matched" && !c.photoUrl) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.position && c.position.toLowerCase().includes(q)) ||
      (c.unit && c.unit.toLowerCase().includes(q))
    );
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      {/* Hidden file input for individual profile uploads */}
      <input
        ref={singleFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && activeCelebrantId) {
            handleIndividualUpload(activeCelebrantId, file);
          }
        }}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <a
            href="/"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors shrink-0"
            title="Return to Home"
          >
            <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Home</span>
          </a>
          <div className="h-8 w-px bg-slate-200 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{session.title}</h1>
            <p className="text-xs sm:text-sm text-slate-500 truncate">
              {sorted.length} celebrants · {matchedPhoto.length} photo(s) matched ·{" "}
              {missingPhoto.length} missing
            </p>
          </div>
        </div>
        <a
          href={`/preview/${session._id}`}
          className="self-start sm:self-auto rounded-lg bg-genesis-red px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-90 transition-opacity whitespace-nowrap"
        >
          Go to preview →
        </a>
      </div>

      {/* Bulk Upload Section */}
      <section className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-slate-600">
          Drop or select all celebrant photos in bulk, or <strong>click any celebrant profile below</strong> to
          upload an image directly for that person.
        </p>
        <div className="mt-4 flex flex-col items-center justify-center">
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={busy}
            onChange={(e) => handleBulkUpload(e.target.files)}
            className="block text-sm file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
          />
        </div>
        {note ? (
          <p className="mt-3 rounded bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 inline-block border border-slate-200">
            {note}
          </p>
        ) : null}
      </section>

      {/* Manual matching for unmatched bulk uploads */}
      {unmatchedFilenames.length > 0 && missingPhoto.length > 0 ? (
        <section className="mt-8 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">
            Assign unmatched uploaded photos ({unmatchedFilenames.length} unassigned)
          </h2>
          <div className="mt-3 grid max-h-60 gap-2 overflow-y-auto pr-1">
            {missingPhoto.map((c) => (
              <div
                key={c._id as string}
                className="flex items-center justify-between rounded border border-slate-200 bg-white px-3 py-1.5 text-sm"
              >
                <span>
                  {c.name} <span className="text-slate-400">({ordinal(c.birthDay)})</span>
                </span>
                <select
                  defaultValue=""
                  onChange={(e) => e.target.value && assignManually(c._id as string, e.target.value)}
                  className="rounded border border-slate-300 px-2 py-1 text-sm bg-white"
                >
                  <option value="" disabled>
                    Choose photo…
                  </option>
                  {unmatchedFilenames.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Celebrants Grid Section */}
      <section className="mt-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">All celebrants</h2>
            <p className="text-xs text-slate-500">
              Click on any profile or drop an image directly onto a card to upload or replace their photo.
            </p>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs focus:border-genesis-red focus:outline-none focus:ring-1 focus:ring-genesis-red w-48"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="mt-4 flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-medium">
          <button
            onClick={() => setFilterTab("all")}
            className={`rounded px-2.5 py-1 transition-colors ${
              filterTab === "all"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All ({sorted.length})
          </button>
          <button
            onClick={() => setFilterTab("missing")}
            className={`rounded px-2.5 py-1 transition-colors ${
              filterTab === "missing"
                ? "bg-amber-600 text-white"
                : "text-amber-700 hover:bg-amber-50"
            }`}
          >
            Missing Photo ({missingPhoto.length})
          </button>
          <button
            onClick={() => setFilterTab("matched")}
            className={`rounded px-2.5 py-1 transition-colors ${
              filterTab === "matched"
                ? "bg-emerald-600 text-white"
                : "text-emerald-700 hover:bg-emerald-50"
            }`}
          >
            Has Photo ({matchedPhoto.length})
          </button>
        </div>

        {/* Celebrant Cards */}
        {filteredCelebrants.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No celebrants match your filter.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {filteredCelebrants.map((c) => {
              const cid = c._id as string;
              const isUploading = uploadingCelebrantId === cid;
              const isDragOver = dragOverCelebrantId === cid;

              return (
                <div
                  key={cid}
                  onClick={() => triggerCelebrantUpload(cid)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverCelebrantId(cid);
                  }}
                  onDragLeave={() => {
                    setDragOverCelebrantId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverCelebrantId(null);
                    const droppedFile = e.dataTransfer.files?.[0];
                    if (droppedFile && droppedFile.type.startsWith("image/")) {
                      handleIndividualUpload(cid, droppedFile);
                    }
                  }}
                  title="Click or drop an image to upload photo"
                  className={`group relative flex cursor-pointer flex-col items-center rounded-lg border bg-white p-2.5 text-center transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md ${
                    isDragOver
                      ? "border-genesis-red ring-2 ring-genesis-red/30 bg-red-50/20"
                      : "border-slate-200"
                  }`}
                >
                  {/* Remove photo button */}
                  {c.photoUrl && !isUploading ? (
                    <button
                      type="button"
                      onClick={(e) => handleRemovePhoto(cid, c.name, e)}
                      title="Remove photo"
                      className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600 opacity-0 shadow transition-all group-hover:opacity-100 hover:bg-red-500 hover:text-white"
                    >
                      ×
                    </button>
                  ) : null}

                  {/* Photo area */}
                  <div className="relative mb-2 h-20 w-20 overflow-hidden rounded bg-slate-100 shadow-inner">
                    {c.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.photoUrl} alt={c.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center text-[10px] text-slate-400 p-1">
                        <svg
                          className="h-5 w-5 mb-0.5 text-slate-300 group-hover:text-genesis-red transition-colors"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <span>No photo</span>
                      </div>
                    )}

                    {/* Hover overlay with Action prompt */}
                    <div
                      className={`absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white transition-opacity ${
                        isUploading
                          ? "opacity-100"
                          : isDragOver
                          ? "opacity-100 bg-genesis-red/80"
                          : "opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      {isUploading ? (
                        <div className="flex flex-col items-center gap-1 text-[10px]">
                          <svg
                            className="h-5 w-5 animate-spin text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          <span>Uploading…</span>
                        </div>
                      ) : isDragOver ? (
                        <span className="text-[10px] font-semibold text-white">Drop here!</span>
                      ) : (
                        <div className="flex flex-col items-center text-[10px] font-medium leading-tight">
                          <svg
                            className="h-4 w-4 mb-0.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                            />
                          </svg>
                          <span>{c.photoUrl ? "Change" : "Upload"}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Name and birth day badge */}
                  <p className="line-clamp-2 text-xs font-semibold text-slate-800 leading-snug">
                    {c.name}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400 font-medium">
                    {ordinal(c.birthDay)}
                  </p>
                  <span className="mt-1 text-[9px] text-genesis-red opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                    Click to {c.photoUrl ? "change" : "upload"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
