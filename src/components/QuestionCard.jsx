import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Sparkles, MessageCircle, Eye, Flame } from "lucide-react";

const QUESTIONS = [
  // ── 순한맛: 아이스브레이킹 / 가치관 (34개) ──
  { q: "오늘 내 옆 자리에 앉은 사람의 첫인상을 키워드 하나로?", level: "mild" },
  { q: "MBTI가 뭐예요? 그리고 절대 안 맞는 MBTI는?", level: "mild" },
  { q: "술 취했을 때 나오는 나의 가장 귀여운 버릇은?", level: "mild" },
  { q: "요즘 가장 많이 듣는 노래가 당신의 상태를 설명한다면?", level: "mild" },
  { q: "지금 폰 배경화면이 뭔지 보여줄 수 있어요?", level: "mild" },
  { q: "인스타 피드 vs 인스타 스토리, 더 신경 쓰는 쪽은?", level: "mild" },
  { q: "요즘 가장 빠져있는 넷플릭스/유튜브 콘텐츠는?", level: "mild" },
  { q: "소개팅 앱 써본 적 있어요? 솔직하게!", level: "mild" },
  { q: "나를 동물로 표현하면? 그리고 그 이유는?", level: "mild" },
  { q: "지금 카톡 프로필 사진이 뭔지 설명해 주세요", level: "mild" },
  { q: "내 인생 최고의 flexing 순간은?", level: "mild" },
  { q: "올해 가장 잘한 소비 vs 가장 후회하는 소비?", level: "mild" },
  { q: "아무 데나 여행 갈 수 있다면 지금 당장 어디로?", level: "mild" },
  { q: "내가 가장 자신 있는 요리 한 가지는?", level: "mild" },
  { q: "지금 가장 사고 싶은 물건은 뭐예요?", level: "mild" },
  { q: "혼술 vs 혼밥 vs 혼영, 가장 좋아하는 '혼' 활동은?", level: "mild" },
  { q: "술자리에서 절대 못 참는 것 하나만 고른다면?", level: "mild" },
  { q: "나의 소울푸드는? 그리고 그 이유가 궁금해요", level: "mild" },
  { q: "직업 물어봐도 돼요? 아님 힌트 하나만?", level: "mild" },
  { q: "주량이 어떻게 돼요? 솔직하게 말해봐요", level: "mild" },
  { q: "텍스트로 성격이 보인다고 하잖아요. 나는 ㅋ파 vs ㅎㅎ파?", level: "mild" },
  { q: "내 최애 이모지는? 왜 그걸 제일 많이 써요?", level: "mild" },
  { q: "가장 최근에 울었던 이유는?", level: "mild" },
  { q: "나만 아는 숨은 맛집 하나만 공유해 줄 수 있어요?", level: "mild" },
  { q: "새벽 감성 폭발할 때 주로 뭐 해요?", level: "mild" },
  { q: "지금 쓰는 향수가 있어요? 어떤 향이에요?", level: "mild" },
  { q: "내 갤러리 최근 사진 3번째가 뭔지 보여줄 수 있어요?", level: "mild" },
  { q: "운동 루틴이 있어요? 아님 갓생은 포기한 상태?", level: "mild" },
  { q: "올해 안에 꼭 해보고 싶은 것 한 가지는?", level: "mild" },
  { q: "아침형 인간 vs 저녁형 인간, 어디에 가까워요?", level: "mild" },
  { q: "이 바에서 제일 마음에 드는 부분은?", level: "mild" },
  { q: "내 플레이리스트 공개 가능? 취향이 궁금해요", level: "mild" },
  { q: "최근에 가장 웃겼던 밈이나 영상은?", level: "mild" },
  { q: "카페에서 항상 시키는 음료가 있어요?", level: "mild" },

  // ── 중간맛: 연애 / 플러팅 (36개) ──
  { q: "남녀 사이에 친구가 가능하다 vs 불가능하다?", level: "medium" },
  { q: "첫눈에 반하는 편인가요, 오래 지켜보는 편인가요?", level: "medium" },
  { q: "환승 이별 vs 잠수 이별, 더 최악인 것은?", level: "medium" },
  { q: "옆 사람이 내 잔에 손을 부딪히면 플러팅이다 vs 아니다?", level: "medium" },
  { q: "애인이 내 친구의 깻잎을 떼어줘도 된다 vs 안 된다?", level: "medium" },
  { q: "밀당 잘하는 사람 vs 직진하는 사람, 더 끌리는 쪽은?", level: "medium" },
  { q: "만약 오늘 밤 한 사람과 대화한다면, 기준은 외모 vs 대화 코드?", level: "medium" },
  { q: "전 애인 연락이 오면 어떻게 해요? 읽씹? 답장?", level: "medium" },
  { q: "이상형의 조건 딱 3가지만 말해봐요", level: "medium" },
  { q: "연애할 때 주도하는 편이에요, 끌려가는 편이에요?", level: "medium" },
  { q: "연락 빈도, 하루에 몇 번이 적당하다고 생각해요?", level: "medium" },
  { q: "본인은 질투를 많이 하는 편인가요?", level: "medium" },
  { q: "사귀기 전 썸 기간, 얼마가 적당하다고 생각해요?", level: "medium" },
  { q: "상대방의 과거 연애 횟수가 중요해요?", level: "medium" },
  { q: "데이트 비용 더치페이 vs 번갈아 내기 vs 남자가 더?", level: "medium" },
  { q: "나이 차이 몇 살까지 괜찮아요?", level: "medium" },
  { q: "재회, 해본 적 있어요? 혹시 하고 싶은 사람 있어요?", level: "medium" },
  { q: "좋아하는 사람 앞에서 나도 모르게 하는 행동은?", level: "medium" },
  { q: "고백은 직접 vs 전화 vs 카톡?", level: "medium" },
  { q: "마지막으로 누군가에게 설렜던 게 언제예요?", level: "medium" },
  { q: "연인이 이성 친구와 단둘이 술 마시는 거 OK?", level: "medium" },
  { q: "첫 데이트로 가장 좋은 장소는 어디라고 생각해요?", level: "medium" },
  { q: "플러팅의 신호를 잘 캐치하는 편이에요?", level: "medium" },
  { q: "가장 특이했던 데이트 경험은?", level: "medium" },
  { q: "내가 제일 매력적으로 보이는 순간은 언제라고 생각해요?", level: "medium" },
  { q: "연애할 때 가장 중요한 건 외모/성격/경제력/유머?", level: "medium" },
  { q: "지금 솔로인 이유를 본인이 분석한다면?", level: "medium" },
  { q: "장거리 연애 할 수 있어요?", level: "medium" },
  { q: "비 오는 날 연인과 하고 싶은 것 하나만?", level: "medium" },
  { q: "누가 먼저 고백해야 한다고 생각해요?", level: "medium" },
  { q: "매력적인 목소리 vs 매력적인 눈빛, 더 끌리는 건?", level: "medium" },
  { q: "연인과 커플템 하는 거 좋아하는 편이에요?", level: "medium" },
  { q: "가장 설렜던 고백 혹은 고백 받았던 경험은?", level: "medium" },
  { q: "누군가를 좋아하게 되는 데 얼마나 걸려요?", level: "medium" },
  { q: "옆 사람이 나한테 호감이 있다면, 눈치챌 수 있어요?", level: "medium" },
  { q: "내가 반할 수밖에 없는 한마디가 있다면?", level: "medium" },

  // ── 매운맛: 도발적 / 19금 (30개) ──
  { q: "속궁합이 안 맞으면 이별 사유가 된다 vs 안 된다?", level: "hot" },
  { q: "낮져밤이인가요, 낮이밤져인가요?", level: "hot" },
  { q: "원나잇에 대한 본인의 솔직한 견해는?", level: "hot" },
  { q: "내가 생각하는 나의 가장 섹시한 신체 부위는?", level: "hot" },
  { q: "연인 관계에서 주도하는 편이에요, 맞추는 편이에요?", level: "hot" },
  { q: "술 마시면 스킨십이 늘어나는 편이에요?", level: "hot" },
  { q: "사귀기 전에 스킨십 먼저 vs 고백 먼저?", level: "hot" },
  { q: "가장 야했던 꿈 얘기해 줄 수 있어요?", level: "hot" },
  { q: "매력적인 몸매 vs 매력적인 얼굴, 하나만 고른다면?", level: "hot" },
  { q: "오늘 밤 이 사람이다 싶으면 먼저 대시하는 편?", level: "hot" },
  { q: "썸남/썸녀의 잠옷이 뭐였으면 좋겠어요?", level: "hot" },
  { q: "첫 키스, 분위기파 vs 돌발파?", level: "hot" },
  { q: "상대방에게서 가장 섹시함을 느끼는 순간은?", level: "hot" },
  { q: "연애 초반 vs 연애 후반, 스킨십이 더 좋은 시기는?", level: "hot" },
  { q: "19금 콘텐츠를 연인과 같이 보는 거에 대해 어떻게 생각해요?", level: "hot" },
  { q: "이성에게서 향수 냄새 vs 바디워시 냄새, 더 끌리는 건?", level: "hot" },
  { q: "나의 잠자리 TMI 하나만 공개한다면?", level: "hot" },
  { q: "새벽 2시에 전 애인에게서 연락 오면 어떻게 할 거예요?", level: "hot" },
  { q: "연인 사이에서 못 참는 것 하나만?", level: "hot" },
  { q: "가장 특이한 곳에서 키스해 본 경험은?", level: "hot" },
  { q: "관계에서 가장 중요한 건 감정 vs 기술?", level: "hot" },
  { q: "나의 은밀한 매력 포인트는 뭐라고 생각해요?", level: "hot" },
  { q: "술 마시고 가장 대담해졌던 순간은 언제예요?", level: "hot" },
  { q: "이상형과 밤새 대화 vs 이상형과 10초 눈맞춤?", level: "hot" },
  { q: "가장 가슴 뛰었던 스킨십 경험은?", level: "hot" },
  { q: "만약 지금 옆 사람과 둘만 엘리베이터에 갇히면?", level: "hot" },
  { q: "상대방의 어떤 행동에 가장 심쿵해요?", level: "hot" },
  { q: "모닝 키스 가능 vs 불가능?", level: "hot" },
  { q: "연인에게 절대 양보 못 하는 스킨십 주도권이 있어요?", level: "hot" },
  { q: "지금 옆 사람에게 한 마디 플러팅을 한다면?", level: "hot" },
];

