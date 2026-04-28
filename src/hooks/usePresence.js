import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

// 한국어/일본어 1:1 매핑된 형용사 풀
const ADJECTIVES_KO = [
  "쓸쓸한", "달빛어린", "속삭이는", "나른한", "감성적인", "로맨틱한",
  "새벽의", "창가의", "은밀한", "조용한", "비밀스러운", "아련한",
  "취해버린", "살짝 취한", "마지막잔의", "첫잔의", "안주없는", "한잔더",
  "수줍은", "시니컬한", "철학적인", "낭만적인", "방랑하는", "혼잣말하는",
  "사색에 잠긴", "꿈꾸는", "자유로운", "예민한", "능청스런", "츤데레",
  "재즈에 취한", "피아노 치는", "책 읽는", "시 쓰는", "사진 찍는",
  "노래하는", "춤추는", "여행 중인", "길잃은", "멍때리는",
];

const ADJECTIVES_JA = [
  "寂しげな", "月光の", "ささやく", "けだるい", "感性的な", "ロマンチックな",
  "夜明けの", "窓辺の", "ひそかな", "静かな", "秘密めいた", "切ない",
  "酔っぱらった", "ほろ酔いの", "最後の一杯の", "最初の一杯の", "おつまみなしの", "もう一杯の",
  "はにかむ", "シニカルな", "哲学的な", "ロマン派の", "さすらう", "独り言の",
  "物思いに沈む", "夢みる", "自由な", "繊細な", "とぼけた", "ツンデレな",
  "ジャズに酔う", "ピアノを弾く", "本を読む", "詩を書く", "写真を撮る",
  "歌う", "踊る", "旅する", "迷子の", "ぼんやりする",
];

// 한국어/일본어 1:1 매핑된 명사 풀
const NOUNS_KO = [
  "바텐더", "시인", "몽상가", "여행자", "탐정", "피아니스트",
  "작가", "화가", "철학자", "음악가", "사진작가",
  "늑대", "고양이", "올빼미", "여우", "까마귀", "수달",
  "펭귄", "거북이", "나비",
  "나그네", "방랑자", "몽유병자", "불면증자", "망상가", "낭만파",
  "이방인", "단골손님", "관찰자", "수집가", "기록자",
  "위스키병", "얼음조각", "잔 밑바닥", "마지막잔", "빈 의자",
  "창가 자리", "달빛", "새벽별", "재떨이", "레코드판",
];

const NOUNS_JA = [
  "バーテンダー", "詩人", "夢想家", "旅人", "探偵", "ピアニスト",
  "作家", "画家", "哲学者", "音楽家", "写真家",
  "オオカミ", "猫", "フクロウ", "キツネ", "カラス", "カワウソ",
  "ペンギン", "亀", "蝶",
  "通り過ぎる人", "放浪者", "夢遊病者", "不眠症者", "妄想家", "ロマン派",
  "異邦人", "常連客", "観察者", "収集家", "記録者",
  "ウイスキー瓶", "氷のかけら", "グラスの底", "最後の一杯", "空席",
  "窓辺の席", "月光", "明けの星", "灰皿", "レコード盤",
];

const AVATARS = [
  "🥃", "🍺", "🍷", "🧊", "🍶", "🍸", "🍹", "🫗",
  "🌙", "✨", "🎵", "📖", "🎭", "🕯️",
];

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 닉네임 인덱스를 한 번 추첨하고 한국어/일본어 둘 다 생성
 * @returns {object} { nicknameKo, nicknameJa, adjIdx, nounIdx }
 */
function generateNicknamePair() {
  const adjIdx = Math.floor(Math.random() * ADJECTIVES_KO.length);
  const nounIdx = Math.floor(Math.random() * NOUNS_KO.length);
  return {
    nicknameKo: `${ADJECTIVES_KO[adjIdx]} ${NOUNS_KO[nounIdx]}`,
    nicknameJa: `${ADJECTIVES_JA[adjIdx]}${NOUNS_JA[nounIdx]}`,
    adjIdx,
    nounIdx,
  };
}

/**
 * usePresence
 * @param {string} seatLabel
 * @param {boolean} inMatch
 * @param {object} options - { myId, initialNickname, initialNicknameJa, initialAvatar }
 */
export function usePresence(seatLabel, inMatch = false, options = {}) {
  const { myId: externalMyId, initialNickname, initialNicknameJa, initialAvatar } = options;

  const [users, setUsers] = useState([]);
  const [myId] = useState(() => externalMyId || crypto.randomUUID());

  // 초기 닉네임 페어 생성 (없으면 새로 추첨)
  const [nicknamePair, setNicknamePair] = useState(() => {
    if (initialNickname && initialNicknameJa) {
      return { nicknameKo: initialNickname, nicknameJa: initialNicknameJa };
    }
    if (initialNickname) {
      // 일본어 버전이 없으면 한국어만 (기존 사용자 호환)
      return { nicknameKo: initialNickname, nicknameJa: initialNickname };
    }
    return generateNicknamePair();
  });

  const [myAvatar, setMyAvatar] = useState(() => initialAvatar || randomPick(AVATARS));
  const [myStatus, setMyStatus] = useState("hello");
  const channelRef = useRef(null);

  // 한국어 닉네임 (사장님 화면에서 보는 거 + 호환성용)
  const myNickname = nicknamePair.nicknameKo;
  // 일본어 닉네임
  const myNicknameJa = nicknamePair.nicknameJa;

  // 세션에서 받은 초기값이 나중에 들어오면 동기화
  useEffect(() => {
    if (initialNickname && initialNickname !== myNickname) {
      setNicknamePair({
        nicknameKo: initialNickname,
        nicknameJa: initialNicknameJa || initialNickname,
      });
    }
    if (initialAvatar && initialAvatar !== myAvatar) {
      setMyAvatar(initialAvatar);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNickname, initialNicknameJa, initialAvatar]);

  const rerollNickname = () => {
    setNicknamePair(generateNicknamePair());
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
              nicknameJa: p.nicknameJa || p.nickname, // 일본어 없으면 한국어
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
            nicknameJa: myNicknameJa,
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
        nicknameJa: myNicknameJa,
        avatar: myAvatar,
        seat: seatLabel,
        status: myStatus,
        inMatch,
        joinedAt: Date.now(),
      });
    }
  }, [myStatus, myNickname, myNicknameJa, myAvatar, inMatch]);

  return {
    users,
    userCount: users.length,
    myId,
    myNickname,        // 한국어 (기존 호환성)
    myNicknameJa,      // 일본어 (NEW!)
    myAvatar,
    mySeat: seatLabel,
    myStatus,
    setMyStatus,
    rerollNickname,
  };
}
