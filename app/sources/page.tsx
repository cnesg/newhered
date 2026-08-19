import { FEEDS } from "@/lib/feeds";
import { CHANNELS } from "@/lib/youtube";
import Link from "next/link";

export const metadata = { title: "연결된 소스 — ARTREND" };

function outletHome(feedUrl: string): string {
  try {
    const u = new URL(feedUrl);
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return feedUrl;
  }
}

export default function SourcesPage() {
  const newsKr = FEEDS.filter((f) => f.scope === "kr");
  const newsIntl = FEEDS.filter((f) => f.scope === "intl");
  const ytKr = CHANNELS.filter((c) => c.scope === "kr");
  const ytIntl = CHANNELS.filter((c) => c.scope === "intl");

  return (
    <main className="shell" style={{ paddingTop: 32 }}>
      <Link href="/" className="backLink">
        ← 트렌드로
      </Link>
      <h1 className="sourcesTitle">연결된 소스</h1>
      <p className="sourcesNote">
        지금 이 화면의 뉴스·영상은 아래 목록에서만 수집된다. 총 {FEEDS.length}개
        뉴스 매체, {CHANNELS.length}개 유튜브 채널. 매일 오전 7시 전부 다시 갱신된다.
      </p>

      <section className="sourcesSection">
        <h2>뉴스 · 국내 ({newsKr.length})</h2>
        <ul className="sourcesList">
          {newsKr.map((f) => (
            <li key={f.source}>
              <a href={outletHome(f.url)} target="_blank" rel="noopener noreferrer">
                {f.source}
              </a>
              {!f.filter && <span className="sourceTag">전문지 · 전체 수집</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className="sourcesSection">
        <h2>뉴스 · 해외 ({newsIntl.length})</h2>
        <ul className="sourcesList">
          {newsIntl.map((f) => (
            <li key={f.source}>
              <a href={outletHome(f.url)} target="_blank" rel="noopener noreferrer">
                {f.source}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="sourcesSection">
        <h2>YouTube · 국내 ({ytKr.length})</h2>
        <ul className="sourcesList">
          {ytKr.map((c) => (
            <li key={c.id}>
              <a
                href={`https://www.youtube.com/channel/${c.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {c.name}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="sourcesSection">
        <h2>YouTube · 해외 ({ytIntl.length})</h2>
        <ul className="sourcesList">
          {ytIntl.map((c) => (
            <li key={c.id}>
              <a
                href={`https://www.youtube.com/channel/${c.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {c.name}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <p className="sourcesFooter">
        추가하고 싶은 매체나 채널이 있으면 이름이나 URL을 알려주면 확인 후 이 목록에
        바로 반영된다.
      </p>
    </main>
  );
}
