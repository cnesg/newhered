-- ARTREND 데이터 스키마
-- Signal 테이블 하나로 4축(시장/제도/담론/관심)을 모두 받는다.
-- 이유: 낙찰가든 전시 이력이든 유튜브 조회수든 결국
-- "이 시점에 이 작가에게 이런 일이 있었다"는 같은 모양의 사실이다.
-- 소스별로 테이블을 나누면 축이 늘 때마다 스키마와 쿼리를 다시 짜야 한다.

create extension if not exists "pgcrypto";

-- ── 작가 ──────────────────────────────────────────
create table artists (
  id            uuid primary key default gen_random_uuid(),
  name_ko       text,
  name_en       text,
  nationality   text,               -- ISO 국가코드. "국적"과 "활동 장소"를 분리하기 위한 핵심 필드
  birth_year    int,
  tier          text default 'unrated'
                  check (tier in ('unrated','rookie','rising','established')),
  tier_locked   boolean default false,  -- true면 자동 재계산에서 제외(수동 고정)
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create unique index artists_name_uniq
  on artists (coalesce(name_ko,''), coalesce(name_en,''));

-- ── 장소 (미술관·갤러리·페어) ─────────────────────
create table venues (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  city          text,
  country       text,               -- ISO 국가코드
  venue_type    text check (venue_type in
                  ('museum','gallery_major','gallery_mid','gallery_alt',
                   'fair','biennale','residency','auction_house')),
  -- 제도점수 가중치. 기관 급에 따라 수동 큐레이션한다.
  weight        numeric default 1,
  created_at    timestamptz default now()
);

-- ── 전시 ──────────────────────────────────────────
create table exhibitions (
  id            uuid primary key default gen_random_uuid(),
  title         text,
  venue_id      uuid references venues(id),
  starts_on     date,
  ends_on       date,
  exhibit_type  text check (exhibit_type in
                  ('solo','group','biennale','fair','graduation')),
  source        text,               -- 어느 피드/API에서 왔는지
  source_url    text,
  created_at    timestamptz default now()
);

create table exhibition_artists (
  exhibition_id uuid references exhibitions(id) on delete cascade,
  artist_id     uuid references artists(id) on delete cascade,
  primary key (exhibition_id, artist_id)
);

-- ── Signal: 4축 이벤트를 전부 여기로 ──────────────
create table signals (
  id            uuid primary key default gen_random_uuid(),
  artist_id     uuid references artists(id) on delete cascade,
  axis          text not null check (axis in
                  ('market','institution','discourse','attention')),
  occurred_on   date not null,
  source        text not null,      -- 예: "k-artmarket", "youtube", "naver-datalab"
  value         numeric,            -- 정규화 전 원값 (낙찰가, 조회수, 언급 수 등)
  weight        numeric default 1,  -- 기관 가중치 등을 반영한 후 값
  url           text,
  note          text,
  created_at    timestamptz default now()
);

create index signals_artist_axis_idx on signals (artist_id, axis, occurred_on desc);
create index signals_occurred_idx on signals (occurred_on desc);

-- ── 일별 스냅샷 (계산된 4축 점수 + 티어) ──────────
-- 매일 배치가 signals를 집계해 이 테이블에 하루 한 행씩 쌓는다.
-- 프론트는 여기만 읽는다. signals를 매번 집계하면 느리다.
create table artist_daily_scores (
  artist_id     uuid references artists(id) on delete cascade,
  as_of         date not null,
  market        numeric default 0,
  institution   numeric default 0,
  discourse     numeric default 0,
  attention     numeric default 0,
  tier          text,
  primary key (artist_id, as_of)
);

create index scores_as_of_idx on artist_daily_scores (as_of desc);

-- ── RLS: 읽기는 공개, 쓰기는 서비스 롤만 ──────────
alter table artists enable row level security;
alter table venues enable row level security;
alter table exhibitions enable row level security;
alter table exhibition_artists enable row level security;
alter table signals enable row level security;
alter table artist_daily_scores enable row level security;

create policy "public read artists" on artists for select using (true);
create policy "public read venues" on venues for select using (true);
create policy "public read exhibitions" on exhibitions for select using (true);
create policy "public read exhibition_artists" on exhibition_artists for select using (true);
create policy "public read signals" on signals for select using (true);
create policy "public read scores" on artist_daily_scores for select using (true);

-- insert/update/delete는 정책을 만들지 않는다.
-- service_role 키는 RLS를 우회하므로 서버(cron)에서만 그 키를 쓴다.
