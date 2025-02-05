// src/components/WebRTCInterviewer/index.tsx
"use client";

import React, { useEffect, useRef, useState, ChangeEvent } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { UI_ICONS, QUESTION_TEMPLATES, API_CONFIG } from "@/lib/constants";
import ChatMessages from "./ChatMessages";
import type { Message, InterviewNote } from "./types";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf";

// PDF の内容の型定義（複数ファイル対応）
interface PDFContent {
  text: string;
  fileName: string;
}

// public/pdf.worker.js を利用する設定（必ず /pdf.worker.js を指定する）
if (typeof window !== "undefined") {
  GlobalWorkerOptions.workerSrc = "/pdf.worker.js";
}

const WebRTCInterviewer: React.FC = () => {
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState("Initializing...");
  const [error, setError] = useState<string | null>(null);
  const [isDataChannelReady, setIsDataChannelReady] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [isMicActive, setIsMicActive] = useState(false);
  // 複数のPDFファイルに対応するため配列で管理
  const [pdfContents, setPdfContents] = useState<PDFContent[]>([]);

  // スクロール制御
  const scrollToBottom = () => {
    const chatContainer = document.querySelector(".messages-container");
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  };

  // メッセージ更新時の自動スクロール
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 定期的なスクロールチェック（リアルタイム更新用）
  useEffect(() => {
    const intervalId = setInterval(scrollToBottom, 100);
    return () => clearInterval(intervalId);
  }, []);

  // コンポーネントマウント時に WebRTC 初期化
  useEffect(() => {
    initializeWebRTC();
    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (dataChannelRef.current) {
        dataChannelRef.current.close();
      }
    };
  }, []);

  // デバッグログヘルパー
  const addDebugLog = (message: string) => {
    console.log(message);
    setDebugLog((prev) => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  // WebRTC 初期化
  const initializeWebRTC = async () => {
    try {
      // セッションパラメータの設定
      const sessionUpdateMessage = {
        type: "session.update",
        session: {
          modalities: ["audio", "text"],
          input_audio_transcription: {
            model: "whisper-1",
          },
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 200,
            create_response: true,
          },
        },
      };

      // セッショントークンの取得
      setStatus("セッショントークンを取得中...");
      addDebugLog("セッショントークンをリクエスト中...");
      const tokenResponse = await fetch("/api/session");
      const data = await tokenResponse.json();

      if (!data.client_secret?.value) {
        throw new Error("有効なセッショントークンの取得に失敗しました");
      }

      addDebugLog("セッショントークンを受信");
      const EPHEMERAL_KEY = data.client_secret.value;
      setStatus("ピア接続を作成中...");

      // ピア接続の作成
      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;
      addDebugLog("ピア接続が作成されました");

      // 接続状態の監視
      pc.onconnectionstatechange = () => {
        addDebugLog(`接続状態が変更されました: ${pc.connectionState}`);
        setStatus(`接続状態: ${pc.connectionState}`);
      };

      pc.oniceconnectionstatechange = () => {
        addDebugLog(`ICE接続状態が変更されました: ${pc.iceConnectionState}`);
      };

      pc.onicegatheringstatechange = () => {
        addDebugLog(
          `ICEギャザリング状態が変更されました: ${pc.iceGatheringState}`
        );
      };

      pc.onicecandidate = (event) => {
        addDebugLog(`ICE候補: ${event.candidate ? "受信" : "null"}`);
      };

      // 音声要素のセットアップ
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;

      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
        addDebugLog("リモート音声トラックを受信");
        setStatus("音声接続確立");
      };

      // ローカル音声トラックの追加（既存通り）
      setStatus("マイクのアクセス権を取得中...");
      addDebugLog("マイクのアクセス権をリクエスト中...");
      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      // ※ 複数トラックがある場合はすべて追加できます
      pc.addTrack(ms.getTracks()[0]);
      //   setIsMicActive(true);
      addDebugLog("ローカル音声トラックを追加");

      // データチャンネルのセットアップ
      setStatus("データチャンネルをセットアップ中...");
      addDebugLog("データチャンネルを作成中...");
      const dc = pc.createDataChannel("oai-events");
      dataChannelRef.current = dc;

      dc.onopen = () => {
        addDebugLog("データチャンネルが開かれました");
        setIsDataChannelReady(true);
        setStatus("データチャンネルが開かれました");
        // セッション設定を送信
        dc.send(JSON.stringify(sessionUpdateMessage));
        addDebugLog("セッション設定を送信しました");
      };

      dc.onclose = () => {
        addDebugLog("データチャンネルが閉じられました");
        setIsDataChannelReady(false);
        setStatus("データチャンネルが閉じられました");
      };

      dc.onerror = (error) => {
        addDebugLog(`データチャンネルエラー: ${error.toString()}`);
        setError("データチャンネルでエラーが発生しました");
      };

      dc.addEventListener("message", async (e) => {
        try {
          const realtimeEvent = JSON.parse(e.data);
          addDebugLog(`受信イベント: ${JSON.stringify(realtimeEvent)}`);

          // 以下、既存の音声入力／認識関連処理
          if (realtimeEvent.type === "input_audio_buffer.speech_started") {
            const itemId = realtimeEvent.item_id;
            setMessages((prev) => {
              const existingTempMessage = prev.find(
                (msg) => msg.temporary && msg.messageId === itemId
              );
              if (!existingTempMessage) {
                addDebugLog(`音声入力開始: ${itemId}`);
                return [
                  ...prev,
                  {
                    role: "user",
                    content: "音声入力中...",
                    timestamp: new Date(),
                    isVoice: true,
                    temporary: true,
                    messageId: itemId,
                  },
                ];
              }
              return prev;
            });
          }

          if (realtimeEvent.type === "input_audio_buffer.speech_stopped") {
            const itemId = realtimeEvent.item_id;
            addDebugLog(`音声入力停止: ${itemId}`);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.messageId === itemId && msg.temporary
                  ? { ...msg, content: "音声を処理中..." }
                  : msg
              )
            );
          }

          if (realtimeEvent.type === "input_audio_buffer.committed") {
            const itemId = realtimeEvent.item_id;
            addDebugLog(`音声入力コミット: ${itemId}`);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.messageId === itemId && msg.temporary
                  ? { ...msg, content: "音声認識中..." }
                  : msg
              )
            );
          }

          if (
            realtimeEvent.type === "conversation.item.created" &&
            realtimeEvent.item.role === "user" &&
            realtimeEvent.item.content?.[0]?.type === "input_audio"
          ) {
            const itemId = realtimeEvent.item.id;
            const transcript = realtimeEvent.item.content[0]?.transcript;
            addDebugLog(
              `会話アイテム作成: ${itemId}, transcript: ${transcript || "なし"}`
            );
            if (transcript) {
              setMessages((prev) => {
                const messageIndex = prev.findIndex(
                  (msg) => msg.messageId === itemId
                );
                if (messageIndex !== -1) {
                  const newMessages = [...prev];
                  newMessages[messageIndex] = {
                    ...newMessages[messageIndex],
                    content: transcript,
                    temporary: false,
                  };
                  return newMessages;
                }
                return prev;
              });
            }
          }

          if (
            realtimeEvent.type ===
            "conversation.item.input_audio_transcription.completed"
          ) {
            const itemId = realtimeEvent.item_id;
            const transcript = realtimeEvent.transcript;
            addDebugLog(`音声認識完了: ${itemId}, transcript: ${transcript}`);
            if (transcript) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.messageId === itemId && msg.temporary
                    ? { ...msg, content: transcript.trim(), temporary: false }
                    : msg
                )
              );
            }
          }

          if (realtimeEvent.type === "response.audio_transcript.delta") {
            const delta = realtimeEvent.delta;
            const responseId = realtimeEvent.response_id;
            addDebugLog(`音声応答デルタ: ${delta}`);
            setMessages((prev) => {
              const lastMessage = prev[prev.length - 1];
              if (
                lastMessage?.role === "assistant" &&
                lastMessage.isVoice &&
                lastMessage.messageId === responseId
              ) {
                return [
                  ...prev.slice(0, -1),
                  {
                    ...lastMessage,
                    content: lastMessage.content + delta,
                  },
                ];
              } else {
                return [
                  ...prev,
                  {
                    role: "assistant",
                    content: delta,
                    timestamp: new Date(),
                    isVoice: true,
                    messageId: responseId,
                    temporary: true,
                  },
                ];
              }
            });
          }

          if (realtimeEvent.type === "response.audio_transcript.done") {
            const transcript = realtimeEvent.transcript;
            const responseId = realtimeEvent.response_id;
            addDebugLog(
              `音声応答完了: ${responseId}, transcript: ${transcript}`
            );
            if (transcript) {
              setMessages((prev) => {
                const messageIndex = prev.findIndex(
                  (msg) =>
                    msg.role === "assistant" &&
                    msg.isVoice &&
                    msg.messageId === responseId
                );
                if (messageIndex !== -1) {
                  const newMessages = [...prev];
                  newMessages[messageIndex] = {
                    ...newMessages[messageIndex],
                    content: transcript,
                    temporary: false,
                  };
                  return newMessages;
                }
                return [
                  ...prev,
                  {
                    role: "assistant",
                    content: transcript,
                    timestamp: new Date(),
                    isVoice: true,
                    messageId: responseId,
                    temporary: false,
                  },
                ];
              });
            }
          }

          if (realtimeEvent.type === "error") {
            const errorMessage =
              realtimeEvent.error?.message || "Unknown error";
            addDebugLog(`エラー受信: ${errorMessage}`);
            setError(errorMessage);
          }
        } catch (error) {
          addDebugLog(`メッセージ処理エラー: ${error}`);
          console.error("Message processing error:", error);
        }
      });

      // オファー/アンサーのやり取り
      setStatus("オファーを作成中...");
      addDebugLog("オファーを作成中...");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      addDebugLog("ローカル説明を設定");

      setStatus("リモート説明を取得中...");
      addDebugLog("OpenAIにオファーを送信中...");
      const sdpResponse = await fetch(
        `${API_CONFIG.BASE_URL}?model=${API_CONFIG.MODEL}`,
        {
          method: "POST",
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${EPHEMERAL_KEY}`,
            "Content-Type": "application/sdp",
          },
        }
      );
      if (!sdpResponse.ok) {
        throw new Error(`リモート説明の取得に失敗: ${sdpResponse.status}`);
      }
      addDebugLog("OpenAIから応答を受信");
      const answer: RTCSessionDescriptionInit = {
        type: "answer",
        sdp: await sdpResponse.text(),
      };

      await pc.setRemoteDescription(answer);
      addDebugLog("リモート説明を設定");
      setStatus("接続が確立されました");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "WebRTCの初期化に失敗しました";
      addDebugLog(`エラー: ${errorMessage}`);
      console.error("WebRTC initialization failed:", err);
      setError(errorMessage);
      setStatus("失敗");
    }
  };

  // PDFファイルアップロード処理（複数ファイル対応）
  const handlePDFUpload = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfData = new Uint8Array(arrayBuffer);
      const loadingTask = getDocument({ data: pdfData });
      const pdf = await loadingTask.promise;
      let fullText = "";
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent({
          disableCombineTextItems: true,
          includeMarkedContent: false,
        });
        const pageText = content.items
          .map((item: any) => ("str" in item ? item.str : ""))
          .join(" ");
        fullText += `=== Page ${pageNum} ===\n${pageText}\n\n`;
      }
      // 既存のpdfContentsに新たなPDF情報を追加
      setPdfContents((prev) => [
        ...prev,
        {
          text: fullText,
          fileName: file.name,
        },
      ]);
      addDebugLog(`PDF ${file.name} の内容を抽出しました`);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "PDF の処理に失敗しました"
      );
    }
  };

  // DataChannel 経由で PDF 情報を JSON 形式で送信する関数
  const sendPDFContents = () => {
    if (
      !dataChannelRef.current ||
      dataChannelRef.current.readyState !== "open"
    ) {
      addDebugLog("DataChannel が準備できていません");
      return;
    }
    if (pdfContents.length === 0) {
      addDebugLog("送信するPDF情報がありません");
      return;
    }

    const pdfJsonString = JSON.stringify(pdfContents);

    const textToSend = `PDF情報: ${pdfJsonString}`;

    // JSON形式で各PDFの情報を構造化して送信
    const payload = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text", // 入力種別を明示（任意のキー名）
            text: textToSend, // PDF情報の配列
          },
        ],
      },
    };
    dataChannelRef.current.send(JSON.stringify(payload));
    addDebugLog(`PDF情報をJSON形式で送信しました: ${JSON.stringify(payload)}`);
  };

  // PDFファイル選択時のハンドラ（複数ファイル対応）
  const onPDFFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // 選択された全ファイルに対してアップロード処理を実施
      Array.from(e.target.files).forEach((file) => {
        handlePDFUpload(file);
      });
    }
  };

  // マイクのトグル（既存通り）
  const toggleMicrophone = async () => {
    if (isMicActive) {
      peerConnectionRef.current?.getSenders().forEach((sender) => {
        if (sender.track) sender.track.enabled = false;
      });
      setIsMicActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        peerConnectionRef.current?.getSenders().forEach((sender) => {
          if (sender.track) sender.track.enabled = true;
        });
        setIsMicActive(true);
      } catch (error) {
        console.error("Error accessing microphone:", error);
        setError("Failed to access microphone");
      }
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 左サイドバー：PDFアップロードと送信、面接ツール等 */}
      <div className="w-1/4 p-4 bg-white border-r overflow-y-auto">
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">履歴書アップロード</h3>
          <input
            type="file"
            accept=".pdf"
            multiple
            onChange={onPDFFileChange}
            className="w-full p-2 border rounded mb-4"
          />
          {pdfContents.length > 0 && (
            <div className="mt-2 p-2 bg-gray-50 rounded">
              <p className="text-sm">
                {pdfContents.length} 件のPDFが読み込み済み:
                {pdfContents.map((pdf, index) => (
                  <span key={index}>
                    {index > 0 && "、"}
                    {pdf.fileName}
                  </span>
                ))}
              </p>
              <button
                onClick={sendPDFContents}
                className="mt-2 px-3 py-1 bg-blue-500 text-white rounded"
              >
                PDF情報を送信
              </button>
            </div>
          )}
        </div>
      </div>

      {/* メインチャットエリア */}
      <div className="flex-1 flex flex-col">
        {/* ステータスバー */}
        <div className="bg-white p-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <span
                className={`inline-block w-2 h-2 rounded-full mr-2 ${
                  status === "失敗"
                    ? "bg-red-500"
                    : isDataChannelReady
                    ? "bg-green-500"
                    : "bg-yellow-500"
                }`}
              />
              <span className="font-medium">{status}</span>
            </div>
            <button
              onClick={toggleMicrophone}
              className={`p-2 rounded ${
                isMicActive ? "bg-red-100 text-red-600" : "bg-gray-100"
              }`}
            >
              <span>{isMicActive ? UI_ICONS.MIC_OFF : UI_ICONS.MIC}</span>
            </button>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
            <span className="text-red-500">{UI_ICONS.ERROR}</span>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* チャットメッセージ */}
        <ChatMessages messages={messages} />
      </div>

      {/* 右サイドバー：デバッグ情報 */}
      <div className="w-1/4 p-4 bg-white border-l overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">デバッグ情報</h2>
        <div className="space-y-1">
          {debugLog.map((log, index) => (
            <p key={index} className="text-xs font-mono text-gray-600">
              {log}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WebRTCInterviewer;
