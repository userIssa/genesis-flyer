"use client";

import { ordinal } from "@/lib/ordinal";
import type { Celebrant } from "@/lib/models";

export default function CelebrantCard({
  celebrant,
  onPhotoClick,
}: {
  celebrant: Celebrant;
  onPhotoClick?: (celebrant: Celebrant) => void;
}) {
  // Format name nicely into 2 lines if possible (e.g. First Name / Last Name)
  const nameParts = celebrant.name.trim().split(/\s+/);

  return (
    <div
      className={`relative flex w-[218px] flex-col ${
        onPhotoClick ? "group cursor-pointer transition-transform duration-150 hover:scale-[1.02]" : ""
      }`}
      onClick={() => onPhotoClick?.(celebrant)}
      title={onPhotoClick ? `Click to ${celebrant.photoUrl ? "change" : "upload"} photo for ${celebrant.name}` : undefined}
    >
      {/* Upper Card: Offset Red Layer + Photo + Name Bar */}
      <div className="relative w-full pt-4">
        {/* Red Offset Backdrop Block: peeks out on top-left behind the photo */}
        <div className="absolute left-0 top-6 bottom-0 right-0 bg-[#9A0000]" />

        {/* Photo Container: framed in white with drop shadow */}
        <div className="relative z-10 ml-auto w-[184px] h-[208px] bg-white border-2 border-white shadow-[0_4px_10px_rgba(0,0,0,0.28)] overflow-hidden">
          {celebrant.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={celebrant.photoUrl}
              alt={celebrant.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-slate-100 text-slate-400">
              <svg className="w-10 h-10 mb-1 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-[11px] font-medium">No photo</span>
            </div>
          )}

          {/* Interactive photo overlay */}
          {onPhotoClick ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
              <span className="rounded bg-black/70 px-2.5 py-1 text-[11px] font-bold shadow">
                {celebrant.photoUrl ? "Change Photo" : "Upload Photo"}
              </span>
            </div>
          ) : null}
        </div>

        {/* Name Bar: Solid red block directly beneath the photo */}
        <div className="relative z-10 w-full min-h-[50px] bg-[#9A0000] px-2 py-1 flex flex-col items-center justify-center text-center font-display font-black text-[15px] leading-[1.15] text-white tracking-tight">
          {nameParts.length === 2 ? (
            <>
              <span className="block">{nameParts[0]}</span>
              <span className="block">{nameParts[1]}</span>
            </>
          ) : (
            <span className="block">{celebrant.name}</span>
          )}
        </div>
      </div>

      {/* Info Bar: Circular Date Badge + Two-Tier Role/Unit Pill */}
      <div className="relative mt-2 flex items-center w-full h-[46px]">
        {/* Black Date Badge Circle */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-[46px] h-[46px] rounded-full bg-black border-[3px] border-white shadow-[0_2px_6px_rgba(0,0,0,0.3)] flex items-center justify-center">
          {/* Inner gold dotted bezel ring */}
          <svg className="absolute inset-0 w-full h-full p-[2.5px] pointer-events-none" viewBox="0 0 40 40">
            <circle
              cx="20"
              cy="20"
              r="16.5"
              fill="none"
              stroke="#ECC875"
              strokeWidth="1.2"
              strokeDasharray="1.2 3.1"
            />
          </svg>
          {/* Ordinal Day text */}
          <span className="relative z-10 font-display font-black text-[12px] text-white tracking-tighter">
            {ordinal(celebrant.birthDay)}
          </span>
        </div>

        {/* Right Info Pill with Divider */}
        <div className="ml-[34px] flex-1 flex flex-col overflow-hidden">
          {celebrant.position ? (
            <>
              {/* Top Row: Position */}
              <div className="flex h-[21px] items-center justify-end bg-[#9A0000] px-2.5 text-right font-display text-[10.5px] font-extrabold uppercase tracking-tight text-white">
                <span className="truncate">{celebrant.position}</span>
              </div>

              {/* White Horizontal Divider */}
              <div className="h-[2px] w-full bg-white" />

              {/* Bottom Row: Unit / Location */}
              <div className="flex h-[21px] items-center justify-end rounded-br-2xl bg-[#9A0000] px-2.5 text-right font-display text-[10px] font-bold text-white">
                <span className="truncate">{celebrant.unit}</span>
              </div>
            </>
          ) : (
            /* Single Row when only Unit is provided */
            <div className="flex h-[44px] items-center justify-end rounded-br-2xl bg-[#9A0000] px-2.5 text-right font-display text-[11px] font-bold text-white">
              <span className="truncate">{celebrant.unit}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
