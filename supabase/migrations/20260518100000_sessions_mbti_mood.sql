-- 손님 온보딩 입력 컬럼: mbti, mood
-- 둘 다 nullable. 손님이 "건너뛰기"한 경우 null.
-- mood: 'quiet' (조용히 한 잔) | 'party' (재미있는 밤)
-- mbti: 16가지 표준 타입 + 'unknown'(잘 모르겠어요)

alter table public.sessions
  add column if not exists mbti text,
  add column if not exists mood text;

-- 기존 제약이 남아 있을 때를 대비해 재생성한다.
alter table public.sessions drop constraint if exists sessions_mood_check;
alter table public.sessions
  add constraint sessions_mood_check
  check (mood is null or mood in ('quiet', 'party'));

alter table public.sessions drop constraint if exists sessions_mbti_check;
alter table public.sessions
  add constraint sessions_mbti_check
  check (
    mbti is null or mbti in (
      'INTJ','INTP','ENTJ','ENTP',
      'INFJ','INFP','ENFJ','ENFP',
      'ISTJ','ISFJ','ESTJ','ESFJ',
      'ISTP','ISFP','ESTP','ESFP',
      'unknown'
    )
  );

create index if not exists idx_sessions_mood
  on public.sessions(mood) where mood is not null;

create index if not exists idx_sessions_mbti
  on public.sessions(mbti) where mbti is not null;
