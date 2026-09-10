import type { Celebrant } from "@/lib/models";
import CelebrantCard from "./CelebrantCard";

const PER_PAGE = 10;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function CoverPage({ title, monthTag, message }: { title: string; monthTag: string; message: string }) {
  return (
    <div
      className="flyer-page relative flex flex-col justify-between overflow-hidden bg-[#FAF6F0] px-16 py-12 shadow-xl"
      style={{
        backgroundImage: "url('/assets/cover_bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Top Left: Realistic Black Glitter Balloon with trailing ribbon */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/balloon_black_left.png"
        alt="Black Balloon"
        className="pointer-events-none absolute -left-2 -top-2 w-[185px] h-auto object-contain drop-shadow-md z-10"
      />

      {/* Bottom Right: Metallic Gold Glitter Balloon */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/balloon_gold_right.png"
        alt="Gold Balloon"
        className="pointer-events-none absolute -right-6 -bottom-6 w-[230px] h-auto object-contain z-10"
      />

      {/* Top Center: Genesis Group Logo */}
      <div className="flex w-full justify-center pt-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/genesis_logo.png"
          alt="Genesis Group"
          className="h-[84px] w-auto object-contain"
        />
      </div>

      {/* Center Section: Full Cake Emblem + Vertical Divider + Untruncated Birthday Calligraphy + Message */}
      <div className="my-auto flex items-center justify-center gap-8 px-8">
        {/* Full Untruncated Gold Cake Icon */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/gold_cake.png"
          alt="Birthday Cake"
          className="h-[175px] w-auto object-contain drop-shadow-sm shrink-0"
        />

        {/* Thin Gold Vertical Divider */}
        <div className="h-[185px] w-[2px] bg-[#C59B4E] rounded-full shrink-0" />

        {/* Right Calligraphy & Message Block */}
        <div className="flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/happy_birthday_gold.png"
            alt="Happy Birthday"
            className="w-[440px] h-auto object-contain"
          />
          <p className="mt-5 max-w-[480px] text-center font-display font-bold text-[14.5px] leading-[1.65] text-slate-900">
            {message}
          </p>
        </div>
      </div>

      {/* Bottom Center: Main Title & Tag */}
      <div className="flex flex-col items-center pb-4">
        <h2 className="font-display text-[38px] font-black uppercase tracking-[0.03em] text-slate-900 text-center leading-none">
          {title}
        </h2>
        {monthTag ? (
          <p className="mt-2 font-handwriting text-2xl font-bold text-slate-600 tracking-wide">
            {monthTag}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function GridPage({
  celebrants,
  tag,
  onCelebrantClick,
}: {
  celebrants: Celebrant[];
  tag: string;
  onCelebrantClick?: (celebrant: Celebrant) => void;
}) {
  const rows = chunk(celebrants, 5);

  return (
    <div
      className="flyer-page relative flex flex-col justify-between overflow-hidden bg-[#FAF6F0] px-14 py-8 shadow-xl"
      style={{
        backgroundImage: "url('/assets/grid_bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Top Right: Black Glitter Balloon Accent */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/balloon_black_page2.png"
        alt="Black Balloon"
        className="pointer-events-none absolute right-0 top-0 w-[140px] h-auto object-contain drop-shadow z-10"
      />

      {/* Header: Month Tag / Hashtag in stylish handwriting script */}
      <div className="h-9 flex items-center">
        {tag ? (
          <span className="font-handwriting text-3xl font-bold tracking-wide text-slate-800 pl-2">
            {tag}
          </span>
        ) : null}
      </div>

      {/* Celebrants Grid: 2 rows of 5 cards */}
      <div className="my-auto flex flex-1 flex-col justify-center gap-7">
        {rows.map((row, i) => (
          <div key={i} className="flex w-full items-start justify-between">
            {row.map((c) => (
              <CelebrantCard
                key={c._id as string}
                celebrant={c}
                onPhotoClick={onCelebrantClick}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Footer: Festive Cake Doodle + Green Baseline Accent + Genesis Logo */}
      <div className="relative mt-auto flex h-20 items-end justify-between pt-2">
        {/* Festive Cake Doodle */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/festive_cake_sketch.png"
          alt="Celebration"
          className="pointer-events-none absolute -left-4 -bottom-3 h-[100px] w-auto object-contain z-10"
        />

        {/* Green Horizontal Accent Line extending across to the logo */}
        <div className="absolute left-[72px] right-[275px] bottom-[26px] h-[3px] rounded-full bg-[#1E824C]" />

        {/* Right Genesis Group Logo */}
        <div className="ml-auto z-10 flex items-center pb-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/genesis_logo.png"
            alt="Genesis Group"
            className="h-[58px] w-auto object-contain"
          />
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
  onCelebrantClick,
  scale,
}: {
  title: string;
  monthTag: string;
  message: string;
  celebrants: Celebrant[];
  onCelebrantClick?: (celebrant: Celebrant) => void;
  scale?: number;
}) {
  const sorted = [...celebrants].sort((a, b) => a.birthDay - b.birthDay);
  const pages = chunk(sorted, PER_PAGE);

  const wrapPage = (node: React.ReactNode, key: string | number) => {
    if (!scale || scale === 1) {
      return <div key={key}>{node}</div>;
    }

    return (
      <div
        key={key}
        className="flyer-page-frame relative mx-auto mb-8 shadow-2xl rounded-2xl overflow-hidden bg-[#FAF6F0] border border-stone-300/60 transition-all"
        style={{
          width: `${Math.round(1300 * scale)}px`,
          height: `${Math.round(930 * scale)}px`,
        }}
      >
        <div
          style={{
            width: "1300px",
            height: "930px",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {node}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center w-full">
      {wrapPage(<CoverPage title={title} monthTag={monthTag} message={message} />, "cover")}
      {pages.map((page, i) =>
        wrapPage(
          <GridPage
            celebrants={page}
            tag={monthTag}
            onCelebrantClick={onCelebrantClick}
          />,
          i
        )
      )}
    </div>
  );
}
