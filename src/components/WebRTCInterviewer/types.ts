export interface Message {
  role: "assistant" | "user";
  content: string;
  timestamp: Date;
  category?: "question" | "feedback" | "general";
  evaluation?: "positive" | "negative" | "neutral";
  isVoice?: boolean;
  temporary?: boolean; // 追加：一時的なメッセージかどうかを示すフラグ
  messageId?: string; // 追加: メッセージを一意に識別するID
}

export interface InterviewNote {
  timestamp: Date;
  content: string;
  category: "skill" | "attitude" | "communication" | "technical" | "other";
}

export interface ChatMessagesProps {
  messages: Message[];
}
