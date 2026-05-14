import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { getRandomQuestions } from "../lib/flirtingQuestions";

/**
 * useFlirtingGame
 *
 * 이구동성 플러팅 게임 훅
 *
 * 기능:
 * - 게임 신청 (상대방에게 신청)
 * - 게임 수신 (받은 신청 알림)
 * - 수락 / 거절
 * - 선택 제출 (각 라운드)
 * - 실시간 동기화 (양쪽 선택 + 라운드 진행)
 *
 * @param {string} sessionId - 현재 손님 세션 ID
 * @param {string} seatLabel - 좌석 라벨
 * @param {string} nickname - 닉네임
 * @param {string} storeId - 매장 ID
 */
export function useFlirtingGame(sessionId, seatLabel, nickname, storeId) {
  // 현재 진행 중인 게임 (내가 신청자든 받은 사람이든)
  const [currentGame, setCurrentGame] = useState(null);

  // 받은 게임 신청 (대기 중)
  const [incomingGame, setIncomingGame] = useState(null);

  // 내 선택과 상대방 선택 (현재 라운드)
  const [myChoices, setMyChoices] = useState({}); // { round: 'a' | 'b' }
  const [opponentChoices, setOpponentChoices] = useState({});

  // 게임 종료 결과 (전체 점수)
  const [gameResult, setGameResult] = useState(null);

  const channelRef = useRef(null);
  const gameChannelRef = useRef(null);

  // ─────────────────────────────────────────
  // 받은 신청 감지 (Realtime)
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;

    // 채널 1: 받은 신청 감지
    const channel = supabase
      .channel(`flirting-incoming-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "flirting_games",
          filter: `invitee_session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log("[Flirting] 신청 받음:", payload.new);
          // pending 상태면 incoming으로 설정
          if (payload.new.status === "pending") {
            setIncomingGame(payload.new);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    // 기존에 pending인 신청 있는지 확인
    checkPendingGames();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // 기존 pending 게임 체크
  const checkPendingGames = useCallback(async () => {
    if (!sessionId) return;

    const { data, error } = await supabase
      .from("flirting_games")
      .select("*")
      .eq("invitee_session_id", sessionId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0) {
      // 30초 이내 신청만 표시
      const createdAt = new Date(data[0].created_at).getTime();
      const now = Date.now();
      if (now - createdAt < 30000) {
        setIncomingGame(data[0]);
      }
    }
  }, [sessionId]);

  // ─────────────────────────────────────────
  // 게임 진행 중 실시간 동기화
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!currentGame?.id) return;

    // 채널 2: 게임 진행 중 동기화
    const channel = supabase
      .channel(`flirting-game-${currentGame.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "flirting_games",
          filter: `id=eq.${currentGame.id}`,
        },
        (payload) => {
          console.log("[Flirting] 게임 변경:", payload);
          if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
            setCurrentGame(payload.new);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "flirting_choices",
          filter: `game_id=eq.${currentGame.id}`,
        },
        (payload) => {
          console.log("[Flirting] 선택 들어옴:", payload.new);
          const choice = payload.new;
          if (choice.session_id === sessionId) {
            setMyChoices(prev => ({ ...prev, [choice.round_number]: choice.choice }));
          } else {
            setOpponentChoices(prev => ({ ...prev, [choice.round_number]: choice.choice }));
          }
        }
      )
      .subscribe();

    gameChannelRef.current = channel;

    // 기존 선택들 로드
    loadExistingChoices(currentGame.id);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentGame?.id, sessionId]);

  // 기존 선택들 불러오기 (재접속 시)
  const loadExistingChoices = useCallback(async (gameId) => {
    const { data, error } = await supabase
      .from("flirting_choices")
      .select("*")
      .eq("game_id", gameId);

    if (error || !data) return;

    const mine = {};
    const opp = {};
    data.forEach(c => {
      if (c.session_id === sessionId) {
        mine[c.round_number] = c.choice;
      } else {
        opp[c.round_number] = c.choice;
      }
    });
    setMyChoices(mine);
    setOpponentChoices(opp);
  }, [sessionId]);

  // ─────────────────────────────────────────
  // 게임 신청 (내가 → 상대방)
  // ─────────────────────────────────────────
  const inviteGame = useCallback(async (targetSession) => {
    if (!sessionId || !targetSession) {
      return { ok: false, error: "정보가 부족해요" };
    }

    // 자기 자신은 신청 불가
    if (targetSession.id === sessionId) {
      return { ok: false, error: "자기 자신에게는 신청할 수 없어요" };
    }

    // 이미 진행 중인 게임이 있는지 확인
    const { data: existing } = await supabase
      .from("flirting_games")
      .select("*")
      .or(`inviter_session_id.eq.${sessionId},invitee_session_id.eq.${sessionId}`)
      .in("status", ["pending", "accepted", "playing"]);

    if (existing && existing.length > 0) {
      return { ok: false, error: "이미 진행 중인 게임이 있어요" };
    }

    // 5라운드 질문 랜덤 선택
    const questions = getRandomQuestions();

    // 게임 생성
    const { data, error } = await supabase
      .from("flirting_games")
      .insert({
        store_id: storeId,
        inviter_session_id: sessionId,
        inviter_seat_label: seatLabel,
        inviter_nickname: nickname,
        invitee_session_id: targetSession.id,
        invitee_seat_label: targetSession.seat_label,
        invitee_nickname: targetSession.nickname,
        status: "pending",
        questions: questions,
        current_round: 1,
      })
      .select()
      .single();

    if (error) {
      console.error("[Flirting] 게임 생성 실패:", error);
      return { ok: false, error: "신청에 실패했어요" };
    }

    setCurrentGame(data);
    return { ok: true, game: data };
  }, [sessionId, seatLabel, nickname, storeId]);

  // ─────────────────────────────────────────
  // 신청 수락
  // ─────────────────────────────────────────
  const acceptGame = useCallback(async (gameId) => {
    const { data, error } = await supabase
      .from("flirting_games")
      .update({
        status: "playing",
        responded_at: new Date().toISOString(),
      })
      .eq("id", gameId)
      .select()
      .single();

    if (error) {
      console.error("[Flirting] 수락 실패:", error);
      return { ok: false };
    }

    setCurrentGame(data);
    setIncomingGame(null);
    return { ok: true, game: data };
  }, []);

  // ─────────────────────────────────────────
  // 신청 거절
  // ─────────────────────────────────────────
  const declineGame = useCallback(async (gameId) => {
    const { error } = await supabase
      .from("flirting_games")
      .update({
        status: "declined",
        responded_at: new Date().toISOString(),
      })
      .eq("id", gameId);

    if (error) {
      console.error("[Flirting] 거절 실패:", error);
      return { ok: false };
    }

    setIncomingGame(null);
    return { ok: true };
  }, []);

  // ─────────────────────────────────────────
  // 신청 취소 (내가 신청한 거)
  // ─────────────────────────────────────────
  const cancelInvite = useCallback(async (gameId) => {
    await supabase
      .from("flirting_games")
      .update({ status: "cancelled" })
      .eq("id", gameId);

    setCurrentGame(null);
    setMyChoices({});
    setOpponentChoices({});
  }, []);

  // ─────────────────────────────────────────
  // 라운드 선택 제출
  // ─────────────────────────────────────────
  const submitChoice = useCallback(async (round, choice) => {
    if (!currentGame || !sessionId) return { ok: false };
    if (choice !== "a" && choice !== "b") return { ok: false };

    // 이미 선택했으면 무시
    if (myChoices[round]) return { ok: true, alreadyChosen: true };

    // 낙관적 업데이트
    setMyChoices(prev => ({ ...prev, [round]: choice }));

    const { error } = await supabase
      .from("flirting_choices")
      .insert({
        game_id: currentGame.id,
        session_id: sessionId,
        round_number: round,
        choice: choice,
      });

    if (error) {
      console.error("[Flirting] 선택 제출 실패:", error);
      // 롤백
      setMyChoices(prev => {
        const next = { ...prev };
        delete next[round];
        return next;
      });
      return { ok: false };
    }

    return { ok: true };
  }, [currentGame, sessionId, myChoices]);

  // ─────────────────────────────────────────
  // 다음 라운드로 진행 (양쪽 다 선택했을 때 자동)
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!currentGame || currentGame.status !== "playing") return;

    const round = currentGame.current_round;
    const myChoice = myChoices[round];
    const oppChoice = opponentChoices[round];

    // 양쪽 다 선택했고, 5라운드까지 안 끝났으면 다음 라운드로
    if (myChoice && oppChoice) {
      // 마지막 라운드 (5)면 게임 종료
      if (round >= 5) {
        // 점수 계산
        let score = 0;
        for (let r = 1; r <= 5; r++) {
          if (myChoices[r] === opponentChoices[r]) score++;
        }
        
        // DB 업데이트 (게임 종료)
        finishGame(currentGame.id, score);
      }
      // 마지막 라운드 아니면 잠시 후 다음 라운드 (결과 보여줄 시간)
      // → 컴포넌트에서 "다음 라운드" 버튼 누르면 진행하도록 함
    }
  }, [myChoices, opponentChoices, currentGame]);

  // 게임 종료
  const finishGame = useCallback(async (gameId, score) => {
    await supabase
      .from("flirting_games")
      .update({
        status: "finished",
        final_score: score,
        finished_at: new Date().toISOString(),
      })
      .eq("id", gameId);

    setGameResult({ score, gameId });
  }, []);

  // 다음 라운드로 이동 (수동)
  const goToNextRound = useCallback(async () => {
    if (!currentGame) return;
    const nextRound = currentGame.current_round + 1;
    if (nextRound > 5) return;

    await supabase
      .from("flirting_games")
      .update({ current_round: nextRound })
      .eq("id", currentGame.id);
  }, [currentGame]);

  // 게임 완전 종료 (모달 닫기)
  const closeGame = useCallback(() => {
    setCurrentGame(null);
    setMyChoices({});
    setOpponentChoices({});
    setGameResult(null);
  }, []);

  // 내가 신청자인지
  const isInviter = currentGame?.inviter_session_id === sessionId;

  return {
    // 상태
    currentGame,        // 현재 진행 중인 게임 (있으면 모달 표시)
    incomingGame,       // 받은 신청 (있으면 알림 표시)
    myChoices,          // 내 선택들
    opponentChoices,    // 상대방 선택들
    gameResult,         // 게임 결과 (점수)
    isInviter,          // 내가 신청한 사람인지

    // 액션
    inviteGame,         // 게임 신청
    acceptGame,         // 수락
    declineGame,        // 거절
    cancelInvite,       // 신청 취소
    submitChoice,       // 라운드 선택
    goToNextRound,      // 다음 라운드
    closeGame,          // 게임 닫기
  };
}
