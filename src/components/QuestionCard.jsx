import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Sparkles, MessageCircle } from "lucide-react";

const QUESTIONS = [
  "내 옆 사람이 오늘 시킨 술과 가장 어울리는 별명을 지어준다면?",
  "만약 지금 흐르는 노래의 주인공이 된다면, 당신은 어떤 장면 속에 있나요?",
  "옆 사람의 첫인상을 딱 세 글자로 표현해 본다면?",
  "오늘 하루 중 가장 '맛있었던' 순간은 언제인가요?",
  "지금 마시고 있는 술을 영화 제목으로 바꾼다면?",
  "인생에서 가장 기억에 남는 건배 순간은?",
  "타임머신이 있다면, 몇 살의 나에게 술 한 잔 사주고 싶나요?",
  "오늘의 기분을 칵테일로 만든다면 어떤 맛일까요?",
  "당신의 인생 술집은 어떤 분위기인가요?",
  "지금 이 자리에 데려오고 싶은 사람이 있다면?",
  "술자리에서 절대 하지 않는 나만의 규칙이 있나요?",
  "처음 술을 마셔본 날, 어떤 술이었나요?",
  "혼자 마시는 술이 좋은 이유 한 가지만 말한다면?",
  "오늘 나에게 수고했다고 말해주고 싶은 부분은?",
  "지금 옆 사람에게 궁금한 점 하나만 고른다면?",
  "당신이 바텐더라면 시그니처 칵테일 이름은 뭘로 짓겠어요?",
  "오늘 하루를 한 잔의 술에 비유한다면?",
  "가장 기억에 남는 여행지에서 마신 술은?",
  "술자리에서 갑자기 노래방을 간다면 첫 곡은?",
  "인생 최고의 안주는 뭐라고 생각하세요?",
  "옆 사람이 좋아할 것 같은 술을 추측해 본다면?",
  "10년 후의 나는 어떤 술을 마시고 있을까요?",
  "솔직히, 오늘 여기 오기 전에 뭘 하고 있었어요?",
  "당신만의 스트레스 해소법은 뭔가요?",
  "이 바의 사장님에게 하고 싶은 말 한마디?",
  "지금 이 순간을 사진으로 찍는다면 제목은?",
  "가장 최근에 웃겼던 일이 뭐예요?",
  "술 마시면 꼭 하게 되는 습관이 있나요?",
  "내일 아침 일어나면 제일 먼저 할 일은?",
  "당신의 주량을 동물로 표현한다면?",
  "요즘 빠져있는 취미가 있나요?",
  "인생에서 가장 용감했던 순간은 언제였어요?",
  "혼술할 때 꼭 듣는 플레이리스트가 있나요?",
  "오늘 가장 감사했던 순간은?",
  "만약 이 바에서 하루 살 수 있다면 뭘 하겠어요?",
  "당신의 MBTI를 술로 표현하면?",
  "가장 좋아하는 계절과 그 계절에 어울리는 술은?",
  "오늘 밤 꿈에 나왔으면 하는 장소는?",
  "지금 옆 사람과 공통점이 있을 것 같은 게 뭘까요?",
  "인생 좌우명을 안주 이름으로 바꾼다면?",
  "가장 최근에 본 영화나 드라마는 뭐예요?",
  "술자리에서 가장 매력적인 사람의 특징은?",
  "지금 이 노래 가사 중 마음에 와닿는 한 줄이 있다면?",
  "당신이 칵테일이라면 어떤 재료가 들어갈까요?",
  "가장 좋아하는 시간대는 언제인가요?",
  "만약 내일이 마지막 날이라면, 마지막 한 잔은?",
  "최근에 누군가에게 받은 칭찬이 있나요?",
  "당신만의 작은 사치는 뭔가요?",
  "어렸을 때 꿈꿨던 직업은 뭐였어요?",
  "지금 가장 보고 싶은 사람은 누구인가요?",
  "이 바의 분위기를 색깔로 표현한다면?",
  "최근에 새로 도전해 본 것이 있나요?",
  "당신의 하루를 뮤지컬로 만든다면 제목은?",
  "가장 좋아하는 날씨와 그 이유는?",
  "혼자만의 시간에 꼭 하는 일이 있나요?",
  "옆 사람에게 추천하고 싶은 노래 한 곡은?",
  "인생에서 가장 맛있었던 한 끼는?",
  "만약 슈퍼파워 하나를 가질 수 있다면?",
  "당신의 일주일 중 가장 좋아하는 요일은?",
  "최근에 울었던 적이 있다면 어떤 이유였나요?",
  "지금 이 자리를 한 단어로 표현한다면?",
  "가장 오래 사귄 친구와의 추억 하나는?",
  "당신의 버킷리스트 중 하나를 공개한다면?",
  "오늘 가장 많이 한 생각은 뭐예요?",
  "술을 처음 좋아하게 된 계기가 있나요?",
  "당신이 바를 차린다면 어떤 컨셉으로 할 거예요?",
  "최근에 자신에게 한 가장 좋은 선택은?",
  "지금 이 순간 감사한 것 세 가지는?",
  "옆 사람의 오늘 하루가 어땠을 것 같나요?",
  "당신의 인생 영화 한 편을 고른다면?",
  "가장 기억에 남는 생일은 언제였어요?",
  "만약 다른 나라에서 한 달 살 수 있다면 어디로?",
  "당신의 아침 루틴은 어떻게 되나요?",
  "최근에 가장 몰입했던 순간은 언제예요?",
  "이 바에 단골이 된다면 나만의 시그니처 주문은?",
  "가장 좋아하는 냄새는 뭔가요?",
  "당신의 올해 키워드를 하나 정한다면?",
  "지금 가장 배우고 싶은 것은?",
  "옆 사람이 어떤 일을 하는지 추측해 본다면?",
  "인생에서 다시 돌아가고 싶은 순간이 있나요?",
  "당신의 소울푸드는 뭔가요?",
  "가장 최근에 받은 선물은 뭐예요?",
  "만약 오늘 밤 별똥별을 본다면 무슨 소원을?",
  "당신이 가장 좋아하는 단어는?",
  "최근에 용기를 냈던 순간이 있나요?",
  "지금 기분을 이모지 하나로 표현한다면?",
  "가장 좋아하는 거리나 동네는 어디예요?",
  "당신의 인생 노래 한 곡은?",
  "오늘 하루 중 나를 웃게 한 것은?",
  "만약 한 가지 요리를 완벽하게 할 수 있다면?",
  "당신이 생각하는 완벽한 주말은?",
  "지금 옆 사람에게 해주고 싶은 한마디는?",
  "가장 좋아하는 향수나 향이 있나요?",
  "최근에 나를 성장시킨 경험은?",
  "이 바에서 가장 마음에 드는 것은?",
  "당신의 잠들기 전 루틴은?",
  "만약 동물로 태어난다면 어떤 동물로?",
  "오늘 나에게 건배사를 한다면 뭐라고?",
  "가장 최근에 고마웠던 사람은 누구예요?",
  "당신의 인생 맛집 한 곳을 추천한다면?",
  "지금 이 바의 BGM을 바꿀 수 있다면 어떤 노래로?",
];

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

  useEffect(() => {
    const timer = setInterval(() => {
      const left = getTimeLeft();
      setSecondsLeft(left);

      const newIdx = getQuestionIndex(Date.now());
      if (newIdx !== questionIdx) {
        setQuestionIdx(newIdx);
        setFlipKey(prev => prev + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [questionIdx]);

  const question = QUESTIONS[questionIdx];
  const progress = 1 - secondsLeft / 600;

  return (
    <div style={{ padding: "0 clamp(16px, 4vw, 24px)", paddingTop: 16 }}>
      <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "rgba(212,165,55,0.5)", marginBottom: 6 }}>
        ICE BREAKER
      </div>
      <div style={{
        fontSize: "clamp(18px, 5vw, 22px)", fontWeight: 300, color: "#F5E6C8",
        fontFamily: "'Cormorant Garamond', serif", marginBottom: "clamp(16px, 5vw, 24px)",
      }}>
        지금 이 질문, 같이 얘기해 볼까요?
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
          <div style={{
            background: "linear-gradient(145deg, rgba(212,165,55,0.08), rgba(255,255,255,0.03))",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(212,165,55,0.15)",
            borderRadius: "clamp(16px, 4vw, 20px)",
            padding: "clamp(24px, 7vw, 36px) clamp(20px, 5vw, 28px)",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 3,
              background: "rgba(255,255,255,0.05)", borderRadius: "20px 20px 0 0",
            }}>
              <motion.div
                animate={{ width: (progress * 100) + "%" }}
                transition={{ duration: 0.5, ease: "linear" }}
                style={{
                  height: "100%", borderRadius: "20px 20px 0 0",
                  background: "linear-gradient(90deg, #D4A537, #B8860B)",
                }}
              />
            </div>

            <div style={{
              position: "absolute", top: 16, right: 20,
              display: "flex", alignItems: "center", gap: 4,
              fontSize: "clamp(9px, 2.5vw, 11px)",
              color: "rgba(212,165,55,0.5)",
            }}>
              <Sparkles size={12} />
              모두에게 같은 질문
            </div>

            <div style={{
              width: "clamp(48px, 13vw, 60px)", height: "clamp(48px, 13vw, 60px)",
              borderRadius: 16, margin: "0 auto clamp(16px, 5vw, 24px)",
              background: "rgba(212,165,55,0.1)",
              border: "1px solid rgba(212,165,55,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <MessageCircle size={24} style={{ color: "#D4A537" }} />
            </div>

            <div style={{
              fontSize: "clamp(16px, 4.5vw, 20px)",
              fontWeight: 400, color: "#F5E6C8",
              lineHeight: 1.7, marginBottom: "clamp(20px, 6vw, 28px)",
              wordBreak: "keep-all",
              fontFamily: "'Cormorant Garamond', serif",
            }}>
              "{question}"
            </div>

            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12, padding: "10px 16px",
            }}>
              <Clock size={14} style={{ color: "rgba(212,165,55,0.6)" }} />
              <span style={{
                fontSize: "clamp(18px, 5vw, 24px)", fontWeight: 300,
                color: "#D4A537",
                fontFamily: "'Cormorant Garamond', serif",
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
        </motion.div>
      </AnimatePresence>

      <div style={{
        marginTop: "clamp(16px, 5vw, 24px)",
        display: "flex", flexDirection: "column", gap: 8,
      }}>
        <div style={{
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "clamp(12px, 3.5vw, 16px)",
          padding: "clamp(12px, 3.5vw, 16px)",
        }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Sparkles size={14} style={{ color: "#D4A537", marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: "clamp(11px, 2.8vw, 12px)", color: "#D4A537", fontWeight: 500, marginBottom: 4 }}>
                이렇게 활용해 보세요
              </div>
              <div style={{ fontSize: "clamp(11px, 2.8vw, 12px)", color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>
                옆 사람에게 이 질문을 보여주면서 자연스럽게 대화를 시작해 보세요.
                지금 바에 있는 모든 사람이 같은 질문을 보고 있어요!
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}