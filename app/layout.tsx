import React from "react";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { FirebaseProvider } from "@/components/firebase-provider";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const Analytics = () => null;

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Touch Grass Later — Learn. Build. Grow.",
  description:
    "Unified online learning, practical projects, guided internships, and QR-verified credentials with Touch Grass Later.",
  openGraph: {
    title: "Touch Grass Later — Learn. Build. Grow.",
    description:
      "Single-fee internship-training programmes uniting structured courses, practical projects, guided internships, and verified certificates.",
    type: "website",
  },
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        type: "image/png",
      },
    ],
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F5F7" },
    { media: "(prefers-color-scheme: dark)", color: "#090909" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${plusJakarta.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <FirebaseProvider>
            {children}
            <Analytics />
          </FirebaseProvider>
        </ThemeProvider>
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