const LEVEL_INFO = {
  mild: { label: "순한맛", emoji: "🍀", color: "#6AB06A", bg: "rgba(106,176,106,0.1)", border: "rgba(106,176,106,0.2)" },
  medium: { label: "중간맛", emoji: "🔥", color: "#D4A537", bg: "rgba(212,165,55,0.1)", border: "rgba(212,165,55,0.2)" },
  hot: { label: "매운맛", emoji: "🌶️", color: "#E24B4A", bg: "rgba(226,75,74,0.1)", border: "rgba(226,75,74,0.2)" },
};

function getQuestionIndex(timestamp) {
  const tenMinBlock = Math.floor(timestamp / (10 * 60 * 1000));
  const seed = tenMinBlock * 2654435761;
  return ((seed >>> 0) % QUESTIONS.length);
}

function getTimeLeft() {
  const now = Date.now();
  const tenMin = 10 * 60 * 1000;
  const nextBlock = Math.ceil(now / tenMin) * tenMin;
  return Math.max(0, Math.floor((nextBlock - now) / 1000));
}

function formatCountdown(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

export default function QuestionCardScreen() {
  const [questionIdx, setQuestionIdx] = useState(() => getQuestionIndex(Date.now()));
  const [secondsLeft, setSecondsLeft] = useState(() => getTimeLeft());
  const [flipKey, setFlipKey] = useState(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const left = getTimeLeft();
      setSecondsLeft(left);

      const newIdx = getQuestionIndex(Date.now());
      if (newIdx !== questionIdx) {
        setQuestionIdx(newIdx);
        setFlipKey(prev => prev + 1);
        setRevealed(false);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [questionIdx]);

  const current = QUESTIONS[questionIdx];
  const level = LEVEL_INFO[current.level];
  const progress = 1 - secondsLeft / 600;

  return (
    <div style={{ padding: "0 clamp(16px, 4vw, 24px)", paddingTop: 16 }}>
      <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "rgba(212,165,55,0.5)", marginBottom: 6 }}>
        ICE BREAKER
      </div>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        marginBottom: "clamp(16px, 5vw, 24px)",
      }}>
        <div style={{
          fontSize: "clamp(18px, 5vw, 22px)", fontWeight: 300, color: "#F5E6C8",
          fontFamily: "'Noto Serif KR', serif",
        }}>
          지금 이 질문, 같이 얘기해 볼까요?
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={flipKey}
          initial={{ rotateY: 90, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          exit={{ rotateY: -90, opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ perspective: 800 }}
        >
          <div
            onClick={() => setRevealed(true)}
            style={{
              background: "linear-gradient(145deg, " + level.bg + ", rgba(255,255,255,0.03))",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid " + level.border,
              borderRadius: "clamp(16px, 4vw, 20px)",
              padding: "clamp(24px, 7vw, 36px) clamp(20px, 5vw, 28px)",
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
              cursor: revealed ? "default" : "pointer",
              WebkitTapHighlightColor: "transparent",
              minHeight: "clamp(200px, 50vw, 260px)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
            }}
          >
            {/* 상단 프로그레스 바 */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 3,
              background: "rgba(255,255,255,0.05)", borderRadius: "20px 20px 0 0",
            }}>
              <motion.div
                animate={{ width: (progress * 100) + "%" }}
                transition={{ duration: 0.5, ease: "linear" }}
                style={{
                  height: "100%", borderRadius: "20px 20px 0 0",
                  background: "linear-gradient(90deg, " + level.color + ", " + level.color + "80)",
                }}
              />
            </div>

            {/* 수위 뱃지 */}
            <div style={{
              position: "absolute", top: 14, left: 16,
              display: "flex", alignItems: "center", gap: 5,
              background: level.bg,
              border: "1px solid " + level.border,
              borderRadius: 8, padding: "4px 10px",
            }}>
              <span style={{ fontSize: 13 }}>{level.emoji}</span>
              <span style={{
                fontSize: "clamp(10px, 2.5vw, 11px)",
                fontWeight: 600, color: level.color,
              }}>
                {level.label}
              </span>
            </div>

            {/* 동기화 표시 */}
            <div style={{
              position: "absolute", top: 16, right: 16,
              display: "flex", alignItems: "center", gap: 4,
              fontSize: "clamp(9px, 2.2vw, 10px)",
              color: "rgba(255,255,255,0.3)",
            }}>
              <Sparkles size={10} />
              모두 같은 질문
            </div>

            {/* 질문 내용 또는 스포일러 */}
            <AnimatePresence mode="wait">
              {!revealed ? (
                <motion.div
                  key="hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 16,
                  }}
                >
                  <div style={{
                    width: "clamp(56px, 15vw, 68px)", height: "clamp(56px, 15vw, 68px)",
                    borderRadius: 18,
                    background: level.bg,
                    border: "1px solid " + level.border,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Eye size={28} style={{ color: level.color }} />
                  </div>
                  <div style={{
                    fontSize: "clamp(15px, 4vw, 17px)",
                    fontWeight: 500, color: level.color,
                  }}>
                    탭해서 질문 확인하기
                  </div>
                  <div style={{
                    fontSize: "clamp(11px, 2.8vw, 12px)",
                    color: "rgba(255,255,255,0.3)",
                  }}>
                    {level.emoji} {level.label} 수위의 질문이에요
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="shown"
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 12,
                  }}
                >
                  <div style={{
                    width: "clamp(44px, 12vw, 52px)", height: "clamp(44px, 12vw, 52px)",
                    borderRadius: 14, margin: "0 auto",
                    background: level.bg,
                    border: "1px solid " + level.border,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <MessageCircle size={22} style={{ color: level.color }} />
                  </div>

                  <div style={{
                    fontSize: "clamp(16px, 4.5vw, 20px)",
                    fontWeight: 400, color: "#F5E6C8",
                    lineHeight: 1.7,
                    wordBreak: "keep-all",
                    fontFamily: "'Noto Serif KR', serif",
                    padding: "0 clamp(4px, 2vw, 12px)",
                  }}>
                    "{current.q}"
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* 카운트다운 */}
      <div style={{
        display: "flex", justifyContent: "center", marginTop: "clamp(14px, 4vw, 20px)",
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12, padding: "10px 18px",
        }}>
          <Clock size={14} style={{ color: "rgba(212,165,55,0.6)" }} />
          <span style={{
            fontSize: "clamp(18px, 5vw, 24px)", fontWeight: 300,
            color: "#D4A537",
            fontFamily: "'Noto Serif KR', serif",
            fontVariantNumeric: "tabular-nums",
          }}>
            {formatCountdown(secondsLeft)}
          </span>
          <span style={{
            fontSize: "clamp(10px, 2.5vw, 11px)",
            color: "rgba(255,255,255,0.3)",
          }}>
            후 다음 질문
          </span>
        </div>
      </div>

      {/* 팁 카드 */}
      <div style={{
        marginTop: "clamp(14px, 4vw, 20px)",
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "clamp(12px, 3.5vw, 16px)",
        padding: "clamp(12px, 3.5vw, 16px)",
      }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Flame size={14} style={{ color: "#D4A537", marginTop: 2, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: "clamp(11px, 2.8vw, 12px)", color: "#D4A537", fontWeight: 500, marginBottom: 6 }}>
              수위 안내
            </div>
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 8,
              fontSize: "clamp(10px, 2.5vw, 11px)",
            }}>
              {Object.entries(LEVEL_INFO).map(([key, info]) => (
                <span key={key} style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  background: info.bg, border: "1px solid " + info.border,
                  borderRadius: 6, padding: "3px 8px", color: info.color,
                }}>
                  {info.emoji} {info.label}
                </span>
              ))}
            </div>
            <div style={{
              fontSize: "clamp(10px, 2.5vw, 11px)",
              color: "rgba(255,255,255,0.3)", marginTop: 8, lineHeight: 1.6,
            }}>
              모든 사람이 같은 질문을 보고 있어요. 옆 사람에게 보여주며 대화를 시작해 보세요!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}