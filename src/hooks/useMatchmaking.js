import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * useMatchmaking
 * - '더 나인' 1:1 매칭 + 게임 진행을 Supabase Broadcast로 동기화
 *
 * 사용:
 *   const mm = useMatchmaking({ myId, myNickname, myAvatar, mySeat });
 *   mm.sendInvite(targetUserId);
 *   mm.acceptInvite(invite);
 *   mm.declineInvite(invite);
 *   mm.sendMove(cardNumber);      // 게임 중 내 선택 전송
 *   mm.leaveMatch();
 *
 * 반환 상태:
 *   incomingInvite  — 받은 초대 { from, nickname, avatar, seat, inviteId }
 *   outgoingInvite  — 보낸 초대 { to, status: 'pending'|'declined'|'accepted' }
 *   match           — 매칭 정보 { matchId, opponent, role: 'host'|'guest' }
 *   opponentMove    — 상대가 이번 라운드 선택 { round, card } (공개 전엔 { round, hidden: true })
 *   matchResult     — 게임 종료 시 { myWins, oppWins, outcome }
 */
export function useMatchmaking({ myId, myNickname, myAvatar, mySeat }) {
  const [incomingInvite, setIncomingInvite] = useState(null);
  const [outgoingInvite, setOutgoingInvite] = useState(null);
  const [match, setMatch] = useState(null);
  const [opponentMove, setOpponentMove] = useState(null);
  const [opponentReady, setOpponentReady] = useState(false);
  const [matchResult, setMatchResult] = useState(null);

  const inviteChannelRef = useRef(null);
  const matchChannelRef = useRef(null);

  // ───── 내 전용 초대 채널 (언제나 수신 대기) ─────
  useEffect(() => {
    if (!myId) return;

    const channel = supabase.channel(`nine-invite-${myId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "invite" }, ({ payload }) => {
        setIncomingInvite({
          from: payload.from,
          nickname: payload.nickname,
          avatar: payload.avatar,
          seat: payload.seat,
          inviteId: payload.inviteId,
        });
      })
      .on("broadcast", { event: "invite-response" }, ({ payload }) => {
        // 내가 보낸 초대에 대한 응답
        setOutgoingInvite((prev) => {
          if (!prev || prev.inviteId !== payload.inviteId) return prev;
          return { ...prev, status: payload.accepted ? "accepted" : "declined" };
        });

        if (payload.accepted) {
          // 매칭 성사 → 나는 host
          joinMatchChannel(payload.matchId, payload.opponent, "host");
          setOutgoingInvite(null);
        } else {
          // 3초 뒤 거절 알림 자동 숨김
          setTimeout(() => setOutgoingInvite(null), 3000);
        }
      })
      .subscribe();

    inviteChannelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      inviteChannelRef.current = null;
    };
  }, [myId]);

  // ───── 매치 채널 입장/정리 ─────
  const joinMatchChannel = useCallback(
    (matchId, opponent, role) => {
      const channel = supabase.channel(`nine-match-${matchId}`, {
        config: { broadcast: { self: false } },
      });

      channel
        .on("broadcast", { event: "move-reveal" }, ({ payload }) => {
          // 상대의 카드 도착 — 숫자 바로 공개
          if (payload.from !== myId) {
            setOpponentMove({
              round: payload.round,
              card: payload.card,
              hidden: false,
            });
          }
        })
        .on("broadcast", { event: "ready" }, ({ payload }) => {
          if (payload.from !== myId) setOpponentReady(true);
        })
        .on("broadcast", { event: "leave" }, ({ payload }) => {
          if (payload.from !== myId) {
            setMatch(null);
            setMatchResult({ forfeit: true, by: "opponent" });
          }
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            channel.send({
              type: "broadcast",
              event: "ready",
              payload: { from: myId },
            });
          }
        });

      matchChannelRef.current = channel;
      setMatch({ matchId, opponent, role });
      setOpponentMove(null);
      setOpponentReady(false);
      setMatchResult(null);
    },
    [myId]
  );

  // ───── 초대 보내기 ─────
  const sendInvite = useCallback(
    async (targetUser) => {
      if (!targetUser?.id || outgoingInvite) return;
      const inviteId = crypto.randomUUID();
      const target = supabase.channel(`nine-invite-${targetUser.id}`);
      await target.subscribe();
      await target.send({
        type: "broadcast",
        event: "invite",
        payload: {
          from: myId,
          nickname: myNickname,
          avatar: myAvatar,
          seat: mySeat,
          inviteId,
        },
      });
      supabase.removeChannel(target);

      setOutgoingInvite({
        to: targetUser.id,
        toNickname: targetUser.nickname,
        toAvatar: targetUser.avatar,
        status: "pending",
        inviteId,
      });

      // 20초 타임아웃
      setTimeout(() => {
        setOutgoingInvite((prev) => {
          if (prev?.inviteId === inviteId && prev.status === "pending") {
            return { ...prev, status: "timeout" };
          }
          return prev;
        });
        setTimeout(() => {
          setOutgoingInvite((prev) =>
            prev?.inviteId === inviteId ? null : prev
          );
        }, 3000);
      }, 20000);
    },
    [myId, myNickname, myAvatar, mySeat, outgoingInvite]
  );

  // ───── 초대 수락 ─────
  const acceptInvite = useCallback(
    async (invite) => {
      if (!invite) return;
      const matchId = crypto.randomUUID();
      const senderChannel = supabase.channel(`nine-invite-${invite.from}`);
      await senderChannel.subscribe();
      await senderChannel.send({
        type: "broadcast",
        event: "invite-response",
        payload: {
          inviteId: invite.inviteId,
          accepted: true,
          matchId,
          opponent: {
            id: myId,
            nickname: myNickname,
            avatar: myAvatar,
            seat: mySeat,
          },
        },
      });
      supabase.removeChannel(senderChannel);

      // 나는 guest 로 매치 채널 입장
      joinMatchChannel(
        matchId,
        {
          id: invite.from,
          nickname: invite.nickname,
          avatar: invite.avatar,
          seat: invite.seat,
        },
        "guest"
      );
      setIncomingInvite(null);
    },
    [myId, myNickname, myAvatar, mySeat, joinMatchChannel]
  );

  // ───── 초대 거절 ─────
  const declineInvite = useCallback(
    async (invite) => {
      if (!invite) return;
      const senderChannel = supabase.channel(`nine-invite-${invite.from}`);
      await senderChannel.subscribe();
      await senderChannel.send({
        type: "broadcast",
        event: "invite-response",
        payload: { inviteId: invite.inviteId, accepted: false },
      });
      supabase.removeChannel(senderChannel);
      setIncomingInvite(null);
    },
    []
  );

  // ───── 게임 중: 내 카드 선택 전송 ─────
  const sendMove = useCallback(
    async ({ round, card }) => {
      const ch = matchChannelRef.current;
      if (!ch) return;
      await ch.send({
        type: "broadcast",
        event: "move-reveal",
        payload: { from: myId, round, card },
      });
    },
    [myId]
  );

  // ───── 매치 나가기 ─────
  const leaveMatch = useCallback(async () => {
    const ch = matchChannelRef.current;
    if (ch) {
      await ch.send({
        type: "broadcast",
        event: "leave",
        payload: { from: myId },
      });
      supabase.removeChannel(ch);
      matchChannelRef.current = null;
    }
    setMatch(null);
    setOpponentMove(null);
    setOpponentReady(false);
  }, [myId]);

  // 초대 취소 (보낸 쪽)
  const cancelOutgoing = useCallback(() => setOutgoingInvite(null), []);

  return {
    incomingInvite,
    outgoingInvite,
    match,
    opponentMove,
    opponentReady,
    matchResult,
    setMatchResult,
    sendInvite,
    acceptInvite,
    declineInvite,
    sendMove,
    leaveMatch,
    cancelOutgoing,
  };
}
