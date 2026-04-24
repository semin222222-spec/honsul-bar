import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

const ADJECTIVES = [
  "쓸쓸한", "달빛어린", "속삭이는", "나른한", "감성적인", "로맨틱한",
  "새벽의", "창가의", "은밀한", "조용한", "비밀스러운", "아련한",
  "취해버린", "살짝 취한", "마지막잔의", "첫잔의", "안주없는", "한잔더",
  "수줍은", "시니컬한", "철학적인", "낭만적인", "방랑하는", "혼잣말하는",
  "사색에 잠긴", "꿈꾸는", "자유로운", "예민한", "능청스런", "츤데레",
  "재즈에 취한", "피아노 치는", "책 읽는", "시 쓰는", "사진 찍는",
  "노래하는", "춤추는", "여행 중인", "길잃은", "멍때리는",
];

const NOUNS = [
  "바텐더", "시인", "몽상가", "여행자", "탐정", "피아니스트",
  "작가", "화가", "철학자", "음악가", "사진작가",
  "늑대", "고양이", "올빼미", "여우", "까마귀", "수달",
  "펭귄", "거북이", "나비",
  "나그네", "방랑자", "몽유병자", "불면증자", "망상가", "낭만파",
  "이방인", "단골손님", "관찰자", "수집가", "기록자",
  "위스키병", "얼음조각", "잔 밑바닥", "마지막잔", "빈 의자",
  "창가 자리", "달빛", "새벽별", "재떨이", "레코드판",
];

const AVATARS = [
  "🥃", "🍺", "🍷", "🧊", "🍶", "🍸", "🍹", "🫗",
  "🌙", "✨", "🎵", "📖", "🎭", "🕯️",
];

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateNickname() {
  return `${randomPick(ADJECTIVES)} ${randomPick(NOUNS)}`;
}

/**
 * usePresence
 * @param {string} seatLabel
 * @param {boolean} inMatch
 * @param {object} options - { myId, initialNickname, initialAvatar }
 */
export function usePresence(seatLabel, inMatch = false, options = {}) {
  const { myId: externalMyId, initialNickname, initialAvatar } = options;

  const [users, setUsers] = useState([]);
  const [myId] = useState(() => externalMyId || crypto.randomUUID());
  const [myNickname, setMyNickname] = useState(() => initialNickname || generateNickname());
  const [myAvatar, setMyAvatar] = useState(() => initialAvatar || randomPick(AVATARS));
  const [myStatus, setMyStatus] = useState("hello");
  const channelRef = useRef(null);

  // 세션에서 받은 초기값이 나중에 들어오면 동기화
  useEffect(() => {
    if (initialNickname && initialNickname !== myNickname) {
      setMyNickname(initialNickname);
    }
    if (initialAvatar && initialAvatar !== myAvatar) {
      setMyAvatar(initialAvatar);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNickname, initialAvatar]);

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
              inMatch: !!p.inMatch,
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
            inMatch,
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

  useEffect(() => {
    if (channelRef.current && seatLabel) {
      channelRef.current.track({
        nickname: myNickname,
        avatar: myAvatar,
        seat: seatLabel,
        status: myStatus,
        inMatch,
        joinedAt: Date.now(),
      });
    }
  }, [myStatus, myNickname, myAvatar, inMatch]);

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
