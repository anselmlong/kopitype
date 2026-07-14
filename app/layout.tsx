import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

// self-hosted at build time (works with output: "export"), so the stream
// renders identically on every OS instead of falling back to system mono
const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "kopitype — singlish typing test",
  description:
    "a minimal singlish typing test in the style of monkeytype. type lah, get your wpm.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={mono.variable}>
      <body>{children}</body>
    </html>
  );
}
