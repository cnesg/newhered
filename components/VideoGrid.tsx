"use client";

import { useEffect, useState } from "react";
import type { Scope } from "@/lib/data";
import type { Video } from "@/lib/youtube";

type State =
  | { kind: "loading" }
  | { kind: "ready"; videos: Video[]; shorts: Video[] }
  | { kind: "unset" }
  | { kind: "empty" };

function shortThumb(v: Video): string {
  // 세로 카드에는 여백 없는 크롭본이 어울린다
  return `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`;
}

function clock(seconds: number | null): string {
  if (seconds === null) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function VideoGrid({ scope }: { scope: Scope }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState("전체");
  const [sort, setSort] = useState<"latest" | "channel">("latest");

  useEffect(() => {
    let alive = true;
    setState({ kind: "loading" });
    setQuery("");
    setChannel("전체");

    fetch(`/api/videos?scope=${scope}`)
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        if (!data.configured) return setState({ kind: "unset" });
        const videos: Video[] = data.videos ?? [];
        const shorts: Video[] = data.shorts ?? [];
        setState(
          videos.length || shorts.length
            ? { kind: "ready", videos, shorts }
            : { kind: "empty" }
        );
      })
      .catch(() => alive && setState({ kind: "empty" }));

    return () => {
      alive = false;
    };
  }, [scope]);

  if (state.kind === "loading") {
    return (
      <div className="videoGrid" aria-busy="true">
        <span className="srOnly">영상을 불러오는 중입니다</span>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} aria-hidden="true">
            <span className="videoThumb skeletonBlock" />
            <span className="skeleton" style={{ width: "88%", marginTop: 7 }} />
            <span className="skeleton" style={{ width: "44%", height: 10 }} />
          </div>
        ))}
      </div>
    );
  }

  if (state.kind === "unset") {
    return (
      <p className="newsEmpty">
        YouTube 키를 등록하면 이 자리에 최신 영상이 들어옵니다. README의 설정
        항목을 참고하세요.
      </p>
    );
  }

  if (state.kind === "empty") {
    return <p className="newsEmpty">지금은 영상을 불러올 수 없습니다.</p>;
  }

  const allChannels = Array.from(
    new Set([...state.videos, ...state.shorts].map((v) => v.channel))
  ).sort();

  const q = query.trim().toLowerCase();
  const matches = (v: Video) =>
    (channel === "전체" || v.channel === channel) &&
    (q === "" || v.title.toLowerCase().includes(q) || v.channel.toLowerCase().includes(q));

  const sortFn = (a: Video, b: Video) =>
    sort === "channel"
      ? a.channel.localeCompare(b.channel)
      : (b.published ?? "").localeCompare(a.published ?? "");

  const videos = state.videos.filter(matches).sort(sortFn);
  const shorts = state.shorts.filter(matches).sort(sortFn);
  const noMatches = videos.length === 0 && shorts.length === 0;

  return (
    <>
      <div className="videoControls">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제목·채널 검색"
          className="videoSearch"
          aria-label="영상 검색"
        />
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="videoSelect"
          aria-label="채널 필터"
        >
          <option value="전체">전체 채널</option>
          {allChannels.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "latest" | "channel")}
          className="videoSelect"
          aria-label="정렬"
        >
          <option value="latest">최신순</option>
          <option value="channel">채널순</option>
        </select>
      </div>

      {noMatches && <p className="newsEmpty">일치하는 영상이 없습니다.</p>}

      {videos.length > 0 && (
        <div className="videoGrid">
          {videos.map((v) => (
            <a
              key={v.id}
              href={v.url}
              target="_blank"
              rel="noopener noreferrer"
              className="videoCard"
            >
              <span className="thumbWrap">
                <img
                  className="videoThumb"
                  src={v.thumbnail}
                  alt=""
                  loading="lazy"
                  width={320}
                  height={180}
                />
                {v.seconds !== null && (
                  <span className="duration">{clock(v.seconds)}</span>
                )}
              </span>
              <span className="videoTitle">{v.title}</span>
              <span className="videoMeta">{v.channel}</span>
            </a>
          ))}
        </div>
      )}

      {shorts.length > 0 && (
        <div className="shortsBlock">
          <div className="shortsHead">
            <span className="shortsLabel">숏츠</span>
            <span className="shortsNote">현장 스케치와 짧은 리뷰</span>
          </div>
          <ul className="shortsRail">
            {shorts.map((v) => (
              <li key={v.id}>
                <a
                  href={`https://www.youtube.com/shorts/${v.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shortCard"
                >
                  <img
                    className="shortThumb"
                    src={shortThumb(v)}
                    alt=""
                    loading="lazy"
                    width={180}
                    height={320}
                  />
                  <span className="shortTitle">{v.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
