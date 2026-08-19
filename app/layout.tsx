import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ARCH.LAB — System Design Game",
  description: "Học system design bằng cách xây, phá và cải thiện kiến trúc thật.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
