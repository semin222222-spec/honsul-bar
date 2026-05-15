/**
 * 이구동성 플러팅 게임 질문 데이터
 *
 * 각 라운드마다 30개씩, 총 150개
 * - R1, R2: 평범 (취향 알아가기)
 * - R3: 🍒 19금 레벨 1 (살짝 두근)
 * - R4: 💋 19금 레벨 2 (살짝 야함)
 * - R5: 🔥 19금 레벨 3 (자극)
 *
 * 매 게임마다 라운드별로 랜덤 1개씩 선택됩니다.
 */

// ────────────────────────────────────────────
// R1: 평범 - 취향/일상 (30개)
// ────────────────────────────────────────────
export const QUESTIONS_R1 = [
  {
    text: "데이트 장소로 더 좋은 곳은?",
    a: { emoji: "🌊", text: "바다" },
    b: { emoji: "🌃", text: "야경" },
  },
  {
    text: "데이트 음식은?",
    a: { emoji: "🍕", text: "양식" },
    b: { emoji: "🍜", text: "한식" },
  },
  {
    text: "휴일에 더 끌리는 건?",
    a: { emoji: "🏡", text: "집콕" },
    b: { emoji: "🚗", text: "여행" },
  },
  {
    text: "더 좋아하는 동물은?",
    a: { emoji: "🐱", text: "고양이" },
    b: { emoji: "🐶", text: "강아지" },
  },
  {
    text: "카페에서 마실 거?",
    a: { emoji: "☕", text: "아메리카노" },
    b: { emoji: "🍵", text: "라떼" },
  },
  {
    text: "영화 vs 드라마?",
    a: { emoji: "🎬", text: "영화" },
    b: { emoji: "📺", text: "드라마" },
  },
  {
    text: "산 vs 바다?",
    a: { emoji: "⛰️", text: "산" },
    b: { emoji: "🌊", text: "바다" },
  },
  {
    text: "단 거 vs 매운 거?",
    a: { emoji: "🍰", text: "단 거" },
    b: { emoji: "🌶️", text: "매운 거" },
  },
  {
    text: "더 좋아하는 계절은?",
    a: { emoji: "🌸", text: "봄" },
    b: { emoji: "🍁", text: "가을" },
  },
  {
    text: "운전 vs 대중교통?",
    a: { emoji: "🚗", text: "운전" },
    b: { emoji: "🚇", text: "대중교통" },
  },
  {
    text: "아침형 vs 저녁형?",
    a: { emoji: "☀️", text: "아침형" },
    b: { emoji: "🌙", text: "저녁형" },
  },
  {
    text: "여행 스타일은?",
    a: { emoji: "📋", text: "계획형" },
    b: { emoji: "🎲", text: "즉흥형" },
  },
  {
    text: "주말에 더 끌리는 건?",
    a: { emoji: "🎉", text: "친구들과" },
    b: { emoji: "😌", text: "혼자만의 시간" },
  },
  {
    text: "에어컨 온도는?",
    a: { emoji: "🥶", text: "엄청 시원하게" },
    b: { emoji: "🌡️", text: "적당히" },
  },
  {
    text: "여름 휴가 스타일?",
    a: { emoji: "🏖️", text: "리조트" },
    b: { emoji: "🎒", text: "배낭여행" },
  },
  {
    text: "더 좋아하는 운동은?",
    a: { emoji: "💪", text: "헬스" },
    b: { emoji: "🏃", text: "러닝" },
  },
  {
    text: "공포영화 어떻게?",
    a: { emoji: "😱", text: "혼자 못 봄" },
    b: { emoji: "😎", text: "엄청 좋아함" },
  },
  {
    text: "패션 스타일?",
    a: { emoji: "👔", text: "깔끔하게" },
    b: { emoji: "🧢", text: "편하게" },
  },
  {
    text: "음악 들을 때 더 좋은 건?",
    a: { emoji: "🎧", text: "발라드" },
    b: { emoji: "🎸", text: "신나는 곡" },
  },
  {
    text: "주문할 때 더 자주 하는 건?",
    a: { emoji: "🥡", text: "배달" },
    b: { emoji: "👨‍🍳", text: "직접 요리" },
  },
  {
    text: "여행지 선택은?",
    a: { emoji: "🌏", text: "해외" },
    b: { emoji: "🗾", text: "국내" },
  },
  {
    text: "친구 만날 때 더 좋은 건?",
    a: { emoji: "👥", text: "여럿이 우르르" },
    b: { emoji: "👫", text: "둘만의 시간" },
  },
  {
    text: "쇼핑 스타일?",
    a: { emoji: "🏬", text: "오프라인" },
    b: { emoji: "📱", text: "온라인" },
  },
  {
    text: "선물 받는다면?",
    a: { emoji: "💝", text: "예쁜 거" },
    b: { emoji: "💵", text: "실용적인 거" },
  },
  {
    text: "잠들기 전 마지막은?",
    a: { emoji: "📱", text: "폰" },
    b: { emoji: "📖", text: "책" },
  },
  {
    text: "MBTI 첫 글자는?",
    a: { emoji: "🗣️", text: "E (외향)" },
    b: { emoji: "🤫", text: "I (내향)" },
  },
  {
    text: "감자튀김 vs 양념감자?",
    a: { emoji: "🍟", text: "감자튀김" },
    b: { emoji: "🥔", text: "양념감자" },
  },
  {
    text: "맥주 vs 소주?",
    a: { emoji: "🍺", text: "맥주" },
    b: { emoji: "🍶", text: "소주" },
  },
  {
    text: "여행 갈 때 더 중요한 건?",
    a: { emoji: "🍽️", text: "맛집" },
    b: { emoji: "📸", text: "사진 명소" },
  },
  {
    text: "고민 있을 때 어떻게?",
    a: { emoji: "💬", text: "친구한테 털어놓기" },
    b: { emoji: "🧘", text: "혼자 정리" },
  },
];

