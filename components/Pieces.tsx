"use client";

import { AXES, AxisKey, Artist } from "@/lib/data";

export function AxisBars({
  scores,
  sortBy,
}: {
  scores: Record<AxisKey, number>;
  sortBy: AxisKey | null;
}) {
  const max = Math.max(...AXES.map((a) => scores[a.key]));
  return (
    <div className="bars" aria-hidden="true">
      {AXES.map((a) => {
        const v = scores[a.key];
        const lead = sortBy ? a.key === sortBy : v >= max * 0.8;
        return (
          <span
            key={a.key}
            className={lead ? "bar lead" : "bar"}
            style={{ height: `${Math.max(2, Math.round((v / 100) * 16))}px` }}
          />
        );
      })}
    </div>
  );
}

export function ArtistRow({
  artist,
  sortBy,
}: {
  artist: Artist;
  sortBy: AxisKey | null;
}) {
  const readout = AXES.map((a) => `${a.label} ${artist.scores[a.key]}`).join(
    ", "
  );
  return (
    <button className="artistRow" type="button">
      <span className="thumb" aria-hidden="true">
        {artist.name.slice(-1)}
      </span>
      <span className="artistMeta">
        <span className="artistName">{artist.name}</span>
        <span className="artistSub">{artist.sub}</span>
        <AxisBars scores={artist.scores} sortBy={sortBy} />
        <span className="srOnly">{readout}</span>
      </span>
    </button>
  );
}
