import type { Metadata, Viewport } from "next";
import { Anton, Source_Sans_3 } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { BottomNav, SiteHeader } from "@/components/site-nav";
import { FanTypePrompt } from "@/components/fan-type-prompt";

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
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${anton.variable} ${sourceSans.variable} h-full antialiased`}>
      {/* Browser extensions inject attributes on <body>; don't flag that as a hydration error */}
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <AuthProvider>
          {/* Suspense is required (usePathname on dynamic routes). The auth-driven bits inside
              use useHydrated() so they match the server HTML until hydration finishes. */}
          <Suspense fallback={<div className="h-14 border-b border-line" />}>
            <SiteHeader />
          </Suspense>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 md:pb-12">{children}</main>
          <Suspense fallback={null}>
            <BottomNav />
          </Suspense>
          <FanTypePrompt />
        </AuthProvider>
      </body>
    </html>
  );
}
