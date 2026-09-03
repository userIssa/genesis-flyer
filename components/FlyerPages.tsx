import type { Celebrant } from "@/lib/models";
import CelebrantCard from "./CelebrantCard";
import { BalloonDecoration, CakeDecoration } from "./Decorations";

const PER_PAGE = 10;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function CoverPage({ title, monthTag, message }: { title: string; monthTag: string; message: string }) {
  return (
    <div className="flyer-page relative flex flex-col bg-genesis-cream px-16 py-14">
      <div className="flex items-center justify-between">
        <div className="text-lg font-extrabold tracking-wide text-genesis-red">
          GENESIS <span className="text-slate-900">GROUP</span>
        </div>
      </div>

      <div className="mt-16 flex flex-1 items-center gap-10">
        <CakeDecoration className="h-40 w-40 shrink-0" />
        <div className="h-40 w-px bg-genesis-gold" />
        <div>
          <p className="font-script text-sm uppercase tracking-[0.3em] text-genesis-gold">Happy</p>
          <h1 className="font-script text-7xl leading-none text-genesis-gold">Birthday</h1>
          <p className="mt-6 max-w-xl text-sm font-semibold leading-relaxed text-slate-800">
            {message}
          </p>
        </div>
      </div>

      <BalloonDecoration className="absolute right-10 top-10 h-40 w-24" />
      <h2 className="mt-auto text-4xl font-extrabold uppercase tracking-tight text-slate-900">
        {title}
      </h2>
      {monthTag ? <p className="mt-1 text-xs italic text-slate-400">{monthTag}</p> : null}
    </div>
  );
}

function GridPage({
  celebrants,
  tag,
}: {
  celebrants: Celebrant[];
  tag: string;
}) {
  const rows = chunk(celebrants, 5);
  return (
    <div className="flyer-page relative flex flex-col bg-genesis-cream px-14 py-10">
      {tag ? <p className="mb-4 text-xs italic text-slate-400">{tag}</p> : null}

      <div className="flex flex-1 flex-col justify-start gap-6">
        {rows.map((row, i) => (
          <div key={i} className="flex justify-between">
            {row.map((c) => (
              <CelebrantCard key={c._id as string} celebrant={c} />
            ))}
          </div>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between pt-4">
        <CakeDecoration className="h-16 w-16" />
        <div className="text-sm font-extrabold text-genesis-red">
          GENESIS <span className="text-slate-900">GROUP</span>
        </div>
      </div>
    </div>
  );
}

export default function FlyerPages({
  title,
  monthTag,
  message,
  celebrants,
}: {
  title: string;
  monthTag: string;
  message: string;
  celebrants: Celebrant[];
}) {
  const sorted = [...celebrants].sort((a, b) => a.birthDay - b.birthDay);
  const pages = chunk(sorted, PER_PAGE);

  return (
    <>
      <CoverPage title={title} monthTag={monthTag} message={message} />
      {pages.map((page, i) => (
        <GridPage key={i} celebrants={page} tag={monthTag} />
      ))}
    </>
  );
}