// ────────────────────────────────────────────
// R2: 평범 - 연애 가치관 입문 (30개)
// ────────────────────────────────────────────
export const QUESTIONS_R2 = [
  {
    text: "연인에게 더 중요한 건?",
    a: { emoji: "😊", text: "성격" },
    b: { emoji: "✨", text: "외모" },
  },
  {
    text: "썸 탈 때 더 끌리는 건?",
    a: { emoji: "😏", text: "밀당하는 사람" },
    b: { emoji: "💕", text: "직진하는 사람" },
  },
  {
    text: "데이트 비용은?",
    a: { emoji: "💑", text: "더치페이" },
    b: { emoji: "🎁", text: "번갈아가며" },
  },
  {
    text: "연락 빈도는?",
    a: { emoji: "📱", text: "수시로" },
    b: { emoji: "🕐", text: "적당히" },
  },
  {
    text: "기념일 챙기는 스타일?",
    a: { emoji: "📅", text: "꼼꼼하게" },
    b: { emoji: "🎲", text: "그때그때" },
  },
  {
    text: "고백은 누가?",
    a: { emoji: "💪", text: "내가 먼저" },
    b: { emoji: "🥰", text: "받는 게 좋아" },
  },
  {
    text: "이상형 첫인상?",
    a: { emoji: "👀", text: "눈빛" },
    b: { emoji: "😊", text: "미소" },
  },
  {
    text: "연인과 더 좋은 여행은?",
    a: { emoji: "🏖️", text: "조용한 휴양지" },
    b: { emoji: "🎢", text: "신나는 도시" },
  },
  {
    text: "사랑 표현은?",
    a: { emoji: "🗣️", text: "말로 자주" },
    b: { emoji: "🎁", text: "행동으로" },
  },
  {
    text: "연인이 친구 많은 거?",
    a: { emoji: "👍", text: "좋아" },
    b: { emoji: "😬", text: "조금 불안" },
  },
  {
    text: "다툼 후 어떻게?",
    a: { emoji: "💬", text: "바로 풀기" },
    b: { emoji: "🧊", text: "혼자 생각" },
  },
  {
    text: "데이트 코스는?",
    a: { emoji: "🎬", text: "영화 + 식사" },
    b: { emoji: "🚶", text: "산책 + 카페" },
  },
  {
    text: "연인 SNS 어때?",
    a: { emoji: "📸", text: "같이 올리기" },
    b: { emoji: "🔒", text: "비공개" },
  },
  {
    text: "연인 옷 스타일은?",
    a: { emoji: "🤵", text: "깔끔한 정장" },
    b: { emoji: "🧥", text: "편한 캐주얼" },
  },
  {
    text: "기념일 선물 더 좋은 건?",
    a: { emoji: "💐", text: "정성 가득 편지" },
    b: { emoji: "💎", text: "비싸고 좋은 거" },
  },
  {
    text: "데이트 더 좋은 시간은?",
    a: { emoji: "☀️", text: "낮 데이트" },
    b: { emoji: "🌙", text: "밤 데이트" },
  },
  {
    text: "연인과 더 좋은 활동은?",
    a: { emoji: "🍳", text: "같이 요리" },
    b: { emoji: "🎮", text: "같이 게임" },
  },
  {
    text: "연인 직업 어떤 게 좋아?",
    a: { emoji: "💼", text: "안정적인 직장인" },
    b: { emoji: "🎨", text: "창의적인 일" },
  },
  {
    text: "감정 표현 스타일?",
    a: { emoji: "💖", text: "솔직하게" },
    b: { emoji: "🎭", text: "은근하게" },
  },
  {
    text: "사귀고 처음 1년?",
    a: { emoji: "🌟", text: "매일 만나고 싶어" },
    b: { emoji: "💆", text: "각자 시간도 중요" },
  },
  {
    text: "연인이 늦으면?",
    a: { emoji: "📞", text: "전화로 확인" },
    b: { emoji: "😌", text: "기다림" },
  },
  {
    text: "연인 이상형은?",
    a: { emoji: "🤓", text: "지적인 사람" },
    b: { emoji: "😄", text: "유머러스한 사람" },
  },
  {
    text: "데이트 더 좋은 음식점?",
    a: { emoji: "🍣", text: "분위기 좋은 곳" },
    b: { emoji: "🍖", text: "맛집 위주" },
  },
  {
    text: "특별한 날 더 좋은 건?",
    a: { emoji: "🎂", text: "이벤트 챙기기" },
    b: { emoji: "🥂", text: "평소처럼 함께" },
  },
  {
    text: "연인과 데이트 추억은?",
    a: { emoji: "📷", text: "사진으로 남기기" },
    b: { emoji: "🧠", text: "기억으로만" },
  },
  {
    text: "연인 좋아하는 타입?",
    a: { emoji: "🥰", text: "애교 많은" },
    b: { emoji: "💎", text: "차분한" },
  },
  {
    text: "사랑한다고 말하기?",
    a: { emoji: "❤️", text: "자주 표현" },
    b: { emoji: "😉", text: "결정적 순간에만" },
  },
  {
    text: "연인의 과거?",
    a: { emoji: "🤐", text: "안 궁금" },
    b: { emoji: "🔍", text: "조금 궁금" },
  },
  {
    text: "연인과 카페에서?",
    a: { emoji: "💬", text: "대화 폭발" },
    b: { emoji: "📚", text: "각자 책/폰" },
  },
  {
    text: "연인의 시간이 부족할 때?",
    a: { emoji: "😢", text: "서운함" },
    b: { emoji: "👍", text: "이해함" },
  },
];

