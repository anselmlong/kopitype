import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
