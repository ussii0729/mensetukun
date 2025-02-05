import React from "react";
import { UI_ICONS } from "@/lib/constants";
import { ChatMessagesProps, Message } from "./types";

const ChatMessages: React.FC<ChatMessagesProps> = ({ messages = [] }) => {
  if (!Array.isArray(messages)) {
    console.warn("ChatMessages: messages prop is not an array");
    return null;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 messages-container">
      {/* メッセージ数を表示 */}
      <div className="text-xs text-gray-500">
        メッセージ数: {messages.length}
      </div>

      {messages.map((msg, index) => {
        if (!msg) return null;

        return (
          <div
            key={index}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`
                max-w-[70%] rounded-lg px-4 py-2 shadow-sm
                ${getMessageStyle(msg)}
              `}
            >
              {/* メッセージヘッダー */}
              <div className="text-xs mb-1 opacity-75">
                {getMessageHeader(msg)}
              </div>

              {/* メッセージ内容 */}
              <div className="whitespace-pre-wrap break-words">
                {msg.content || "(内容なし)"}
              </div>

              {/* メッセージフッター */}
              <div className="text-xs mt-1 opacity-50 flex justify-between items-center">
                <span>
                  {msg.timestamp
                    ? new Date(msg.timestamp).toLocaleTimeString()
                    : ""}
                </span>
                <div className="flex items-center gap-2">
                  {msg.isVoice && <span>{UI_ICONS.VOICE}</span>}
                  {msg.role === "assistant" && (
                    <span>{UI_ICONS.ASSISTANT}</span>
                  )}
                  {msg.role === "user" && <span>{UI_ICONS.USER}</span>}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// メッセージスタイルを取得する関数
const getMessageStyle = (msg: Message | null) => {
  if (!msg || !msg.role) return "bg-gray-50 border border-gray-200";

  if (msg.role === "user") {
    return msg.isVoice ? "bg-purple-500 text-white" : "bg-blue-500 text-white";
  } else {
    return msg.isVoice
      ? "bg-green-50 border border-green-200"
      : "bg-gray-50 border border-gray-200";
  }
};

// メッセージヘッダーを取得する関数
const getMessageHeader = (msg: Message | null) => {
  if (!msg || !msg.role) return "メッセージ";

  const roleText = msg.role === "user" ? "あなた" : "アシスタント";
  const typeText = msg.isVoice ? "音声メッセージ" : "テキストメッセージ";
  return `${roleText} - ${typeText}`;
};

export default ChatMessages;