// ────────────────────────────────────────────
// R3: 🍒 19금 레벨 1 - 살짝 두근 (30개)
// ────────────────────────────────────────────
export const QUESTIONS_R3 = [
  {
    text: "첫 키스의 장소로 더 좋은 곳은?",
    a: { emoji: "🌃", text: "야경 보이는 곳" },
    b: { emoji: "🌊", text: "바닷가" },
  },
  {
    text: "고백 받는다면 어떻게?",
    a: { emoji: "💌", text: "깜짝 이벤트" },
    b: { emoji: "🍷", text: "와인 한 잔과" },
  },
  {
    text: "썸 탈 때 더 끌리는 타입은?",
    a: { emoji: "😏", text: "밀당 잘하는 사람" },
    b: { emoji: "💕", text: "직진하는 사람" },
  },
  {
    text: "스킨십 시작은?",
    a: { emoji: "🤝", text: "손 잡기" },
    b: { emoji: "🫂", text: "어깨 기대기" },
  },
  {
    text: "더 끌리는 매력은?",
    a: { emoji: "💪", text: "단단한 어깨" },
    b: { emoji: "👀", text: "깊은 눈빛" },
  },
  {
    text: "데이트 끝나고 더 좋은 건?",
    a: { emoji: "🤗", text: "꼭 안아주기" },
    b: { emoji: "💋", text: "이마에 뽀뽀" },
  },
  {
    text: "마음에 드는 사람에게?",
    a: { emoji: "📱", text: "은근슬쩍 연락" },
    b: { emoji: "🔥", text: "대놓고 표현" },
  },
  {
    text: "더 좋은 첫 데이트는?",
    a: { emoji: "🍷", text: "와인바" },
    b: { emoji: "🎢", text: "놀이공원" },
  },
  {
    text: "사귀기 전 더 두근한 순간?",
    a: { emoji: "💬", text: "밤늦게 톡" },
    b: { emoji: "🚶", text: "둘이서 산책" },
  },
  {
    text: "고백할 때 더 좋은 분위기?",
    a: { emoji: "🌅", text: "노을 질 때" },
    b: { emoji: "✨", text: "별이 보일 때" },
  },
  {
    text: "연인 사이 더 설레는 건?",
    a: { emoji: "🥰", text: "이름 부를 때" },
    b: { emoji: "😘", text: "애칭 부를 때" },
  },
  {
    text: "내 매력 포인트는?",
    a: { emoji: "🎤", text: "목소리" },
    b: { emoji: "👁️", text: "눈빛" },
  },
  {
    text: "사랑에 빠질 때 더 빨리?",
    a: { emoji: "👀", text: "눈빛에 빠짐" },
    b: { emoji: "🗣️", text: "말투에 빠짐" },
  },
  {
    text: "더 좋은 두 번째 데이트는?",
    a: { emoji: "🛋️", text: "집에서 영화" },
    b: { emoji: "🌃", text: "야경 데이트" },
  },
  {
    text: "더 좋은 데이트 룩은?",
    a: { emoji: "👗", text: "원피스" },
    b: { emoji: "👖", text: "청바지" },
  },
  {
    text: "마음 통하는 순간?",
    a: { emoji: "🤣", text: "같이 웃을 때" },
    b: { emoji: "🤐", text: "같이 침묵할 때" },
  },
  {
    text: "데이트 중 가장 두근한 건?",
    a: { emoji: "👀", text: "눈 마주칠 때" },
    b: { emoji: "✋", text: "손이 닿을 때" },
  },
  {
    text: "더 끌리는 향기는?",
    a: { emoji: "🌸", text: "달콤한 향" },
    b: { emoji: "🌲", text: "시원한 향" },
  },
  {
    text: "연인이 더 매력적일 때?",
    a: { emoji: "💼", text: "일할 때 진지함" },
    b: { emoji: "😂", text: "장난칠 때" },
  },
  {
    text: "취하면 더 끌리는 행동?",
    a: { emoji: "🥺", text: "귀여워짐" },
    b: { emoji: "😈", text: "도발적임" },
  },
  {
    text: "이성에게 더 끌리는 부분?",
    a: { emoji: "🦴", text: "쇄골" },
    b: { emoji: "🖐️", text: "손" },
  },
  {
    text: "더 좋은 영화 데이트는?",
    a: { emoji: "💑", text: "팔짱 끼고" },
    b: { emoji: "🫳", text: "손 잡고" },
  },
  {
    text: "연인이 자기 어깨에 기댄다면?",
    a: { emoji: "🥰", text: "꼭 안아줌" },
    b: { emoji: "💋", text: "정수리 키스" },
  },
  {
    text: "더 끌리는 표정은?",
    a: { emoji: "😌", text: "차분한 미소" },
    b: { emoji: "🤭", text: "장난기 가득" },
  },
  {
    text: "전화 vs 영상통화?",
    a: { emoji: "📞", text: "목소리만" },
    b: { emoji: "📹", text: "얼굴 보면서" },
  },
  {
    text: "더 두근한 데이트 시간은?",
    a: { emoji: "🌆", text: "해질녘" },
    b: { emoji: "🌜", text: "한밤중" },
  },
  {
    text: "더 끌리는 분위기?",
    a: { emoji: "🕯️", text: "촛불 켠 곳" },
    b: { emoji: "🌟", text: "별 보이는 곳" },
  },
  {
    text: "끌리는 사람과 첫 만남?",
    a: { emoji: "☕", text: "조용한 카페" },
    b: { emoji: "🍻", text: "활기찬 술집" },
  },
  {
    text: "썸 탈 때 더 좋은 건?",
    a: { emoji: "❓", text: "긴장감" },
    b: { emoji: "😌", text: "편안함" },
  },
  {
    text: "더 좋아하는 손깍지는?",
    a: { emoji: "🤝", text: "꽉 잡기" },
    b: { emoji: "🫳", text: "살며시" },
  },
];

