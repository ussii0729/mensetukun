// src/app/pdf-extract/page.tsx
"use client";

import React, { useState } from "react";
// pdfjs-dist の legacy ビルドからインポートします
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";

// 公開ディレクトリに配置したワーカースクリプトのパスを指定
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.js";

const PDFExtractPage: React.FC = () => {
  const [text, setText] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const processPDF = async (file: File) => {
    setLoading(true);
    setError("");
    setText("");

    try {
      // File から ArrayBuffer を取得
      const arrayBuffer = await file.arrayBuffer();
      // PDF をロード（disableWorker オプションは不要、ブラウザ側でワーカーを使用）
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
      });
      const pdf = await loadingTask.promise;

      let fullText = "";
      // 各ページごとにテキスト抽出
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str).join(" ");
        fullText += `=== Page ${i} ===\n${pageText}\n\n`;
      }

      setText(fullText);
    } catch (err) {
      console.error(err);
      setError("PDFの処理中にエラーが発生しました");
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "1rem" }}>
      <h1>PDF文字起こし (クライアントサイド)</h1>
      <input
        type="file"
        accept=".pdf"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            processPDF(e.target.files[0]);
          }
        }}
      />
      {loading && <p>処理中...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {text && (
        <div>
          <h2>抽出されたテキスト:</h2>
          <pre>{text}</pre>
          <button onClick={() => navigator.clipboard.writeText(text)}>
            テキストをコピー
          </button>
        </div>
      )}
    </div>
  );
};

export default PDFExtractPage;
