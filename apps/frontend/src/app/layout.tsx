import type { Metadata } from "next";
import React from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "LawDesk V1",
  description: "AI Native Lawyer Operating System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="lawdesk-app">{children}</body>
    </html>
  );
}