// ────────────────────────────────────────────
// R4: 💋 19금 레벨 2 - 살짝 야함 (30개)
// ────────────────────────────────────────────
export const QUESTIONS_R4 = [
  {
    text: "오늘 분위기 좋은데 다음은?",
    a: { emoji: "🏨", text: "호텔 바" },
    b: { emoji: "🏠", text: "우리집" },
  },
  {
    text: "가장 매력적인 신체 부위는?",
    a: { emoji: "👁️", text: "눈빛" },
    b: { emoji: "💋", text: "입술" },
  },
  {
    text: "연인과 자는 방식은?",
    a: { emoji: "🤗", text: "꼭 안고" },
    b: { emoji: "😌", text: "손만 잡고" },
  },
  {
    text: "지금 끌리는 사람과 한다면?",
    a: { emoji: "😘", text: "가벼운 키스" },
    b: { emoji: "🔥", text: "진한 키스" },
  },
  {
    text: "잠들기 전 마지막은?",
    a: { emoji: "💬", text: "굿나잇 톡" },
    b: { emoji: "📞", text: "통화" },
  },
  {
    text: "연인의 더 섹시한 매력?",
    a: { emoji: "🎤", text: "낮은 목소리" },
    b: { emoji: "👁️", text: "강렬한 눈빛" },
  },
  {
    text: "끌리는 사람의 향기?",
    a: { emoji: "🌹", text: "달콤한" },
    b: { emoji: "🌿", text: "시원한" },
  },
  {
    text: "더 야한 옷차림은?",
    a: { emoji: "👗", text: "오프숄더" },
    b: { emoji: "🧥", text: "타이트한 옷" },
  },
  {
    text: "키스할 때 더 좋은 분위기?",
    a: { emoji: "🌧️", text: "비 오는 날" },
    b: { emoji: "✨", text: "달빛 아래" },
  },
  {
    text: "잘 자라고 인사할 때?",
    a: { emoji: "💋", text: "입술에 뽀뽀" },
    b: { emoji: "🤗", text: "꼭 안기" },
  },
  {
    text: "연인이 더 매력적일 때?",
    a: { emoji: "🚿", text: "샤워 후 젖은 머리" },
    b: { emoji: "🛏️", text: "막 깨어났을 때" },
  },
  {
    text: "더 두근한 스킨십은?",
    a: { emoji: "🤚", text: "허리 감기" },
    b: { emoji: "💆", text: "머리 쓰다듬기" },
  },
  {
    text: "끌리는 사람의 행동?",
    a: { emoji: "🥺", text: "내 어깨에 기대기" },
    b: { emoji: "😏", text: "내 눈을 빤히 보기" },
  },
  {
    text: "더 야한 분위기는?",
    a: { emoji: "🍷", text: "와인 한 잔" },
    b: { emoji: "🛁", text: "거품 목욕" },
  },
  {
    text: "이상형이 더 좋은 매력?",
    a: { emoji: "🕴️", text: "어른스러운 매력" },
    b: { emoji: "😇", text: "순수한 매력" },
  },
  {
    text: "끌리는 사람의 손?",
    a: { emoji: "🫳", text: "큰 손" },
    b: { emoji: "✋", text: "예쁜 손" },
  },
  {
    text: "더 좋은 굿모닝 인사?",
    a: { emoji: "💋", text: "이마 키스" },
    b: { emoji: "🤗", text: "백허그" },
  },
  {
    text: "데이트 후 헤어질 때?",
    a: { emoji: "🚪", text: "집 앞까지 데려다 줌" },
    b: { emoji: "💕", text: "더 못 떠나게 잡기" },
  },
  {
    text: "취하면 더 매력적인 건?",
    a: { emoji: "🥰", text: "애교 많아짐" },
    b: { emoji: "💋", text: "스킨십 많아짐" },
  },
  {
    text: "야한 영화 보러 갈 때?",
    a: { emoji: "👫", text: "둘이 비밀스럽게" },
    b: { emoji: "🛋️", text: "집에서 같이" },
  },
  {
    text: "헤어질 때 마지막은?",
    a: { emoji: "💋", text: "긴 키스" },
    b: { emoji: "🤗", text: "긴 포옹" },
  },
  {
    text: "다음 데이트 더 끌리는 건?",
    a: { emoji: "🏨", text: "분위기 좋은 호텔 라운지" },
    b: { emoji: "🌃", text: "야경 보이는 옥상" },
  },
  {
    text: "연인과 더 좋은 침구는?",
    a: { emoji: "🛏️", text: "큰 침대 따로" },
    b: { emoji: "🤗", text: "작아도 같이" },
  },
  {
    text: "더 끌리는 옷 벗는 모습?",
    a: { emoji: "👔", text: "셔츠 단추 푸는 모습" },
    b: { emoji: "👗", text: "지퍼 내리는 모습" },
  },
  {
    text: "유혹할 때 더 좋은 방법은?",
    a: { emoji: "👀", text: "눈빛으로" },
    b: { emoji: "🗣️", text: "말로" },
  },
  {
    text: "연인이 자기 무릎에 누우면?",
    a: { emoji: "💆", text: "머리 쓰다듬기" },
    b: { emoji: "💋", text: "이마에 키스" },
  },
  {
    text: "더 야한 잠옷은?",
    a: { emoji: "👕", text: "큰 셔츠만" },
    b: { emoji: "🩲", text: "슬립" },
  },
  {
    text: "연인과 더 좋은 샤워는?",
    a: { emoji: "🚿", text: "각자 따로" },
    b: { emoji: "💑", text: "같이 하기" },
  },
  {
    text: "끌리는 사람과 단둘이?",
    a: { emoji: "🛋️", text: "소파에서 영화" },
    b: { emoji: "🛏️", text: "침대에서 수다" },
  },
  {
    text: "분위기 좋은 밤, 마지막은?",
    a: { emoji: "💋", text: "긴 키스" },
    b: { emoji: "🔥", text: "그 이상" },
  },
];

