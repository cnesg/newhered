# ARTREND

국내외 미술 동향을 시장 · 제도 · 담론 · 관심 네 축으로 정리해 보여주는 대시보드의 프론트엔드 프로토타입.

현재는 목업 데이터로 화면 구조만 검증하는 단계이며, 순위와 점수는 의미를 갖지 않는다.

## 실행

```bash
npm install
npm run dev
```

http://localhost:3000

## 배포 (Vercel)

1. 이 폴더를 GitHub 저장소로 push
2. vercel.com → Add New → Project → 저장소 선택
3. 프레임워크는 Next.js로 자동 감지된다. 설정 변경 없이 Deploy

이후 `main` 브랜치에 push할 때마다 자동 배포된다.

## PWA

홈 화면에 추가하면 주소창 없이 앱처럼 실행된다. `public/manifest.json`이 이름과 아이콘을,
`public/sw.js`가 캐싱과 오프라인 화면을 담당한다.

서비스워커는 **프로덕션 빌드에서만 등록된다.** `npm run dev`에서는 동작하지 않으므로
로컬 확인은 `npm run build && npm run start`로 한다.

캐시 내용을 바꿨을 때는 `public/sw.js`의 `VERSION` 문자열을 올려야 기존 방문자에게 반영된다.

## 뉴스 연결

`lib/feeds.ts`의 목록을 `/api/news`가 읽어 15분 캐시로 내려준다. 피드를 추가하려면
이 파일에 항목 하나만 더 쓰면 된다.

```ts
{ source: "매체명", url: "https://…/feed", scope: "kr", filter: true }
```

`filter: true`는 종합 문화면 피드에 쓴다. `ART_TERMS`에 걸리는 기사만 통과시키고
`BLOCK_TERMS`에 걸리면 버린다. 미술 전문 매체는 `filter: false`로 둔다.

현재 국내 5곳, 해외 11곳이 연결되어 있다. 미술 전문 매체는 `filter: false`로 전부 통과시키고,
종합 문화면은 `filter: true`로 미술 기사만 추출한다.

한 매체가 목록을 독점하지 않도록 **매체당 3건 상한**을 둔다. 상한은 `lib/rss.ts`의
`diversify`에서 조절한다.

피드가 죽어도 나머지는 그대로 나온다. 전부 실패하면 빈 상태 문구를 보여준다.

RSS는 예고 없이 주소가 바뀌거나 차단되므로, 화면에 기사가 줄면 이 파일부터 확인한다.

## 매일 오전 7시 갱신

`vercel.json`의 크론이 매일 **22:00 UTC = 07:00 KST**에 `/api/refresh`를 호출하고,
그 시점에 피드 캐시가 비워진다. 그 전까지는 몇 명이 방문하든 같은 기사를 본다.

화면 상단에 "8월 14일 오전 7시 판"이 표시되어, 지금 보는 내용이 언제 기준인지 알 수 있다.

### 배포 전 한 가지 설정

Vercel 프로젝트 → Settings → Environment Variables 에서 `CRON_SECRET`을 추가한다.
값은 아무 긴 무작위 문자열이면 된다. Vercel이 크론 요청에 이 값을 자동으로 실어 보내므로,
외부에서 `/api/refresh`를 함부로 호출하는 것을 막아준다.

설정하지 않아도 동작은 하지만, 누구나 갱신을 유발할 수 있으니 넣어두는 편이 좋다.

### 시각을 바꾸려면

`vercel.json`의 `schedule`은 UTC 기준이다. KST에서 9시간을 빼면 된다.

| 원하는 KST | schedule |
| --- | --- |
| 06:00 | `0 21 * * *` |
| 07:00 | `0 22 * * *` |
| 08:00 | `0 23 * * *` |
| 09:00 | `0 0 * * *` |

바꿀 때는 `lib/edition.ts`의 `CUTOFF_HOUR`도 같은 시각으로 맞춰야 표시가 어긋나지 않는다.

Vercel 무료 플랜에서 크론은 하루 한 번까지이고, 지정 시각에서 최대 한 시간 늦게 실행될 수 있다.
정시 실행이 필요하면 유료 플랜으로 올려야 한다.

## YouTube 연결

키가 없으면 영상 영역만 안내 문구로 바뀌고 나머지 화면은 그대로 동작한다.
키를 잘못 넣어도 마찬가지다. 급하지 않으면 나중에 넣어도 된다.

### 키 발급

