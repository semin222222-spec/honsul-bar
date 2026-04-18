import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

const RANDOM_NAMES = [
  "위스키 탐험가", "맥주 초보", "하이볼 매니아", "칵테일 연구원",
  "와인 입문자", "소주 한 잔", "막걸리 전도사", "에일 덕후",
  "진토닉 마스터", "럼코크 러버", "사워 중독자", "논알콜 히어로",
];

const AVATARS = ["🥃", "🍺", "🍷", "🧊", "🍶", "🍸", "🍹", "🫗"];

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function usePresence(seatLabel) {
  const [users, setUsers] = useState([]);
  const [myId] = useState(() => crypto.randomUUID());
  const [myNickname] = useState(() => randomPick(RANDOM_NAMES));
  const [myAvatar] = useState(() => randomPick(AVATARS));
  const [myStatus, setMyStatus] = useState("hello");
  const channelRef = useRef(null);

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
  }, [myStatus]);

  return {
    users,
    userCount: users.length,
    myId,
    myNickname,
    myAvatar,
    mySeat: seatLabel,
    myStatus,
    setMyStatus,
  };
}