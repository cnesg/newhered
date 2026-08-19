"use client";

import { useEffect, useState } from "react";
import { DATA, Scope } from "@/lib/data";
import NewsList from "@/components/NewsList";
import VideoGrid from "@/components/VideoGrid";
import TierBoard from "@/components/TierBoard";
import { editionLabel } from "@/lib/edition";

const NAV = ["트렌드", "작가", "전시", "시장", "캘린더"];

export default function Home() {
  const [scope, setScope] = useState<Scope>("kr");
  const [region, setRegion] = useState("전체");
  const [tab, setTab] = useState("트렌드");
  const [edition, setEdition] = useState("");

  useEffect(() => {
    setEdition(editionLabel());
  }, []);

  const d = DATA[scope];

  function switchScope(next: Scope) {
    setScope(next);
    setRegion("전체");
  }

  return (
    <>
      <header className="topbar">
        <div className="topbarInner">
          <span className="wordmark">
            ART<em>rend</em>
          </span>
          <nav className="nav" aria-label="주요 메뉴">
            {NAV.map((n) => (
              <button
                key={n}
                type="button"
                className={tab === n ? "active" : undefined}
                aria-current={tab === n ? "page" : undefined}
                onClick={() => setTab(n)}
              >
                {n}
              </button>
            ))}
          </nav>
          <div className="scope" role="group" aria-label="지역 범위">
            <button
              type="button"
              aria-pressed={scope === "kr"}
              onClick={() => switchScope("kr")}
            >
              국내
            </button>
            <button
              type="button"
              aria-pressed={scope === "intl"}
              onClick={() => switchScope("intl")}
            >
              해외
            </button>
          </div>
        </div>
      </header>

      <main className="shell">
        <div className="chipRow" role="group" aria-label="세부 지역">
          <span className="chipLabel">지역</span>
          {d.regions.map((r) => (
            <button
              key={r}
              type="button"
              className="chip"
              aria-pressed={region === r}
              onClick={() => setRegion(r)}
            >
              {r}
            </button>
          ))}
        </div>

        {edition && (
          <p className="edition">
            <span className="editionDot" aria-hidden="true" />
            {edition} · 매일 오전 7시에 새로 채워집니다
          </p>
        )}

        <section className="section" aria-labelledby="kw">
          <div className="sectionHead">
            <h2 className="sectionTitle" id="kw">
              이번 주 키워드
            </h2>
            <span className="sectionNote">담론 언급 × 검색량 교차 추출</span>
          </div>
          <div className="keywords">
            {d.keywords.map((k) => (
              <button key={k.term} type="button" className="keyword">
                {k.term}
                <span className="keywordDelta">{k.delta}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="section" aria-labelledby="tiers">
          <div className="sectionHead">
            <h2 className="sectionTitle" id="tiers">
              작가 동향
            </h2>
            <span className="sectionNote">
              최근 7일 언급 기준 · 국내/해외 구분 전 통합 목록
            </span>
          </div>

          <TierBoard />
        </section>

        <section className="section" aria-labelledby="abroad">
          <div className="sectionHead">
            <h2 className="sectionTitle" id="abroad">
              {d.abroadTitle}
            </h2>
            <span className="sectionNote">{d.abroadNote}</span>
            <span className="sectionMore">더보기 →</span>
          </div>
          <div className="abroadGrid">
            {d.abroad.map((a) => (
              <button key={a.name + a.city} type="button" className="abroadCard">
                <span className="abroadImg">
                  <span className="abroadCity">{a.city}</span>
                </span>
                <span className="abroadBody">
                  <span className="abroadName">{a.name}</span>
                  <br />
                  <span className="abroadVenue">{a.venue}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="section" aria-labelledby="media">
          <h2 className="srOnly" id="media">
            영상과 뉴스
          </h2>
          <div className="mediaGrid">
            <div>
              <div className="sectionHead">
                <h3 className="sectionTitle">영상</h3>
                <span className="sectionNote">YouTube</span>
              </div>
              <VideoGrid scope={scope} />
            </div>
            <div>
              <div className="sectionHead">
                <h3 className="sectionTitle">뉴스</h3>
                <span className="sectionNote">
                  {scope === "kr" ? "국내 매체 RSS" : "해외 매체 RSS"}
                </span>
              </div>
              <NewsList scope={scope} />
            </div>
          </div>
        </section>

        <footer className="footer">
          뉴스는 각 매체 RSS에서 제목과 링크만 가져옵니다. 본문은 원문에서
          읽어 주세요. 작가와 키워드는 아직 구조 확인용 예시 데이터입니다.
          <br />
          작품 이미지는 저작권 확인 후에만 게재합니다.
        </footer>
      </main>
    </>
  );
}
