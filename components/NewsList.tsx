"use client";

import { useEffect, useState } from "react";
import type { Scope } from "@/lib/data";
import type { Article } from "@/lib/rss";
import { COUNTRY_LABELS } from "@/lib/geo";

function ago(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.round(hr / 24);
  if (day === 1) return "어제";
  if (day < 7) return `${day}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR", {
    month: "numeric",
    day: "numeric",
  });
}

type State =
  | { kind: "loading" }
  | { kind: "ready"; articles: Article[] }
  | { kind: "empty" };

export default function NewsList({ scope }: { scope: Scope }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [country, setCountry] = useState("전체");

  useEffect(() => {
    let alive = true;
    setState({ kind: "loading" });
    setCountry("전체");

    fetch(`/api/news?scope=${scope}`)
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        const articles: Article[] = data.articles ?? [];
        setState(
          articles.length ? { kind: "ready", articles } : { kind: "empty" }
        );
      })
      .catch(() => {
        if (alive) setState({ kind: "empty" });
      });

    return () => {
      alive = false;
    };
  }, [scope]);

  if (state.kind === "loading") {
    return (
      <div aria-busy="true" aria-live="polite">
        <span className="srOnly">뉴스를 불러오는 중입니다</span>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="newsItem" aria-hidden="true">
            <span className="skeleton" style={{ width: "94%" }} />
            <span className="skeleton" style={{ width: "38%", height: 10 }} />
          </div>
        ))}
      </div>
    );
  }

  if (state.kind === "empty") {
    return (
      <p className="newsEmpty">
        지금은 기사를 불러올 수 없습니다. 잠시 뒤 다시 열어보세요.
      </p>
    );
  }

  // 국내 스코프는 국가 구분이 필요 없다. 해외만 기사에 실제로 태깅된
  // country 코드를 모아 필터 칩을 만든다 — 없는 나라는 칩 자체가 안 생긴다.
  const codesPresent =
    scope === "intl"
      ? Array.from(new Set(state.articles.map((a) => a.country).filter(Boolean))) as string[]
      : [];

  const filtered =
    country === "전체"
      ? state.articles
      : state.articles.filter((a) => a.country === country);

  return (
    <div aria-live="polite">
      {codesPresent.length > 1 && (
        <div className="newsCountryRow" role="group" aria-label="국가 필터">
          <button
            type="button"
            className="newsCountryChip"
            aria-pressed={country === "전체"}
            onClick={() => setCountry("전체")}
          >
            전체
          </button>
          {codesPresent.map((c) => (
            <button
              key={c}
              type="button"
              className="newsCountryChip"
              aria-pressed={country === c}
              onClick={() => setCountry(c)}
            >
              {COUNTRY_LABELS[c] ?? c}
            </button>
          ))}
        </div>
      )}

      {filtered.slice(0, 6).map((a) => (
        <a
          key={a.url}
          className="newsItem"
          href={a.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="newsTitle">{a.title}</span>
          {a.summary && <span className="newsSummary">{a.summary}</span>}
          <span className="newsMeta">
            {a.source}
            {a.published && ` · ${ago(a.published)}`}
            {a.country && COUNTRY_LABELS[a.country] && a.country !== "XX"
              ? ` · ${COUNTRY_LABELS[a.country]}`
              : ""}
          </span>
        </a>
      ))}
      {filtered.length === 0 && (
        <p className="newsEmpty">이 나라의 기사가 지금은 없습니다.</p>
      )}
    </div>
  );
}
