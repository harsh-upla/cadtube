import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import "./globals.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import Script from "next/script";
import Head from "next/head";

export const metadata: Metadata = {
  title: "CadTube",
  description: "Download videos from YouTube.",
  other: {
    "google-adsense-account": "ca-pub-9342853720075226",
    // "monetag": "5eca832e5b87b09ba6dc00bbb6c26d7e",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" >
      <body className="w-full h-full bg-[#e2e1dc]">
        {/* script for monetag ads */}
        {/* <script
          dangerouslySetInnerHTML={{
            __html: `(function(s){s.dataset.zone='11105050',s.src='https://al5sm.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))`
          }}
        /> */}
        <Navbar />
        {children}
      <GoogleAnalytics gaId="G-3MR9Y99HH0" />
      </body>
    </html>
  );
}