// ────────────────────────────────────────────
// R5: 🔥 19금 레벨 3 - 자극 (30개)
// ────────────────────────────────────────────
export const QUESTIONS_R5 = [
  {
    text: "오늘 밤 끝나고...?",
    a: { emoji: "🚖", text: "혼자 집에" },
    b: { emoji: "💑", text: "같이 한잔 더" },
  },
  {
    text: "침대에서 더 좋아하는 건?",
    a: { emoji: "😈", text: "리드하기" },
    b: { emoji: "😇", text: "리드 당하기" },
  },
  {
    text: "끌리는 사람과 가장 하고 싶은 건?",
    a: { emoji: "🍷", text: "와인 한 잔 더" },
    b: { emoji: "🛁", text: "같이 샤워" },
  },
  {
    text: "잠자리에서 더 좋아하는 건?",
    a: { emoji: "🕯️", text: "분위기 잡고" },
    b: { emoji: "🔥", text: "거칠게" },
  },
  {
    text: "오늘 밤 진하게 가는 건?",
    a: { emoji: "👍", text: "찬성" },
    b: { emoji: "😏", text: "분위기 봐서" },
  },
  {
    text: "끌리는 사람과 첫 밤?",
    a: { emoji: "🌙", text: "천천히" },
    b: { emoji: "⚡", text: "강렬하게" },
  },
  {
    text: "잠자리 분위기는?",
    a: { emoji: "🕯️", text: "은은한 조명" },
    b: { emoji: "🌑", text: "완전 어둡게" },
  },
  {
    text: "더 자극적인 건?",
    a: { emoji: "👀", text: "보는 것" },
    b: { emoji: "✋", text: "닿는 것" },
  },
  {
    text: "연인과 더 좋은 잠자리는?",
    a: { emoji: "🤗", text: "오래 안고" },
    b: { emoji: "🔥", text: "뜨겁게" },
  },
  {
    text: "유혹의 절정은?",
    a: { emoji: "🥃", text: "분위기 잡힌 술자리" },
    b: { emoji: "🛏️", text: "둘만의 공간" },
  },
  {
    text: "스킨십할 때 더 끌리는 건?",
    a: { emoji: "💋", text: "목덜미 키스" },
    b: { emoji: "🫦", text: "귓가 속삭임" },
  },
  {
    text: "은밀한 곳 키스는?",
    a: { emoji: "🦴", text: "쇄골" },
    b: { emoji: "🫦", text: "귓불" },
  },
  {
    text: "오늘 밤 더 좋은 곳은?",
    a: { emoji: "🏨", text: "호텔" },
    b: { emoji: "🏠", text: "내 방" },
  },
  {
    text: "더 자극적인 잠옷?",
    a: { emoji: "👗", text: "슬립 한 장" },
    b: { emoji: "👕", text: "남친 셔츠만" },
  },
  {
    text: "사랑할 때 더 끌리는 건?",
    a: { emoji: "💋", text: "긴 키스" },
    b: { emoji: "🤚", text: "온몸 애무" },
  },
  {
    text: "다음 단계로 가는 신호는?",
    a: { emoji: "👀", text: "강렬한 눈빛" },
    b: { emoji: "🫳", text: "허벅지에 손" },
  },
  {
    text: "더 야한 시츄에이션은?",
    a: { emoji: "🚿", text: "샤워 직후" },
    b: { emoji: "🛏️", text: "막 잠에서 깬 후" },
  },
  {
    text: "오늘 밤 자고 갈래?",
    a: { emoji: "✅", text: "당연하지" },
    b: { emoji: "😏", text: "기다려봐" },
  },
  {
    text: "사랑할 때 더 좋은 자세?",
    a: { emoji: "👀", text: "마주보고" },
    b: { emoji: "🤗", text: "뒤에서 안고" },
  },
  {
    text: "잠자리 후 더 좋은 건?",
    a: { emoji: "🤗", text: "꼭 안고 자기" },
    b: { emoji: "🚿", text: "같이 샤워" },
  },
  {
    text: "연인이 더 야할 때?",
    a: { emoji: "🤫", text: "참는 모습" },
    b: { emoji: "🔥", text: "안 참는 모습" },
  },
  {
    text: "끌리는 사람의 신음?",
    a: { emoji: "🤐", text: "조용한 타입" },
    b: { emoji: "🔊", text: "솔직한 타입" },
  },
  {
    text: "잠자리 시간대는?",
    a: { emoji: "🌅", text: "아침형" },
    b: { emoji: "🌃", text: "밤형" },
  },
  {
    text: "더 야한 행동은?",
    a: { emoji: "💋", text: "목 깨물기" },
    b: { emoji: "🫦", text: "귀 깨물기" },
  },
  {
    text: "오늘 밤 더 끌리는 건?",
    a: { emoji: "🛁", text: "함께 목욕" },
    b: { emoji: "🛏️", text: "바로 침대로" },
  },
  {
    text: "사랑의 횟수는?",
    a: { emoji: "1️⃣", text: "한 번 진하게" },
    b: { emoji: "♾️", text: "여러 번 천천히" },
  },
  {
    text: "야한 비밀이 있을 때?",
    a: { emoji: "🤐", text: "혼자 간직" },
    b: { emoji: "🗣️", text: "연인에게 공유" },
  },
  {
    text: "사랑의 끝은?",
    a: { emoji: "🤗", text: "꼭 안고 자기" },
    b: { emoji: "💋", text: "한 번 더 키스" },
  },
  {
    text: "야한 영상 같이 보기?",
    a: { emoji: "👍", text: "찬성" },
    b: { emoji: "🙅", text: "민망함" },
  },
  {
    text: "더 야한 신호는?",
    a: { emoji: "🍷", text: "와인 따라주기" },
    b: { emoji: "🚪", text: "방문 잠그기" },
  },
];