1. console.cloud.google.com 접속, 프로젝트 하나 생성
2. API 및 서비스 -> 라이브러리 -> **YouTube Data API v3** 검색 후 사용 설정
3. 사용자 인증 정보 -> 사용자 인증 정보 만들기 -> **API 키**
4. 만들어진 키의 애플리케이션 제한사항은 **없음**, API 제한사항은 **YouTube Data API v3**로 지정

키는 서버에서만 쓰이므로 브라우저에 노출되지 않는다.

### 등록

Vercel -> Settings -> Environment Variables 에 `YOUTUBE_API_KEY`로 추가한 뒤 재배포한다.
로컬은 `.env.example`을 `.env.local`로 복사해 값을 채운다.

### 채널 추가

현재 국내 11곳, 해외 10곳이 연결되어 있다. 대중 해설, 미술관, 페어·비엔날레, 경매사를
고루 섞어 한쪽 성격에 치우치지 않게 했다.

`lib/youtube.ts`의 `CHANNELS`에 채널 ID를 넣는다.

```ts
{ id: "UC로 시작하는 채널 ID", name: "표시할 이름", scope: "kr" }
```

핸들(@이름) 대신 **채널 ID를 쓴다.** 한글 핸들은 URL 인코딩 문제가 생기고,
채널 ID는 `UC`를 `UU`로 바꾸면 업로드 재생목록 ID가 되어 조회 없이 바로 쓸 수 있다.

유튜브도 뉴스와 같이 채널당 상한을 둔다. 일반 영상 2건, 숏츠 3건이다.
채널에서 충분히 모이지 않으면 `QUERIES`의 키워드 검색으로 보충한다.

### 숏츠

숏츠와 일반 영상은 분리해 보여준다. 일반 영상은 16:9 격자, 숏츠는 9:16 가로 스크롤 줄이다.
세로 영상을 16:9 격자에 넣으면 잘리거나 여백이 생겨 화면이 무너진다.

YouTube API는 숏츠 여부를 직접 알려주지 않는다. `videos.list`로 길이를 조회해
`lib/youtube.ts`의 `SHORT_MAX_SECONDS`(기본 100초) 이하면 숏츠로 본다.
숏츠 상한이 3분이라 그보다 짧은 일반 영상이 섞일 수 있고, 반대로 100초를 넘는 숏츠는
일반 영상 쪽에 들어간다. 값을 조절해 취향에 맞추면 된다.

길이 조회는 50개당 1 유닛이라 할당량에 거의 영향이 없다.

숏츠를 아예 빼려면 `VideoGrid.tsx`에서 `state.shorts.length > 0` 블록을 지우면 된다.

### 할당량

기본 할당량은 하루 10,000 유닛이다. 채널 하나당 1 유닛, 길이 조회는 50개당 1 유닛,
키워드 검색만 100 유닛이다. 채널 21곳을 다 합쳐도 하루 250 유닛 정도라 여유가 크다.

## Supabase 연결

작가·전시 데이터를 쌓아두는 곳이다. 뉴스·영상과 달리 이 데이터는
"오늘 것만 보여주고 버리는" 게 아니라 매일 누적해야 티어(ESTABLISHED/RISING/ROOKIE)와
4축 점수가 계산된다.

### 프로젝트 만들기

1. supabase.com 접속, 회원가입
2. New project → 이름은 `artrend`, 리전은 **Northeast Asia (Seoul)** 선택, 비밀번호 설정
3. 생성 완료까지 1~2분 대기

### 스키마 적용

프로젝트 대시보드 → SQL Editor → New query. 아래 두 파일 내용을 순서대로 붙여넣고 실행한다.

1. `supabase/schema.sql` — 테이블, 인덱스, 접근권한(RLS)
2. `supabase/seed_venues.sql` — 기관 가중치 초기값 (국립현대미술관, 국제갤러리 등 40여 곳)

### 키 등록

Settings → API에서 세 값을 확인해 Vercel 환경변수에 등록한다.

| Supabase 화면의 이름 | Vercel 환경변수 이름 | 비고 |
| --- | --- | --- |
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` | |
| anon public | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 읽기 전용. 브라우저 노출 가능 |
| service_role | `SUPABASE_SERVICE_ROLE_KEY` | **절대 브라우저에 노출 금지.** 크론에서만 쓴다 |

로컬 확인은 `.env.example`을 `.env.local`로 복사해 값을 채운다.

### 연결 확인

배포 후 `/api/status`를 열어본다. `supabase_connection: "ok"`이면 연결된 것이다.
아직 테이블에 데이터가 없으므로 `artists_table_rows: 0`이 정상이다.

이 엔드포인트는 화면 어디에도 연결되어 있지 않다. 진단 전용이다.

### 데이터 모델

```
artists              작가. 국적(nationality)과 활동 장소(venues.country)를 분리해서
                      "한국 작가가 해외에서 뜨는 순간" 같은 교차 신호를 잡을 수 있게 한다
