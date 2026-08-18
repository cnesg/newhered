-- 제도점수의 뼈대가 되는 기관 가중치 초기값.
-- 나중에 언제든 venues 테이블에서 weight를 조정하면 된다.
-- 값 자체보다 "등급 간 배수"가 중요하다: established가 rookie를 항상 이기지 않도록
-- 최근성 계수를 곱해서 최종 제도점수를 낸다 (batch 스크립트에서 처리).

insert into venues (name, city, country, venue_type, weight) values
  -- 국내 · 미술관 (최상위)
  ('국립현대미술관', '서울/과천/청주', 'KR', 'museum', 10),
  ('리움미술관', '서울', 'KR', 'museum', 9),
  ('서울시립미술관', '서울', 'KR', 'museum', 8),
  ('아트선재센터', '서울', 'KR', 'museum', 7),
  ('일민미술관', '서울', 'KR', 'museum', 6),
  ('아모레퍼시픽미술관', '서울', 'KR', 'museum', 7),
  ('대림미술관', '서울', 'KR', 'museum', 5),

  -- 국내 · 1군 갤러리
  ('국제갤러리', '서울', 'KR', 'gallery_major', 7),
  ('갤러리현대', '서울', 'KR', 'gallery_major', 7),
  ('학고재', '서울', 'KR', 'gallery_major', 6),
  ('PKM갤러리', '서울', 'KR', 'gallery_major', 6),
  ('가나아트', '서울', 'KR', 'gallery_major', 6),
  ('아라리오갤러리', '서울', 'KR', 'gallery_major', 6),

  -- 국내 · 중견 갤러리
  ('갤러리바톤', '서울', 'KR', 'gallery_mid', 4),
  ('원앤제이갤러리', '서울', 'KR', 'gallery_mid', 4),
  ('두산갤러리', '서울', 'KR', 'gallery_mid', 4),
  ('금호미술관', '서울', 'KR', 'gallery_mid', 4),

  -- 국내 · 신진·독립공간 (신규성 보너스는 batch에서 별도 적용)
  ('P21', '서울', 'KR', 'gallery_alt', 2),
  ('휘슬', '서울', 'KR', 'gallery_alt', 2),
  ('합정지구', '서울', 'KR', 'gallery_alt', 2),
  ('space illi', '서울', 'KR', 'gallery_alt', 2),

  -- 국내 · 페어·비엔날레
  ('Kiaf SEOUL', '서울', 'KR', 'fair', 6),
  ('Frieze Seoul', '서울', 'KR', 'fair', 8),
  ('광주비엔날레', '광주', 'KR', 'biennale', 8),
  ('부산비엔날레', '부산', 'KR', 'biennale', 7),

  -- 국내 · 레지던시
  ('국립현대미술관 고양창작스튜디오', '고양', 'KR', 'residency', 5),
  ('인천아트플랫폼', '인천', 'KR', 'residency', 4),

  -- 해외 · 미술관
  ('MoMA', 'New York', 'US', 'museum', 10),
  ('Tate Modern', 'London', 'GB', 'museum', 10),
  ('Centre Pompidou', 'Paris', 'FR', 'museum', 9),

  -- 해외 · 갤러리
  ('Pace Gallery', 'New York', 'US', 'gallery_major', 8),
  ('Perrotin', 'Paris', 'FR', 'gallery_major', 7),
  ('Thaddaeus Ropac', 'London', 'GB', 'gallery_major', 7),

  -- 해외 · 페어·비엔날레
  ('Art Basel', 'Basel', 'CH', 'fair', 9),
  ('Venice Biennale', 'Venice', 'IT', 'biennale', 10),
  ('Frieze London', 'London', 'GB', 'fair', 8),

  -- 경매사 (제도가 아닌 시장 축에 주로 쓰이지만 참조용으로 등록)
  ('서울옥션', '서울', 'KR', 'auction_house', 3),
  ('케이옥션', '서울', 'KR', 'auction_house', 3),
  ('Christie''s', 'New York', 'US', 'auction_house', 5),
  ('Sotheby''s', 'New York', 'US', 'auction_house', 5)
on conflict do nothing;
