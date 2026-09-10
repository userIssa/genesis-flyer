"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SessionSummary = {
  _id: string;
  title: string;
  monthTag: string;
  createdAt: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [title, setTitle] = useState("March Birthday Celebrants");
  const [monthTag, setMonthTag] = useState("#MarchBirthdayCelebrants2026");
  const [message, setMessage] = useState(
    "Warmest birthday wishes to our celebrants! May this new year of life bring you joy, growth, and fantastic memories. We are so glad to have you on our team."
  );
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions ?? []));
  }, []);

  async function handleDeleteSession(id: string, sessionTitle: string) {
    if (
      !window.confirm(
        `Delete "${sessionTitle}"?\n\nThis will permanently delete this flyer, its celebrant list, and all uploaded photos.`
      )
    ) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s._id !== id));
      } else {
        const d = await res.json();
        alert(d.error || "Failed to delete flyer session");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while deleting the flyer session");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleImport() {
    if (!file) {
      setError("Choose a CSV or JSON file exported from the HRM platform first.");
      return;
    }
    setBusy(true);
    setError(null);
    setWarnings([]);

    const form = new FormData();
    form.append("file", file);
    form.append("title", title);
    form.append("monthTag", monthTag);
    form.append("message", message);

    const res = await fetch("/api/sessions", { method: "POST", body: form });
    const data = await res.json();
    setBusy(false);

    if (!res.ok) {
      setError(data.error ?? "Import failed");
      setWarnings((data.warnings ?? []).map((w: any) => `Row ${w.row}: ${w.reason}`));
      return;
    }
    if (data.warnings?.length) {
      setWarnings(data.warnings.map((w: any) => `Row ${w.row}: ${w.reason}`));
    }
    router.push(`/match/${data.session._id}`);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold text-slate-900">Birthday Flyer Generator</h1>
      <p className="mt-1 text-sm text-slate-500">
        Import the celebrants list from the HRM export, match photos, then export the printable flyer.
      </p>

      <section className="mt-8 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-900">New flyer</h2>

        <div className="mt-4 grid gap-4">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Flyer title</span>
            <input
              className="rounded border border-slate-300 px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Hashtag / month tag</span>
            <input
              className="rounded border border-slate-300 px-3 py-2"
              value={monthTag}
              onChange={(e) => setMonthTag(e.target.value)}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Greeting message</span>
            <textarea
              className="rounded border border-slate-300 px-3 py-2"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">HRM export (CSV or JSON)</span>
            <span className="text-xs text-slate-500">
              Columns recognized: <strong>Name</strong>, <strong>Job Role</strong> (or Role / Position), <strong>Work Location</strong> (or Unit / Branch), and <strong>Birthday</strong>.
            </span>
            <input
              type="file"
              accept=".csv,.json"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
            />
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {warnings.length > 0 ? (
            <ul className="rounded bg-amber-50 p-3 text-xs text-amber-800">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          ) : null}

          <button
            onClick={handleImport}
            disabled={busy}
            className="justify-self-start rounded bg-genesis-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Importing…" : "Import & continue"}
          </button>
        </div>
      </section>

      {sessions.length > 0 ? (
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Previous flyers</h2>
            <span className="text-xs text-slate-400">
              {sessions.length} flyer{sessions.length === 1 ? "" : "s"} saved
            </span>
          </div>
          <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
            {sessions.map((s) => (
              <li key={s._id} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50 transition-colors">
                <div>
                  <p className="font-semibold text-slate-800">{s.title}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>
                      {new Date(s.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    {s.monthTag ? (
                      <>
                        <span>•</span>
                        <span className="font-medium text-slate-500">{s.monthTag}</span>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <a
                    className="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-100 transition-colors"
                    href={`/match/${s._id}`}
                  >
                    Match photos
                  </a>
                  <a
                    className="rounded bg-genesis-red/10 px-3 py-1.5 text-xs font-semibold text-genesis-red hover:bg-genesis-red/20 transition-colors"
                    href={`/preview/${s._id}`}
                  >
                    Preview
                  </a>
                  <button
                    onClick={() => handleDeleteSession(s._id, s.title)}
                    disabled={deletingId === s._id}
                    className="flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 transition-colors"
                    title="Delete flyer session"
                  >
                    {deletingId === s._id ? (
                      <span className="text-red-500 font-semibold">Deleting…</span>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        <span>Delete</span>
                      </>
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