venues                미술관·갤러리·페어. weight가 제도점수의 재료
exhibitions           전시. venue_id, exhibit_type(solo/group/biennale/fair/graduation)
exhibition_artists    전시 ↔ 작가 다대다
signals               4축 이벤트를 전부 여기 한 테이블에 쌓는다
                      (axis: market/institution/discourse/attention)
artist_daily_scores   매일 배치가 signals를 집계해 남기는 스냅샷. 프론트는 이것만 읽는다
```

`signals`를 하나로 합친 이유: 낙찰가든 전시든 유튜브 조회수든 결국
"이 시점에 이 작가에게 이런 일이 있었다"는 같은 모양이다. 축마다 테이블을 나누면
축이 하나 늘 때마다 스키마와 쿼리를 다시 짜야 한다.

## 방향 전환: 전시 이력 → 언급 트렌드

처음엔 전시 이력(제도점수)으로 작가 티어를 계산하려 했다. 공공API 인증에서 계속
막히기도 했고, 더 근본적으로는 이게 원래 목표와 어긋났다 — 원했던 건 "전시 관리"가
아니라 "언급이 늘고 있는 작가·작품을 보는 트렌드 화면"이었다.

그래서 방향을 바꿨다. **뉴스·영상에서 작가 이름이 언급된 빈도**를 세는 쪽으로.

- `venues`/`exhibitions` 테이블과 `/admin/exhibitions` 화면은 스키마와 코드에 남아있지만
  현재 파이프라인에서 쓰지 않는다. 나중에 필요해지면 다시 쓸 수 있어 지우지 않았다.
- `lib/culture.ts`(공공API 수집 코드)도 마찬가지로 미사용 상태로 남겨둔다.

## 언급 추출 (Claude 기반)

이름이 사람 이름인지, 그중에서도 미술 작가인지 판별하는 건 정규식이나 고정 목록으로는
정확도가 낮다. 그래서 매일 수집된 뉴스·영상 텍스트를 Claude API로 보내 작가 이름만
뽑아낸다. 큐레이터·갤러리스트·컬렉터는 제외하도록 프롬프트에 명시했다.

### 설정

console.anthropic.com에서 API 키를 발급받아 Vercel에 `ANTHROPIC_API_KEY`로 등록한다.
하루 한 번, 텍스트 100여 건을 처리하는 정도라 비용은 미미하다(`claude-haiku-4-5` 사용).

### 동작 방식

`/api/refresh`가 매일 07:00 KST에 다음을 수행한다.

1. 뉴스·영상 캐시 갱신 (기존과 동일)
2. 오늘 수집된 뉴스 제목+요약, 영상 제목을 모아 Claude에 전달
3. 추출된 작가 이름을 `artists` 테이블에 upsert (이미 있으면 재사용)
4. 각 언급을 `signals` 테이블에 기록 — 뉴스는 `axis: discourse`, 영상은 `axis: attention`

추출이 실패해도(키 미설정, API 오류) 뉴스·영상 갱신 자체는 항상 성공한다 — 두 기능이
분리되어 있다.

### 트렌딩 확인

`/api/trending`에서 최근 7일 언급량과 그 전주 대비 증가율을 볼 수 있다.
데이터가 아직 없으면 빈 배열이 정상이다 — 크론이 하루 이상 돌아야 뭔가 쌓인다.

```json
{
  "trending": [
    { "nameKo": "김민정", "mentionsThisWeek": 4, "mentionsLastWeek": 1, "growth": 3 }
  ]
}
```

### 아직 안 된 것

이 데이터를 홈 화면(3티어 카드)에 실제로 연결하는 작업은 아직이다. 지금은
`lib/data.ts`의 목업 데이터가 그대로 화면에 나온다. 며칠 데이터가 쌓여 결과가 그럴듯해
보이면, 그때 `/api/trending`을 홈 화면에 연결하고 티어 구분 기준도 다시 정한다
(전시 이력 없이 순수 언급량만으로는 ESTABLISHED/RISING/ROOKIE 구분을 어떻게 할지
다시 생각해야 한다).

## 보안 업데이트 이력

**2026-08-14** — Next.js에서 CVSS 10.0짜리 심각한 원격코드실행 취약점(CVE-2025-66478,
React Server Components 관련)이 발견되어 15.5.23으로 올렸다. React도 19.1.7로 맞췄다.
이 사이에 12월·5월 두 차례 추가 보안 릴리스가 더 있었고, 이번에 전부 반영했다.

`npm audit`에 남는 항목(`sharp`, Next.js 16 요구)은 이미지 최적화 API 내부 의존성 문제다.
이 프로젝트는 `next/image`를 쓰지 않고 일반 `<img>` 태그만 쓰므로 그 코드 경로가
실행되지 않는다. Next 16으로의 이전은 breaking change라 지금 단계에서는 보류했다.

**앞으로 배포할 때마다** `npm install` 결과에 `deprecated` 경고나 `npm audit`에 high 이상이
뜨면 먼저 처리하고 배포한다. Next.js는 보안 릴리스를 사전 공지 없이 내놓기 때문에,
분기에 한 번 정도는 `npm outdated`로 확인하는 습관을 들이는 게 좋다.

## 구조

```
app/
  layout.tsx      메타데이터, 폰트, 전역 스타일
  page.tsx        홈 화면. 범위·지역·정렬 축 상태를 여기서 관리
  globals.css     디자인 토큰과 전체 스타일. 라이트/다크 모드 대응