// ────────────────────────────────────────────
// 헬퍼: 게임 시작 시 라운드별 랜덤 질문 선택
// ────────────────────────────────────────────
export function getRandomQuestions() {
  const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

  return [
    { round: 1, level: "normal", ...pickRandom(QUESTIONS_R1) },
    { round: 2, level: "normal", ...pickRandom(QUESTIONS_R2) },
    { round: 3, level: "spicy1", ...pickRandom(QUESTIONS_R3) },
    { round: 4, level: "spicy2", ...pickRandom(QUESTIONS_R4) },
    { round: 5, level: "spicy3", ...pickRandom(QUESTIONS_R5) },
  ];
}

// 최종 결과 멘트
export const FINAL_RESULTS = {
  5: {
    emoji: "💖",
    title: "운명입니다!",
    label: "PERFECT MATCH",
    message:
      "모든 라운드에서 마음이 통했어요!\n이런 인연은 흔치 않아요.\n오늘 한 잔 같이 하시는 건 어떠세요? 🥂",
    color: "#FF6B9D",
  },
  4: {
    emoji: "💕",
    title: "거의 운명!",
    label: "GREAT MATCH",
    message:
      "4번이나 마음이 통했어요!\n잘 맞는 사이가 될 것 같아요.\n조금 더 알아갈 가치가 있어요 ✨",
    color: "#FF85B0",
  },
  3: {
    emoji: "✨",
    title: "잘 통하네요!",
    label: "GOOD MATCH",
    message: "꽤 잘 맞는 사이예요.\n한 번 대화해보면 좋겠어요!",
    color: "#C47AFF",
  },
  2: {
    emoji: "🌟",
    title: "친구는 될 수 있어요",
    label: "FRIEND MATCH",
    message:
      "통하는 부분도 있고 다른 부분도 있네요.\n친구로 시작해보는 것도 좋아요!",
    color: "#A0B8FF",
  },
  1: {
    emoji: "🤔",
    title: "완전 다른 매력!",
    label: "DIFFERENT VIBE",
    message: "서로 다른 취향을 가지고 있네요.\n그래서 더 끌릴 수도 있어요?",
    color: "#aac8ff",
  },
  0: {
    emoji: "😅",
    title: "정말 다르네요",
    label: "OPPOSITE TYPES",
    message: "취향이 완전히 정반대네요!\n반대가 끌린다는 말도 있죠 ㅎㅎ",
    color: "rgba(200,200,200,0.9)",
  },
};

