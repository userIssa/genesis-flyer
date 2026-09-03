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
            <input
              type="file"
              accept=".csv,.json"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm"
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
          <h2 className="text-sm font-semibold text-slate-900">Previous flyers</h2>
          <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {sessions.map((s) => (
              <li key={s._id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{s.title}</p>
                  <p className="text-xs text-slate-400">{new Date(s.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-3">
                  <a className="text-genesis-red hover:underline" href={`/match/${s._id}`}>
                    Match photos
                  </a>
                  <a className="text-genesis-red hover:underline" href={`/preview/${s._id}`}>
                    Preview
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
