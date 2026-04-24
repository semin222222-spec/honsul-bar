import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

// ───── 형용사 풀 (혼술바 감성) ─────
const ADJECTIVES = [
  // 감성적
  "쓸쓸한", "달빛어린", "속삭이는", "나른한", "감성적인", "로맨틱한",
  "새벽의", "창가의", "은밀한", "조용한", "비밀스러운", "아련한",
  // 취기 관련
  "취해버린", "살짝 취한", "마지막잔의", "첫잔의", "안주없는", "한잔더",
  // 성격
  "수줍은", "시니컬한", "철학적인", "낭만적인", "방랑하는", "혼잣말하는",
  "사색에 잠긴", "꿈꾸는", "자유로운", "예민한", "능청스런", "츤데레",
  // 분위기
  "재즈에 취한", "피아노 치는", "책 읽는", "시 쓰는", "사진 찍는",
  "노래하는", "춤추는", "여행 중인", "길잃은", "멍때리는",
];

// ───── 명사 풀 ─────
const NOUNS = [
  // 직업/역할
  "바텐더", "시인", "몽상가", "여행자", "탐정", "피아니스트",
  "작가", "화가", "철학자", "음악가", "사진작가",
  // 동물 (은유)
  "늑대", "고양이", "올빼미", "여우", "까마귀", "수달",
  "펭귄", "거북이", "나비",
  // 은유적
  "나그네", "방랑자", "몽유병자", "불면증자", "망상가", "낭만파",
  "이방인", "단골손님", "관찰자", "수집가", "기록자",
  // 사물
  "위스키병", "얼음조각", "잔 밑바닥", "마지막잔", "빈 의자",
  "창가 자리", "달빛", "새벽별", "재떨이", "레코드판",
];

// ───── 아바타 ─────
const AVATARS = [
  "🥃", "🍺", "🍷", "🧊", "🍶", "🍸", "🍹", "🫗",
  "🌙", "✨", "🎵", "📖", "🎭", "🕯️",
];

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 형용사 + 명사 조합으로 닉네임 생성
function generateNickname() {
  return `${randomPick(ADJECTIVES)} ${randomPick(NOUNS)}`;
}

export function usePresence(seatLabel) {
  const [users, setUsers] = useState([]);
  const [myId] = useState(() => crypto.randomUUID());
  const [myNickname, setMyNickname] = useState(() => generateNickname());
  const [myAvatar, setMyAvatar] = useState(() => randomPick(AVATARS));
  const [myStatus, setMyStatus] = useState("hello");
  const channelRef = useRef(null);

  // 닉네임/아바타 다시 뽑기
  const rerollNickname = () => {
    setMyNickname(generateNickname());
    setMyAvatar(randomPick(AVATARS));
  };

  useEffect(() => {
    if (!seatLabel) return;

    const channel = supabase.channel("bar-presence", {
      config: { presence: { key: myId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const userList = [];
        Object.entries(state).forEach(([key, presences]) => {
          if (presences.length > 0) {
            const p = presences[0];
            userList.push({
              id: key,
              nickname: p.nickname,
              avatar: p.avatar,
              seat: p.seat,
              status: p.status,
              joinedAt: p.joinedAt,
            });
          }
        });
        setUsers(userList);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            nickname: myNickname,
            avatar: myAvatar,
            seat: seatLabel,
            status: myStatus,
            joinedAt: Date.now(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [seatLabel]);

  // 닉네임/아바타/상태 변경 시 presence 업데이트
  useEffect(() => {
    if (channelRef.current && seatLabel) {
      channelRef.current.track({
        nickname: myNickname,
        avatar: myAvatar,
        seat: seatLabel,
        status: myStatus,
        joinedAt: Date.now(),
      });
    }
  }, [myStatus, myNickname, myAvatar]);

  return {
    users,
    userCount: users.length,
    myId,
    myNickname,
    myAvatar,
    mySeat: seatLabel,
    myStatus,
    setMyStatus,
    rerollNickname,
  };
}