// 라운드별 결과 멘트 (통함/안 통함)
export const ROUND_RESULTS = {
  match: {
    normal: {
      title: "통했어요!",
      message: "✨ 마음이 통하는 사이네요!\n취향이 비슷한가봐요",
    },
    spicy1: {
      title: "두근! 통했어요",
      message: "💕 두 분 다 같은 마음이네요!\n분위기가 좀 묘해지는데요?",
    },
    spicy2: {
      title: "오~ 통했네요!",
      message: "🔥 같은 생각하고 있었네요!\n오늘 밤 어떻게 흘러갈까요?",
    },
    spicy3: {
      title: "이건 운명일지도?",
      message: "😏 이런 것까지 통하다니!\n오늘 밤이 길어질 것 같아요",
    },
  },
  mismatch: {
    normal: {
      title: "아쉬워요!",
      message: "서로 다른 매력이 있네요!\n다음 라운드에 다시 도전!",
    },
    spicy1: {
      title: "오~ 다르네요",
      message: "취향이 좀 다르신가봐요?\n그래도 흥미진진하네요!",
    },
    spicy2: {
      title: "정반대네요!",
      message: "취향이 정반대! 그래도 매력있어요\n반대가 끌린다잖아요?",
    },
    spicy3: {
      title: "음... 다르네요",
      message: "이런 건 정반대네요!\n그래도 알아가는 재미가 있죠",
    },
  },
};
