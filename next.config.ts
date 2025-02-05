import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "pdfjs-dist": require.resolve("pdfjs-dist"),
    };
    return config;
  },
  experimental: {
    serverActions: {
      // ここでリクエストボディの上限を設定（例：'2mb'）
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