components/
  Pieces.tsx      작가 행, 4축 막대
lib/
  data.ts         작가·키워드 목업 데이터
  feeds.ts        RSS 피드 목록과 미술 기사 판별 단어
  rss.ts          피드 수집, 파싱, 중복 제거, 정렬
  edition.ts      오전 7시 기준 판 계산
  youtube.ts      YouTube 채널·검색 수집
  supabase.ts     Supabase 클라이언트 (anon/service 분리)
  culture.ts      (미사용) 문화포털 API 수집 코드
  extract.ts      Claude로 텍스트에서 작가 이름 추출
  mentions.ts     뉴스·영상 수집 → 추출 → signals 저장 파이프라인
app/api/news/
  route.ts        /api/news?scope=kr|intl
app/api/videos/
  route.ts        /api/videos?scope=kr|intl
app/api/refresh/
  route.ts        크론이 호출하는 캐시 갱신 엔드포인트
app/api/status/
  route.ts        환경변수·Supabase 연결 진단
app/api/trending/
  route.ts        최근 7일 언급량 기준 트렌딩 조회
app/api/admin/exhibitions/
  route.ts        (미사용) 관리자 전시 저장 엔드포인트
app/admin/exhibitions/
  page.tsx        (미사용) 전시 수동 입력 폼
supabase/
  schema.sql      테이블 정의
  seed_venues.sql 기관 가중치 초기값
vercel.json       크론 스케줄
public/
  manifest.json   PWA 이름, 아이콘, 표시 방식
  sw.js           서비스워커. 캐싱과 오프라인 폴백
  icon-*.png      아이콘. 4축 막대 모티프
```

## 설계 원칙

- **합산 점수를 만들지 않는다.** 네 축을 각각 보여주고 사용자가 축을 골라 정렬한다. 하나로 합치면 이미 검증된 작가가 영구히 상단을 차지한다.
- **세 구간을 동등하게 노출한다.** ESTABLISHED / RISING / ROOKIE를 가로로 나란히 둔다. 신진을 하단에 두면 열람되지 않는다.
- **등락 색을 쓰지 않는다.** 가격 상승을 빨강으로 칠하는 순간 투기 도구가 된다.
- **작품 이미지는 저작권 확인 후에만 게재한다.** 초기 시각 요소는 영상 썸네일과 사용 허가된 보도자료 이미지로 구성한다.

## 다음 단계

- [x] 뉴스 RSS 연결
- [x] 매일 오전 7시 자동 갱신
- [x] YouTube Data API 연결
- [ ] 문화포털 API로 전시 데이터 연결
- [x] Supabase 스키마 설계
- [x] 언급 추출 파이프라인 (Claude 기반)
- [ ] `/api/trending`을 홈 화면에 연결
- [ ] 순수 언급량 기반 티어 구분 기준 재설계
- [ ] 경매사이트(케이옥션·서울옥션) 언급 소스 추가
- [ ] 작가 상세 페이지
- [ ] 푸시 알림 (관심 작가 신규 전시 알림)
