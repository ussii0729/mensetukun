// アイコンの代わりにUnicodeシンボルを使用
export const UI_ICONS = {
  ERROR: "⚠️",
  MIC: "🎤",
  MIC_OFF: "🎤❌",
  SEND: "➤",
  ASSISTANT: "🤖",
  USER: "👤",
  VOICE: "🎤",
} as const;

// 面接用の質問テンプレート
export const QUESTION_TEMPLATES = {
  technical: [
    "これまでの技術的な経験について教えてください。",
    "最も困難だった技術的な課題とその解決方法は？",
    "最近学んでいる技術はありますか？",
    "得意な技術領域と、その理由を教えてください。",
    "技術選定の際に重視する点は何ですか？",
  ],
  behavioral: [
    "チームでの困難な状況をどのように解決しましたか？",
    "失敗から学んだ最も重要な教訓は何ですか？",
    "今後のキャリアビジョンを教えてください。",
    "リーダーシップを発揮した経験について教えてください。",
    "仕事の優先順位をどのように決めていますか？",
  ],
  situational: [
    "締切に間に合わない状況でどう対処しますか？",
    "チーム内での意見の不一致をどう解決しますか？",
    "新しい技術の導入についてどう考えますか？",
    "業務量が多い時の対処方法を教えてください。",
    "予期せぬ障害が発生した際の対応方法は？",
  ],
  skill_assessment: [
    "最近取り組んでいるプロジェクトについて教えてください。",
    "コードレビューで重視している点は何ですか？",
    "パフォーマンス最適化の経験について教えてください。",
    "セキュリティ対策として実施していることは？",
    "テスト戦略についてどのように考えていますか？",
  ],
} as const;

// Web RTC 設定
export const WEBRTC_CONFIG = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
} as const;

// APIエンドポイント設定
export const API_CONFIG = {
  BASE_URL: "https://api.openai.com/v1/realtime",
  MODEL: "gpt-4o-realtime-preview-2024-12-17",
  ENDPOINTS: {
    SESSION: "/api/session",
    REALTIME: "/v1/realtime",
  },
} as const;

// ステータスメッセージ
export const STATUS_MESSAGES = {
  INITIALIZING: "初期化中...",
  CONNECTING: "接続中...",
  CONNECTED: "接続完了",
  DISCONNECTED: "切断",
  ERROR: "エラーが発生しました",
  READY: "準備完了",
} as const;

// メッセージカテゴリー
export const MESSAGE_CATEGORIES = {
  QUESTION: "question",
  ANSWER: "answer",
  FEEDBACK: "feedback",
  SYSTEM: "system",
} as const;

// 面接ノートカテゴリー
export const NOTE_CATEGORIES = {
  SKILL: "skill",
  ATTITUDE: "attitude",
  COMMUNICATION: "communication",
  TECHNICAL: "technical",
  OTHER: "other",
} as const;

// タイマー設定（ミリ秒）
export const TIMER_CONFIG = {
  SCROLL_INTERVAL: 100,
  MESSAGE_DELAY: 100,
  RECONNECT_DELAY: 5000,
} as const;

// デバッグモード設定
export const DEBUG_CONFIG = {
  ENABLED: process.env.NODE_ENV === "development",
  LOG_LEVEL: "info",
  VERBOSE: false,
} as const;
