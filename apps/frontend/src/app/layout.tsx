import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "LawDesk V1",
  description: "AI Native Lawyer Operating System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "ui-sans-serif, system-ui", margin: 0 }}>{children}</body>
    </html>
  );
}
