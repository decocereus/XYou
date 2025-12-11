import { WhopApp } from "@whop/react/components";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import {
  Ban20,
  DashedCircle20,
  InfoCircleFilled20,
  Minimize20,
  SealCheckmarkFilled20,
  SealExclamationFilled20,
} from "@frosted-ui/icons";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tweet Generator - YouTube to Tweets",
  description: "Transform YouTube videos into engaging tweets powered by AI",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-screen`}
      >
        <WhopApp>
          {children}
          <Toaster
            position="top-right"
            icons={{
              success: <SealCheckmarkFilled20 />,
              info: <InfoCircleFilled20 />,
              warning: <SealExclamationFilled20 />,
              error: <Ban20 />,
              loading: <DashedCircle20 />,
              close: <Minimize20 />,
            }}
            richColors
            closeButton
          />
        </WhopApp>
      </body>
    </html>
  );
}
