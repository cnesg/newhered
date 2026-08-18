"use client";

import { useEffect, useState } from "react";
import { supabaseAnon } from "@/lib/supabase";

type Venue = { id: string; name: string; city: string | null; country: string | null };
type RecentRow = {
  id: string;
  title: string;
  starts_on: string | null;
  ends_on: string | null;
  venues: { name: string } | null;
  exhibition_artists: { artists: { name_ko: string | null } }[];
};

const EXHIBIT_TYPES = [
  { value: "solo", label: "개인전" },
  { value: "group", label: "그룹전" },
  { value: "biennale", label: "비엔날레" },
  { value: "fair", label: "페어" },
  { value: "graduation", label: "졸업전시" },
];

export default function AdminExhibitions() {
  const [adminKey, setAdminKey] = useState("");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [recent, setRecent] = useState<RecentRow[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const [form, setForm] = useState({
    artistNameKo: "",
    artistNameEn: "",
    nationality: "KR",
    exhibitionTitle: "",
    venueId: "",
    startsOn: "",
    endsOn: "",
    exhibitType: "solo",
  });

  useEffect(() => {
    const saved = window.localStorage.getItem("artrend_admin_key");
    if (saved) setAdminKey(saved);

    const client = supabaseAnon();
    if (!client) return;

    client
      .from("venues")
      .select("id,name,city,country")
      .order("name")
      .then(({ data }) => setVenues(data ?? []));

    loadRecent(client);
  }, []);

  async function loadRecent(client: NonNullable<ReturnType<typeof supabaseAnon>>) {
    const { data } = await client
      .from("exhibitions")
      .select(
        "id,title,starts_on,ends_on,venues(name),exhibition_artists(artists(name_ko))"
      )
      .order("created_at", { ascending: false })
      .limit(8);
    setRecent((data as unknown as RecentRow[]) ?? []);
  }

  function saveKey(v: string) {
    setAdminKey(v);
    window.localStorage.setItem("artrend_admin_key", v);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg("");

    try {
      const res = await fetch("/api/admin/exhibitions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ adminKey, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");

      setStatus("ok");
      setForm((f) => ({
        ...f,
        artistNameKo: "",
        artistNameEn: "",
        exhibitionTitle: "",
        startsOn: "",
        endsOn: "",
      }));
      const client = supabaseAnon();
      if (client) loadRecent(client);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "알 수 없는 오류");
    }
  }

  const field = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => setForm((f) => ({ ...f, [k]: e.target.value })),
  });

  return (
    <main className="adminShell">
      <h1 className="adminTitle">전시 입력</h1>
      <p className="adminNote">
        작가명과 전시 정보를 입력하면 자동으로 저장된다. 같은 작가명이 이미
        있으면 새로 만들지 않고 기존 작가에 전시를 연결한다.
      </p>

      <label className="adminField">
        <span>관리자 키</span>
        <input
          type="password"
          value={adminKey}
          onChange={(e) => saveKey(e.target.value)}
          placeholder="ADMIN_SECRET 값"
        />
      </label>

      <form onSubmit={submit} className="adminForm">
        <div className="adminGrid">
          <label className="adminField">
            <span>작가명 (국문) *</span>
            <input {...field("artistNameKo")} required placeholder="예: 김민정" />
          </label>
          <label className="adminField">
            <span>작가명 (영문)</span>
            <input {...field("artistNameEn")} placeholder="예: Kim Minjung" />
          </label>
          <label className="adminField">
            <span>국적</span>
            <select {...field("nationality")}>
              <option value="KR">한국</option>
              <option value="US">미국</option>
              <option value="GB">영국</option>
              <option value="FR">프랑스</option>
              <option value="DE">독일</option>
              <option value="JP">일본</option>
              <option value="CN">중국</option>
              <option value="">기타/모름</option>
            </select>
          </label>
          <label className="adminField">
            <span>전시 유형</span>
            <select {...field("exhibitType")}>
              {EXHIBIT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="adminField">
          <span>전시명 *</span>
          <input {...field("exhibitionTitle")} required placeholder="예: 어떤 풍경" />
        </label>

        <label className="adminField">
          <span>장소 *</span>
          <select {...field("venueId")} required>
            <option value="">선택</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
                {v.city ? ` · ${v.city}` : ""}
              </option>
            ))}
          </select>
        </label>

        <div className="adminGrid">
          <label className="adminField">
            <span>시작일</span>
            <input type="date" {...field("startsOn")} />
          </label>
          <label className="adminField">
            <span>종료일</span>
            <input type="date" {...field("endsOn")} />
          </label>
        </div>

        <button type="submit" disabled={status === "saving"} className="adminSubmit">
          {status === "saving" ? "저장 중…" : "저장"}
        </button>

        {status === "ok" && <p className="adminOk">저장됐습니다.</p>}
        {status === "error" && <p className="adminError">{errorMsg}</p>}
      </form>

      <h2 className="adminSubtitle">최근 입력한 전시</h2>
      <ul className="adminRecent">
        {recent.map((r) => (
          <li key={r.id}>
            <strong>{r.title}</strong>
            <span>
              {r.exhibition_artists.map((ea) => ea.artists?.name_ko).filter(Boolean).join(", ")}
              {r.venues?.name ? ` · ${r.venues.name}` : ""}
              {r.starts_on ? ` · ${r.starts_on}` : ""}
            </span>
          </li>
        ))}
        {recent.length === 0 && <li className="adminEmpty">아직 입력된 전시가 없습니다.</li>}
      </ul>
    </main>
  );
}
