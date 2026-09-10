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

  const [editingCelebrant, setEditingCelebrant] = useState<Celebrant | null>(null);
  const [savingCelebrant, setSavingCelebrant] = useState(false);

  async function handleSaveCelebrant(c: Celebrant) {
    if (!c._id) return;
    setSavingCelebrant(true);
    try {
      const res = await fetch(`/api/sessions/${params.sessionId}/celebrants/${c._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: c.name,
          position: c.position,
          unit: c.unit,
          birthDay: c.birthDay,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSession(data.session);
        setEditingCelebrant(null);
        setNote(`Updated details for ${c.name}.`);
      } else {
        alert(data.error || "Failed to update celebrant");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating celebrant");
    } finally {
      setSavingCelebrant(false);
    }
  }

  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvMode, setCsvMode] = useState<"update" | "append" | "replace">("update");
  const [importingCsv, setImportingCsv] = useState(false);

  async function handleImportCsv(e: React.FormEvent) {
    e.preventDefault();
    if (!csvFile) return;
    setImportingCsv(true);

    const form = new FormData();
    form.append("file", csvFile);
    form.append("mode", csvMode);

    try {
      const res = await fetch(`/api/sessions/${params.sessionId}/import`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (res.ok) {
        setSession(data.session);
        setShowCsvModal(false);
        setCsvFile(null);
        setNote(
          `CSV imported! Updated ${data.updatedCount ?? 0} celebrant(s), added ${data.addedCount ?? 0} new.`
        );
      } else {
        alert(data.error || "Failed to import CSV");
      }
    } catch (err) {
      console.error(err);
      alert("Error importing CSV");
    } finally {
      setImportingCsv(false);
    }
  }

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
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setShowCsvModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-400 transition-colors whitespace-nowrap"
          >
            <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Import / Update CSV</span>
          </button>

          <a
            href={`/preview/${session._id}`}
            className="rounded-lg bg-genesis-red px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            Go to preview →
          </a>
        </div>
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
                  {/* Edit info button (Job Role, Work Location, Name) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingCelebrant({ ...c });
                    }}
                    title="Edit Job Role & Work Location"
                    className="absolute left-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-600 shadow border border-slate-200 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-slate-900 hover:text-white"
                  >
                    ✎
                  </button>

                  {/* Remove photo button */}
                  {c.photoUrl && !isUploading ? (
                    <button
                      type="button"
                      onClick={(e) => handleRemovePhoto(cid, c.name, e)}
                      title="Remove photo"
                      className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-500 shadow border border-slate-200 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500 hover:text-white"
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

                  {/* Name */}
                  <p className="line-clamp-1 text-xs font-bold text-slate-900 leading-snug w-full px-1">
                    {c.name}
                  </p>

                  {/* Job Role & Work Location display */}
                  <div className="mt-1 flex flex-col items-center w-full px-1">
                    {c.position ? (
                      <span className="text-[10px] font-bold text-genesis-red truncate max-w-full" title={c.position}>
                        {c.position}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCelebrant({ ...c });
                        }}
                        className="text-[9px] text-slate-400 hover:text-genesis-red underline"
                      >
                        + Add job role
                      </button>
                    )}
                    {c.unit ? (
                      <span className="text-[9.5px] font-medium text-slate-500 truncate max-w-full" title={c.unit}>
                        {c.unit}
                      </span>
                    ) : null}
                  </div>

                  {/* Birthday badge */}
                  <span className="mt-1.5 inline-block rounded bg-slate-100 px-2 py-0.5 text-[9.5px] font-bold text-slate-600 border border-slate-200/60">
                    {ordinal(c.birthDay)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Edit Celebrant Details Modal */}
      {editingCelebrant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Celebrant Details</h3>
                <p className="text-xs text-slate-500">Configure flyer badge role and work location</p>
              </div>
              <button
                onClick={() => setEditingCelebrant(null)}
                className="h-8 w-8 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await handleSaveCelebrant(editingCelebrant);
              }}
              className="mt-4 grid gap-3.5"
            >
              <div>
                <label className="text-xs font-semibold text-slate-700">Full Name</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-genesis-red focus:outline-none focus:ring-1 focus:ring-genesis-red"
                  value={editingCelebrant.name}
                  onChange={(e) => setEditingCelebrant({ ...editingCelebrant, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Job Role <span className="font-normal text-slate-500">(Top line of red badge)</span>
                </label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-genesis-red focus:outline-none focus:ring-1 focus:ring-genesis-red"
                  placeholder="e.g. Security Supervisor, Cashier, Manager"
                  value={editingCelebrant.position || ""}
                  onChange={(e) => setEditingCelebrant({ ...editingCelebrant, position: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Work Location <span className="font-normal text-slate-500">(Bottom line of red badge)</span>
                </label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-genesis-red focus:outline-none focus:ring-1 focus:ring-genesis-red"
                  placeholder="e.g. Hotel, Castle or Ogba Qsr"
                  value={editingCelebrant.unit || ""}
                  onChange={(e) => setEditingCelebrant({ ...editingCelebrant, unit: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Birth Day of Month <span className="font-normal text-slate-500">(1 - 31)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-genesis-red focus:outline-none focus:ring-1 focus:ring-genesis-red"
                  value={editingCelebrant.birthDay}
                  onChange={(e) =>
                    setEditingCelebrant({ ...editingCelebrant, birthDay: parseInt(e.target.value, 10) || 1 })
                  }
                  required
                />
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingCelebrant(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCelebrant}
                  className="rounded-lg bg-genesis-red px-5 py-2 text-xs font-semibold text-white hover:opacity-90 shadow disabled:opacity-50"
                >
                  {savingCelebrant ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import / Update CSV Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Import or Update Celebrants via CSV</h3>
                <p className="text-xs text-slate-500">Sync names, job roles, work locations, and birthdays</p>
              </div>
              <button
                onClick={() => setShowCsvModal(false)}
                className="h-8 w-8 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleImportCsv} className="mt-4 grid gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Select CSV or JSON File</label>
                <input
                  type="file"
                  accept=".csv,.json"
                  required
                  onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
                  className="mt-1 block w-full text-xs text-slate-600 file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                />
                <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs">
                  <span className="text-slate-500 text-[11px]">
                    Columns: <strong>Name</strong>, <strong>Job Role</strong>, <strong>Work Location</strong>, <strong>Birthday</strong>
                  </span>
                  <a
                    href="/celebrants_template.csv"
                    download
                    className="font-semibold text-genesis-red hover:underline flex items-center gap-1 shrink-0 text-[11px]"
                  >
                    📥 Download CSV Template
                  </a>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <label className="text-xs font-bold text-slate-800 block mb-2">Select Import Mode</label>
                <div className="space-y-2.5">
                  <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="csvMode"
                      value="update"
                      checked={csvMode === "update"}
                      onChange={() => setCsvMode("update")}
                      className="mt-0.5 text-genesis-red focus:ring-genesis-red"
                    />
                    <div>
                      <span className="font-semibold text-slate-900">Update Existing Celebrants (Recommended)</span>
                      <p className="text-[11px] text-slate-500">
                        Updates Job Roles and Work Locations for matching names. Existing uploaded photos are preserved!
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="csvMode"
                      value="append"
                      checked={csvMode === "append"}
                      onChange={() => setCsvMode("append")}
                      className="mt-0.5 text-genesis-red focus:ring-genesis-red"
                    />
                    <div>
                      <span className="font-semibold text-slate-900">Add As New Celebrants</span>
                      <p className="text-[11px] text-slate-500">
                        Appends any new people in this file to the flyer.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="csvMode"
                      value="replace"
                      checked={csvMode === "replace"}
                      onChange={() => setCsvMode("replace")}
                      className="mt-0.5 text-genesis-red focus:ring-genesis-red"
                    />
                    <div>
                      <span className="font-semibold text-slate-900">Replace Entire List</span>
                      <p className="text-[11px] text-slate-500">
                        Overwrites current celebrants with this file (keeps photos for matching names).
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCsvModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importingCsv || !csvFile}
                  className="rounded-lg bg-genesis-red px-5 py-2 text-xs font-semibold text-white hover:opacity-90 shadow disabled:opacity-50"
                >
                  {importingCsv ? "Importing…" : "Upload & Apply CSV"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
