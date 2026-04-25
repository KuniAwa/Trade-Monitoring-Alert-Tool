import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "山野草 識別",
  description: "Pl@ntNet と LLM による山野草の識別（個人・家族用）",
  appleWebApp: { capable: true, title: "山野草", statusBarStyle: "default" },
  manifest: "/site.webmanifest",
  icons: { icon: "/favicon.svg" }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1e3326"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 pb-8 pt-2">
          <Header />
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
