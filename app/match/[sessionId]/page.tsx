"use client";

import { useEffect, useState } from "react";
import type { Celebrant } from "@/lib/models";
import { ordinal } from "@/lib/ordinal";

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

  async function load() {
    const res = await fetch(`/api/sessions/${params.sessionId}`);
    const data = await res.json();
    setSession(data.session);
  }

  useEffect(() => {
    load();
  }, [params.sessionId]);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setNote(null);

    const form = new FormData();
    Array.from(files).forEach((f) => form.append("files", f));

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
    setUnmatchedFilenames((prev) => [...prev, ...data.unmatchedFilenames]);
    setNote(
      `Matched ${data.matchedCount} photo${data.matchedCount === 1 ? "" : "s"} automatically.` +
        (data.unmatchedFilenames.length
          ? ` ${data.unmatchedFilenames.length} photo(s) need manual matching below.`
          : "")
    );
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

  if (!session) return <main className="p-12 text-sm text-slate-500">Loading…</main>;

  const sorted = [...session.celebrants].sort((a, b) => a.birthDay - b.birthDay);
  const missingPhoto = sorted.filter((c) => !c.photoUrl);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{session.title}</h1>
          <p className="text-sm text-slate-500">
            {sorted.length} celebrants · {sorted.length - missingPhoto.length} photo(s) matched
          </p>
        </div>
        <a
          href={`/preview/${session._id}`}
          className="rounded bg-genesis-red px-4 py-2 text-sm font-semibold text-white"
        >
          Go to preview →
        </a>
      </div>

      <section className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
        <p className="text-sm text-slate-600">
          Drop or select all the celebrant photos. Files are matched to names automatically by filename
          (e.g. <code>henry_rose.jpg</code> → Henry Rose) — anything that can&apos;t be matched confidently
          is left for you to assign below.
        </p>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={busy}
          onChange={(e) => handleUpload(e.target.files)}
          className="mx-auto mt-4 block text-sm"
        />
        {note ? <p className="mt-3 text-sm text-slate-700">{note}</p> : null}
      </section>

      {unmatchedFilenames.length > 0 && missingPhoto.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-slate-900">Assign remaining photos manually</h2>
          <div className="mt-3 grid gap-3">
            {missingPhoto.map((c) => (
              <div
                key={c._id as string}
                className="flex items-center justify-between rounded border border-slate-200 bg-white px-4 py-2 text-sm"
              >
                <span>
                  {c.name} <span className="text-slate-400">({ordinal(c.birthDay)})</span>
                </span>
                <select
                  defaultValue=""
                  onChange={(e) => e.target.value && assignManually(c._id as string, e.target.value)}
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
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

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-slate-900">All celebrants</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {sorted.map((c) => (
            <div key={c._id as string} className="rounded border border-slate-200 bg-white p-2 text-center">
              <div className="mx-auto mb-2 h-20 w-20 overflow-hidden rounded bg-slate-100">
                {c.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.photoUrl} alt={c.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                    No photo
                  </div>
                )}
              </div>
              <p className="text-xs font-medium text-slate-800">{c.name}</p>
              <p className="text-[10px] text-slate-400">{ordinal(c.birthDay)}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
