import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

const bodyFont = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
});

const displayFont = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
});

const monoFont = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "CortSeal",
  description:
    "Creator-grade content checks powered by Cortensor decentralized inference.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${bodyFont.variable} ${displayFont.variable} ${monoFont.variable} antialiased`}
      >
        <div className="relative min-h-dvh">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-[-10%] top-[-20%] h-[28rem] w-[28rem] rounded-full bg-amber-200/30 blur-3xl animate-float" />
            <div className="absolute right-[-15%] top-[5%] h-[26rem] w-[26rem] rounded-full bg-teal-200/30 blur-3xl animate-float" />
            <div className="absolute bottom-[-25%] left-[20%] h-[24rem] w-[24rem] rounded-full bg-orange-100/40 blur-3xl" />
          </div>
          <SiteHeader />
          <main className="relative z-10">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
