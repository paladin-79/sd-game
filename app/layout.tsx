import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://arch-lab-system-design.nguyenhongminh324.chatgpt.site"),
  title: "ARCH.LAB — Build. Break. Scale.",
  description: "Học system design qua 3 mission tương tác: xây kiến trúc, inject sự cố và vượt qua chaos test.",
  openGraph: {
    title: "ARCH.LAB — System Design Game",
    description: "Build. Break. Scale. Học system design bằng cách giải các sự cố thật.",
    images: [{ url: "/og.png", width: 1732, height: 908, alt: "ARCH.LAB — Build. Break. Scale." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ARCH.LAB — System Design Game",
    description: "Build. Break. Scale. Học system design bằng cách giải các sự cố thật.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
