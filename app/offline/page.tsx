export const metadata = {
  title: "연결 없음 — ARTREND",
};

export default function Offline() {
  return (
    <main
      className="shell"
      style={{
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        maxWidth: 420,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 21,
          marginBottom: 10,
        }}
      >
        ART<em style={{ color: "var(--ink-60)" }}>rend</em>
      </span>
      <h1 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 8px" }}>
        지금은 오프라인입니다
      </h1>
      <p style={{ fontSize: 14, color: "var(--ink-60)", margin: 0 }}>
        마지막으로 열어본 화면은 계속 볼 수 있습니다. 새 소식은 연결이 돌아오면
        바로 불러옵니다.
      </p>
    </main>
  );
}
