import type { Metadata, Viewport } from "next";
import { Anton, Source_Sans_3 } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { BottomNav, SiteHeader } from "@/components/site-nav";

const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Faze Now",
  description:
    "For 16 years, FaZe picked the kings. Now the fans do. Pitch ideas, judge clips, and shape what FaZe makes next.",
};

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${anton.variable} ${sourceSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <AuthProvider>
          <Suspense fallback={<div className="h-14 border-b border-line" />}>
            <SiteHeader />
          </Suspense>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 md:pb-12">{children}</main>
          <Suspense fallback={null}>
            <BottomNav />
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}
