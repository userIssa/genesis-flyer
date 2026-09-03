import { ordinal } from "@/lib/ordinal";
import type { Celebrant } from "@/lib/models";

export default function CelebrantCard({ celebrant }: { celebrant: Celebrant }) {
  return (
    <div className="flex w-[228px] flex-col">
      <div className="relative h-[190px] w-full overflow-hidden bg-slate-200">
        {celebrant.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={celebrant.photoUrl}
            alt={celebrant.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs text-slate-400">
            No photo
          </div>
        )}
      </div>

      <div className="bg-genesis-maroon px-2 py-1.5 text-center text-[15px] font-bold leading-tight text-white">
        {celebrant.name}
      </div>

      <div className="flex items-stretch">
        <div className="flex w-7 shrink-0 items-center justify-center bg-black text-[11px] font-bold text-white">
          {ordinal(celebrant.birthDay)}
        </div>
        <div className="flex-1 bg-genesis-maroon px-2 py-1 text-right text-[11px] font-semibold leading-tight text-white">
          <div>{celebrant.position}</div>
          <div className="opacity-90">{celebrant.unit}</div>
        </div>
      </div>
    </div>
  );
}
