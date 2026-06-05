import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import "./globals.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import Script from "next/script";

export const metadata: Metadata = {
  title: "CadTube",
  description: "Download videos from YouTube.",
  other: {
    "google-adsense-account": "ca-pub-9342853720075226",
    "monetag": "5eca832e5b87b09ba6dc00bbb6c26d7e",
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
        <Script 
          src="https://al5sm.com/tag.min.js" 
          data-zone="11105050" 
          strategy="beforeInteractive" 
        />
        <Navbar />
        {children}
      <GoogleAnalytics gaId="G-3MR9Y99HH0" />
      </body>
    </html>
  );
}
