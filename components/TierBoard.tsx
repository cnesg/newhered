"use client";

import { useEffect, useState } from "react";
import { AXES, TIERS, type Artist, type AxisKey } from "@/lib/data";
import { ArtistRow } from "@/components/Pieces";

type State =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "ready"; established: Artist[]; rising: Artist[]; rookie: Artist[] };

export default function TierBoard() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [sortBy, setSortBy] = useState<AxisKey | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/tiers")
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        if (!data.hasData) return setState({ kind: "empty" });
        setState({
          kind: "ready",
          established: data.established ?? [],
          rising: data.rising ?? [],
          rookie: data.rookie ?? [],
        });
      })
      .catch(() => alive && setState({ kind: "empty" }));
    return () => {
      alive = false;
    };
  }, []);

  const byTier = (key: "established" | "rising" | "rookie"): Artist[] =>
    state.kind === "ready" ? [...state[key]].sort((a, b) =>
      sortBy ? b.scores[sortBy] - a.scores[sortBy] : 0
    ) : [];

  return (
    <>
      <div className="axisLegend" role="group" aria-label="정렬 축">
        <strong>축</strong>
        {AXES.map((a) => (
          <button
            key={a.key}
            type="button"
            className="axisPick"
            aria-pressed={sortBy === a.key}
            disabled={a.key === "market" || a.key === "institution"}
            onClick={() => setSortBy(sortBy === a.key ? null : a.key)}
            title={
              a.key === "market" || a.key === "institution"
                ? "아직 수집하지 않는 축입니다"
                : undefined
            }
          >
            {a.label}
          </button>
        ))}
        <span className="trailing">
          {sortBy
            ? `${AXES.find((a) => a.key === sortBy)?.label} 축 기준 정렬`
            : "언급량(담론·관심) 기준 · 시장·제도 축은 아직 미수집"}
        </span>
      </div>

      {state.kind === "loading" && (
        <div className="tierGrid" style={{ marginTop: 16 }} aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="tier" aria-hidden="true">
              <span className="skeleton" style={{ width: "40%" }} />
              <span className="skeleton" style={{ width: "90%", marginTop: 12 }} />
              <span className="skeleton" style={{ width: "70%" }} />
            </div>
          ))}
        </div>
      )}

      {state.kind === "empty" && (
        <div className="tierEmpty">
          <p>
            아직 쌓인 언급 데이터가 없습니다. 매일 오전 7시 자동 갱신 후 하루이틀
            지나면 이 자리에 실제 트렌딩 작가가 나타납니다.
          </p>
        </div>
      )}

      {state.kind === "ready" && (
        <div className="tierGrid" style={{ marginTop: 16 }}>
          {TIERS.map((t) => {
            const artists = byTier(t.key);
            return (
              <div key={t.key} className={t.key === "rising" ? "tier featured" : "tier"}>
                <div className="tierHead">
                  <span className="tierName">{t.label}</span>
                </div>
                <p className="tierDesc">{t.desc}</p>
                <div className="artistList">
                  {artists.map((a) => (
                    <ArtistRow key={a.id} artist={a} sortBy={sortBy} />
                  ))}
                  {artists.length === 0 && (
                    <p className="tierColumnEmpty">아직 해당 없음</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
