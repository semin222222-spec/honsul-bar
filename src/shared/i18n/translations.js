/**
 * i18n 번역 데이터
 * - 한국어 (ko) / 일본어 (ja)
 * - UI 텍스트는 직접 번역 (자연스러움 보장)
 * - 메뉴/매장명 등 동적 데이터는 별도 처리
 */

export const translations = {
  ko: {
    // ─── 공통 ───
    common: {
      yes: "네",
      no: "아니요",
      confirm: "확인",
      cancel: "취소",
      save: "저장",
      delete: "삭제",
      edit: "수정",
      close: "닫기",
      back: "뒤로",
      next: "다음",
      loading: "불러오는 중...",
      error: "오류",
      retry: "다시 시도",
      welcome: "환영합니다",
      total: "총",
      won: "원",
    },

    // ─── 입장 화면 ───
    seatPicker: {
      title: "어서오세요",
      subtitle: "오늘 어디에 앉으시겠어요?",
      barA: "A줄",
      barB: "B줄",
      seatNumber: "번",
      occupied: "이용 중",
      available: "선택 가능",
      enter: "입장하기",
      occupiedToast: "이미 이용 중인 자리에요",
      welcomeMessage: "은(는) 어떠신가요?",
      selectingSeat: "자리를 선택해주세요",
    },

    // ─── 닉네임 ───
    nickname: {
      hello: "오늘 밤은",
      asThis: "(으)로 불러드릴게요",
      reroll: "다시 추첨",
      rerollHint: "마음에 들 때까지 다시 뽑을 수 있어요",
    },

    // ─── 탭 메뉴 ───
    tabs: {
      hub: "홈",
      menu: "메뉴",
      question: "카드",
      game: "게임",
      quest: "퀘스트",
    },

    // ─── 홈 화면 ───
    home: {
      subtitle: "혼술바 소셜 가이드",
      greetings: [
        "오늘 밤도 수고했어요.",
        "이 한 잔의 여유, 당신 것입니다.",
        "혼자여도 외롭지 않은 밤.",
      ],
      atBar: "지금 이 바에",
      peopleHere: "명이 함께하고 있어요",
      goToMenu: "메뉴 보기",
      goToLounge: "라운지 가기",
      goToGame: "게임하기",
      myTab: "내 주문",
    },

    // ─── 메뉴 ───
    menu: {
      title: "메뉴",
      subtitle: "오늘은 어떤 한 잔이 좋을까요?",
      randomPick: "랜덤 픽커",
      randomPickHint: "고민될 땐 운에 맡겨요",
      addToOrder: "주문하기",
      ordered: "주문 완료",
      cantOrderNoSeat: "먼저 자리를 선택해주세요",
      soldOut: "품절",
      categoryAll: "전체",
    },

    // ─── 주문 / MY TAB ───
    orders: {
      myTab: "MY TAB",
      noOrders: "아직 주문하신 메뉴가 없어요",
      total: "합계",
      requestSettle: "정산 요청",
      requestSent: "정산 요청 완료",
      requestSentHint: "사장님께 알렸어요",
      ordering: "주문 중...",
      orderSuccess: "주문 완료!",
      orderFailed: "주문 실패",
      pending: "대기",
      served: "완료",
    },

    // ─── 정산 / 영수증 ───
    settle: {
      thankYou: "감사합니다",
      goodbye: "좋은 밤 되세요",
      tonightOrders: "오늘의 주문",
      paid: "정산 완료",
      total: "합계",
      seeYou: "또 오세요",
    },

    // ─── 라운지 / 매칭 ───
    lounge: {
      title: "라운지",
      subtitle: "지금 함께하는 분들",
      empty: "지금은 혼자 계세요",
      myStatus: "내 상태",
      statusOpen: "대화 환영",
      statusHello: "인사만",
      statusAlone: "조용히",
      inviteToGame: "게임 초대",
      inviteSent: "초대를 보냈어요",
      inviteReceived: "에서 게임 초대가 왔어요",
      accept: "수락",
      decline: "거절",
    },

    // ─── 게임 ───
    game: {
      title: "게임",
      theNine: "더 나인",
      theNineDesc: "1:1 카드 심리전",
      stacking: "잔 쌓기",
      stackingDesc: "혼자 즐기는 챌린지",
      ranking: "랭킹",
      myRank: "내 순위",
      noPartner: "지금은 같이 할 분이 없어요",
      waitForPartner: "다른 분이 들어올 때까지 기다려요",
    },

    // ─── 카드 / 질문 ───
    card: {
      title: "오늘의 카드",
      subtitle: "오늘 밤 한 가지 질문",
      drawCard: "카드 뽑기",
      drawAgain: "다시 뽑기",
      shareWith: "다른 사람과 함께 답해보세요",
    },

    // ─── 퀘스트 ───
    quest: {
      title: "오늘의 퀘스트",
      subtitle: "혼술의 즐거움을 발견해보세요",
      done: "완료",
      reward: "보상",
      xp: "XP",
      complete: "달성!",
      claim: "받기",
    },

    // ─── SOS ───
    sos: {
      callOwner: "사장님 호출",
      callDesc: "도움이 필요하실 때 누르세요",
      sentTitle: "사장님께 알렸어요",
      sentDesc: "곧 와주실 거예요",
      cancel: "호출 취소",
    },

    // ─── 알림 / 토스트 ───
    toast: {
      welcome: "환영합니다!",
      seatChanged: "자리가 변경되었어요",
      newOrder: "새 주문이 들어왔어요",
      settled: "정산이 완료되었어요",
    },
  },

  ja: {
    // ─── 共通 ───
    common: {
      yes: "はい",
      no: "いいえ",
      confirm: "確認",
      cancel: "キャンセル",
      save: "保存",
      delete: "削除",
      edit: "編集",
      close: "閉じる",
      back: "戻る",
      next: "次へ",
      loading: "読み込み中...",
      error: "エラー",
      retry: "再試行",
      welcome: "ようこそ",
      total: "合計",
      won: "ウォン",
    },

    // ─── 入店画面 ───
    seatPicker: {
      title: "いらっしゃいませ",
      subtitle: "お席をお選びください",
      barA: "A列",
      barB: "B列",
      seatNumber: "番",
      occupied: "ご利用中",
      available: "空席",
      enter: "入店する",
      occupiedToast: "こちらの席は既にご利用中です",
      welcomeMessage: "はいかがですか？",
      selectingSeat: "お席をお選びください",
    },

    // ─── ニックネーム ───
    nickname: {
      hello: "今夜は",
      asThis: "とお呼びします",
      reroll: "もう一度",
      rerollHint: "気に入るまで何度でも引けます",
    },

    // ─── タブメニュー ───
    tabs: {
      hub: "ホーム",
      menu: "メニュー",
      question: "カード",
      game: "ゲーム",
      quest: "クエスト",
    },

    // ─── ホーム画面 ───
    home: {
      subtitle: "ひとり酒バー ソーシャルガイド",
      greetings: [
        "今夜もお疲れ様でした。",
        "この一杯のひととき、あなたのものです。",
        "ひとりでも寂しくない夜。",
      ],
      atBar: "今このバーに",
      peopleHere: "名いらっしゃいます",
      goToMenu: "メニューを見る",
      goToLounge: "ラウンジへ",
      goToGame: "ゲームをする",
      myTab: "ご注文",
    },

    // ─── メニュー ───
    menu: {
      title: "メニュー",
      subtitle: "今夜の一杯はいかがですか？",
      randomPick: "ランダムピッカー",
      randomPickHint: "迷ったら運に任せて",
      addToOrder: "注文する",
      ordered: "注文済み",
      cantOrderNoSeat: "お席をお選びください",
      soldOut: "売り切れ",
      categoryAll: "すべて",
    },

    // ─── 注文 / MY TAB ───
    orders: {
      myTab: "MY TAB",
      noOrders: "まだご注文はありません",
      total: "合計",
      requestSettle: "お会計をお願いする",
      requestSent: "お会計をお願いしました",
      requestSentHint: "オーナーにお知らせしました",
      ordering: "注文中...",
      orderSuccess: "注文完了！",
      orderFailed: "注文失敗",
      pending: "準備中",
      served: "完了",
    },

    // ─── お会計 / 領収書 ───
    settle: {
      thankYou: "ありがとうございました",
      goodbye: "良い夜をお過ごしください",
      tonightOrders: "本日のご注文",
      paid: "お会計完了",
      total: "合計",
      seeYou: "またお越しください",
    },

    // ─── ラウンジ / マッチング ───
    lounge: {
      title: "ラウンジ",
      subtitle: "今ご一緒の方々",
      empty: "今はおひとりです",
      myStatus: "ステータス",
      statusOpen: "話しかけOK",
      statusHello: "挨拶のみ",
      statusAlone: "ひとりで",
      inviteToGame: "ゲームに招待",
      inviteSent: "招待を送りました",
      inviteReceived: "さんからゲーム招待が届きました",
      accept: "受ける",
      decline: "断る",
    },

    // ─── ゲーム ───
    game: {
      title: "ゲーム",
      theNine: "ザ・ナイン",
      theNineDesc: "1:1 カード心理戦",
      stacking: "グラス積み",
      stackingDesc: "ひとりで楽しむチャレンジ",
      ranking: "ランキング",
      myRank: "順位",
      noPartner: "今は一緒にできる方がいません",
      waitForPartner: "他のお客様をお待ちください",
    },

    // ─── カード / 質問 ───
    card: {
      title: "今日のカード",
      subtitle: "今夜の一つの質問",
      drawCard: "カードを引く",
      drawAgain: "もう一度引く",
      shareWith: "他の方と一緒に答えてみてください",
    },

    // ─── クエスト ───
    quest: {
      title: "今日のクエスト",
      subtitle: "ひとり酒の楽しみを見つけてみてください",
      done: "完了",
      reward: "報酬",
      xp: "XP",
      complete: "達成！",
      claim: "受け取る",
    },

    // ─── SOS ───
    sos: {
      callOwner: "オーナー呼び出し",
      callDesc: "お困りの際にお押しください",
      sentTitle: "オーナーにお知らせしました",
      sentDesc: "まもなくお伺いします",
      cancel: "呼び出しキャンセル",
    },

    // ─── 通知 / トースト ───
    toast: {
      welcome: "ようこそ！",
      seatChanged: "お席が変更されました",
      newOrder: "新しいご注文が入りました",
      settled: "お会計が完了しました",
    },
  },
};
